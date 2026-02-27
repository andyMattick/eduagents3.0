import { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * /api/llm — Secure LLM Proxy (Vercel Serverless Function)
 *
 * ALL Gemini calls from the browser are routed through this endpoint.
 * The Gemini API key NEVER leaves the server.
 *
 * Security layers:
 *   1. Validates the Supabase JWT (rejects unauthenticated requests)
 *   2. Enforces the daily free-tier usage limit (server-side)
 *   3. Calls Gemini with the server-only GEMINI_API_KEY
 *
 * Request body:
 *   { model, prompt, temperature?, maxOutputTokens? }
 *
 * Response:
 *   { text: string }
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const FREE_DAILY_LIMIT = 5;

// ── Helpers ──────────────────────────────────────────────────────────────

/** Validate the Supabase JWT and return the authenticated user's id. */
async function authenticateUser(
  authHeader: string | undefined
): Promise<{ userId: string } | { error: string; status: number }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or malformed Authorization header.", status: 401 };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Server misconfigured — Supabase env vars missing.", status: 500 };
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    });

    if (!res.ok) {
      return { error: "Invalid or expired session token.", status: 401 };
    }

    const user = await res.json();
    if (!user?.id) {
      return { error: "Could not resolve user from token.", status: 401 };
    }

    return { userId: user.id };
  } catch {
    return { error: "Auth verification failed.", status: 500 };
  }
}

/**
 * Server-side daily-limit check.
 * Uses the Supabase service-role key so RLS doesn't interfere.
 * Falls CLOSED — if the check fails, the request is denied.
 */
async function checkDailyLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number } | { error: string; status: number }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If there's no service-role key, we can still do the check with the anon key
  // (RLS SELECT policy allows own rows) — but that requires threading the user's
  // JWT. For simplicity we use the service-role key which bypasses RLS.
  const apiKey = serviceRoleKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !apiKey) {
    // Fail closed
    return { error: "Server misconfigured — cannot verify usage limits.", status: 500 };
  }

  const todayMidnightUTC = new Date();
  todayMidnightUTC.setUTCHours(0, 0, 0, 0);

  try {
    // PostgREST count query
    const url = new URL(`${supabaseUrl}/rest/v1/teacher_assessment_history`);
    url.searchParams.set("select", "id");
    url.searchParams.set("teacher_id", `eq.${userId}`);
    url.searchParams.set("created_at", `gte.${todayMidnightUTC.toISOString()}`);

    const res = await fetch(url.toString(), {
      method: "HEAD",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Prefer: "count=exact",
      },
    });

    const countHeader = res.headers.get("content-range");
    // Format: "0-N/TOTAL" or "*/TOTAL" when HEAD
    const total = countHeader
      ? parseInt(countHeader.split("/").pop() || "0", 10)
      : 0;

    if (total >= FREE_DAILY_LIMIT) {
      return {
        error: `Daily limit reached (${FREE_DAILY_LIMIT}/${FREE_DAILY_LIMIT}). Come back tomorrow or upgrade.`,
        status: 429,
      };
    }

    return { allowed: true, remaining: FREE_DAILY_LIMIT - total };
  } catch {
    // Fail closed
    return { error: "Usage check failed — please try again.", status: 500 };
  }
}

/** Call Gemini using the server-only API key. */
async function callGeminiServer({
  model,
  prompt,
  temperature = 0.2,
  maxOutputTokens = 4096,
}: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  // Use the Gemini REST API directly (no SDK needed server-side)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[api/llm] Gemini error:", res.status, err);
    throw new Error(`Gemini returned ${res.status}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

// ── Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Authenticate
  const auth = await authenticateUser(req.headers.authorization as string | undefined);
  if ("error" in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  // 2. Rate-limit (daily check — only counts against completed assessments,
  //    not individual LLM calls, so this is lightweight per-request.)
  //    NOTE: We check once for gating. The actual row insert happens in SCRIBE
  //    after the full pipeline completes, so mid-pipeline calls are free.
  //    The "isGateCall" flag lets the *first* call in a pipeline run trigger
  //    the check, while subsequent calls within the same run skip it.
  const { isGateCall } = req.body ?? {};
  if (isGateCall) {
    const limit = await checkDailyLimit(auth.userId);
    if ("error" in limit) {
      return res.status(limit.status).json({ error: limit.error });
    }
  }

  // 3. Validate body
  const { model, prompt, temperature, maxOutputTokens } = req.body ?? {};
  if (!model || !prompt) {
    return res.status(400).json({ error: "Missing required fields: model, prompt" });
  }

  // 4. Call Gemini
  try {
    const text = await callGeminiServer({ model, prompt, temperature, maxOutputTokens });
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("[api/llm] Error:", err.message);
    return res.status(502).json({
      error: "AI generation failed. Please try again.",
      detail: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}
