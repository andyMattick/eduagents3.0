/**
 * /api/llm — Secure LLM Proxy (Vercel Serverless Function)
 *
 * Delegates to shared lib modules:
 *   lib/auth.ts   — authenticateUser()
 *   lib/gemini.ts — callGemini()
 *
 * Usage checking is inline (Supabase REST) and stays here since it's
 * specific to the LLM gate-call flow.
 */

import { authenticateUser } from "../lib/auth";
import { callGemini } from "../lib/gemini";
import { retrieveRelevantChunks, selectTopChunks, buildRAGPrompt } from "../lib/rag";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const FREE_DAILY_LIMIT = 5;

// ── Usage check ──────────────────────────────────────────────────────────

async function checkDailyLimit(userId: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !apiKey) {
    return { error: "Usage check misconfigured.", status: 500 };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/teacher_assessment_history`);
    url.searchParams.set("select", "id");
    url.searchParams.set("teacher_id", `eq.${userId}`);
    url.searchParams.set("created_at", `gte.${today.toISOString()}`);

    const res = await fetch(url.toString(), {
      method: "HEAD",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Prefer: "count=exact",
      },
    });

    const countHeader = res.headers.get("content-range");
    const total = countHeader
      ? parseInt(countHeader.split("/").pop() || "0", 10)
      : 0;

    if (total >= FREE_DAILY_LIMIT) {
      return {
        error: `Daily limit reached (${FREE_DAILY_LIMIT}/${FREE_DAILY_LIMIT}).`,
        status: 429,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("Usage check error:", err);
    return { error: "Usage check failed.", status: 500 };
  }
}

// ── Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  try {
    // CORS
    Object.entries(CORS_HEADERS).forEach(([k, v]) =>
      res.setHeader(k, v)
    );

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ SAFE BODY PARSING
    let body: any = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const { model, prompt, temperature, maxOutputTokens, isGateCall, useRAG } =
      body || {};

    if (!model || !prompt) {
      return res
        .status(400)
        .json({ error: "Missing required fields: model, prompt" });
    }

    // 1. Auth
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    // 2. Rate limit
    if (isGateCall) {
      const limit = await checkDailyLimit(auth.userId);
      if ("error" in limit) {
        return res.status(limit.status).json({ error: limit.error });
      }
    }

    // 3. RAG retrieval (opt-in via useRAG flag)
    let finalPrompt = prompt;
    if (useRAG) {
      try {
        const rankedChunks = await retrieveRelevantChunks({
          query: prompt,
          userId: auth.userId,
          matchCount: 5,
        });
        const selected = selectTopChunks(rankedChunks);
        finalPrompt = buildRAGPrompt(selected, prompt);
      } catch (ragErr) {
        console.warn("RAG retrieval failed, using original prompt:", ragErr);
      }
    }

    // 4. Gemini call
    const text = await callGemini({
      model,
      prompt: finalPrompt,
      temperature,
      maxOutputTokens,
    });

    return res.status(200).json({ text });

  } catch (err: any) {
    console.error("LLM API crash:", err);
    return res.status(500).json({
      error: "Internal server error",
      detail:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}