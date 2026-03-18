import { authenticateUser } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase";

export const runtime = "nodejs";
export const config = { maxDuration: 60 };

type ProbeStatus = "ok" | "warning" | "error";

interface ProbeResult {
  status: ProbeStatus;
  detail: string;
}

function parseErrorText(errorText: string): string {
  try {
    const parsed = JSON.parse(errorText);
    return parsed?.message || parsed?.error || errorText;
  } catch {
    return errorText;
  }
}

function zeroVector(dimensions: number): string {
  return `[${Array.from({ length: dimensions }, () => 0).join(",")}]`;
}

async function probeDocuments(url: string, headers: Record<string, string>): Promise<ProbeResult> {
  const res = await fetch(`${url}/rest/v1/documents?select=id,content_hash&limit=1`, {
    headers,
  });

  if (res.ok) {
    return { status: "ok", detail: "documents table reachable and content_hash available" };
  }

  const errorText = await res.text();
  const detail = parseErrorText(errorText);
  if (detail.includes("content_hash")) {
    return { status: "error", detail: `documents reachable but content_hash missing: ${detail}` };
  }

  return { status: "error", detail: `documents probe failed: ${detail}` };
}

async function probeDocumentChunks(url: string, headers: Record<string, string>): Promise<ProbeResult> {
  const res = await fetch(`${url}/rest/v1/document_chunks?select=id&limit=1`, {
    headers,
  });

  if (res.ok) {
    return { status: "ok", detail: "document_chunks table reachable" };
  }

  const errorText = await res.text();
  return {
    status: "error",
    detail: `document_chunks probe failed: ${parseErrorText(errorText)}`,
  };
}

async function probeMatchChunks(url: string, headers: Record<string, string>, userId: string): Promise<ProbeResult> {
  const res = await fetch(`${url}/rest/v1/rpc/match_chunks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query_embedding: zeroVector(768),
      p_user_id: userId,
      match_count: 1,
    }),
  });

  if (res.ok) {
    return { status: "ok", detail: "match_chunks RPC callable" };
  }

  const errorText = await res.text();
  return {
    status: "error",
    detail: `match_chunks probe failed: ${parseErrorText(errorText)}`,
  };
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const env = {
      supabaseUrl: Boolean(process.env.SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
      supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      geminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    };

    const keyMode = process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon_fallback";

    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      return res.status(500).json({
        status: "error",
        keyMode,
        env,
        message: "Supabase base configuration missing",
      });
    }

    const { url, key } = supabaseAdmin();
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };

    const [documents, documentChunks, matchChunks] = await Promise.all([
      probeDocuments(url, headers),
      probeDocumentChunks(url, headers),
      probeMatchChunks(url, headers, auth.userId),
    ]);

    const checks = {
      documents,
      documentChunks,
      matchChunks,
      embedding: env.geminiApiKey
        ? { status: "ok", detail: "GEMINI_API_KEY present" }
        : { status: "warning", detail: "GEMINI_API_KEY missing; chunk embedding and retrieval will degrade" },
      keyMode:
        keyMode === "service_role"
          ? { status: "ok", detail: "Using SUPABASE_SERVICE_ROLE_KEY for server-side RAG operations" }
          : { status: "warning", detail: "Using SUPABASE_ANON_KEY fallback; server-side writes may fail under RLS" },
    };

    const statuses = Object.values(checks).map((check) => check.status);
    const overallStatus = statuses.includes("error")
      ? "error"
      : statuses.includes("warning")
        ? "warning"
        : "ok";

    return res.status(overallStatus === "error" ? 500 : 200).json({
      status: overallStatus,
      keyMode,
      env,
      checks,
    });
  } catch (err: any) {
    console.error("documents/health error:", err);
    return res.status(500).json({
      status: "error",
      error: err.message,
    });
  }
}