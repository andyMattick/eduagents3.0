"use strict";
/* Bundled by esbuild — do not edit */

// api/documents/health.ts
async function authenticateUser(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or malformed Authorization header.", status: 401 };
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase env vars missing.", status: 500 };
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey
      }
    });
    if (!res.ok) {
      return { error: "Invalid or expired session.", status: 401 };
    }
    const user = await res.json();
    return user?.id ? { userId: user.id } : { error: "User not found.", status: 401 };
  } catch (err) {
    console.error("Auth error:", err);
    return { error: "Auth verification failed.", status: 500 };
  }
}
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}
var runtime = "nodejs";
var config = { maxDuration: 60 };
function parseErrorText(errorText) {
  try {
    const parsed = JSON.parse(errorText);
    return parsed?.message || parsed?.error || errorText;
  } catch {
    return errorText;
  }
}
function getMissingSchemaColumn(errorText) {
  if (!errorText.includes("PGRST204") && !errorText.includes("schema cache")) {
    return null;
  }
  const match = errorText.match(/'([^']+)' column/);
  return match ? match[1] : null;
}
function zeroVector(dimensions) {
  return `[${Array.from({ length: dimensions }, () => 0).join(",")}]`;
}
async function probeDocuments(url, headers) {
  const res = await fetch(`${url}/rest/v1/documents?select=id,content_hash,metadata&limit=1`, {
    headers
  });
  if (res.ok) {
    return { status: "ok", detail: "documents table reachable and optional columns available" };
  }
  const errorText = await res.text();
  const detail = parseErrorText(errorText);
  const missingColumn = getMissingSchemaColumn(errorText);
  if (missingColumn) {
    return { status: "error", detail: `documents reachable but ${missingColumn} missing: ${detail}` };
  }
  return { status: "error", detail: `documents probe failed: ${detail}` };
}
async function probeDocumentChunks(url, headers) {
  const res = await fetch(`${url}/rest/v1/document_chunks?select=id,metadata&limit=1`, {
    headers
  });
  if (res.ok) {
    return { status: "ok", detail: "document_chunks table reachable and metadata available" };
  }
  const errorText = await res.text();
  const missingColumn = getMissingSchemaColumn(errorText);
  return {
    status: "error",
    detail: missingColumn ? `document_chunks reachable but ${missingColumn} missing: ${parseErrorText(errorText)}` : `document_chunks probe failed: ${parseErrorText(errorText)}`
  };
}
async function probeMatchChunks(url, headers, userId) {
  const res = await fetch(`${url}/rest/v1/rpc/match_chunks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query_embedding: zeroVector(768),
      p_user_id: userId,
      match_count: 1
    })
  });
  if (res.ok) {
    return { status: "ok", detail: "match_chunks RPC callable" };
  }
  const errorText = await res.text();
  return {
    status: "error",
    detail: `match_chunks probe failed: ${parseErrorText(errorText)}`
  };
}
async function handler(req, res) {
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
      stubLlmKey: Boolean(process.env.STUB_LLM_KEY)
    };
    const keyMode = process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon_fallback";
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      return res.status(500).json({
        status: "error",
        keyMode,
        env,
        message: "Supabase base configuration missing"
      });
    }
    const { url, key } = supabaseAdmin();
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    };
    const [documents, documentChunks, matchChunks] = await Promise.all([
      probeDocuments(url, headers),
      probeDocumentChunks(url, headers),
      probeMatchChunks(url, headers, auth.userId)
    ]);
    const checks = {
      documents,
      documentChunks,
      matchChunks,
      embedding: env.stubLlmKey ? { status: "ok", detail: "STUB_LLM_KEY present (stub embedding mode)" } : { status: "warning", detail: "STUB_LLM_KEY missing; default deterministic stub embedding will be used" },
      keyMode: keyMode === "service_role" ? { status: "ok", detail: "Using SUPABASE_SERVICE_ROLE_KEY for server-side RAG operations" } : { status: "warning", detail: "Using SUPABASE_ANON_KEY fallback; server-side writes may fail under RLS" }
    };
    const statuses = Object.values(checks).map((check) => check.status);
    const overallStatus = statuses.includes("error") ? "error" : statuses.includes("warning") ? "warning" : "ok";
    return res.status(overallStatus === "error" ? 500 : 200).json({
      status: overallStatus,
      keyMode,
      env,
      checks
    });
  } catch (err) {
    console.error("documents/health error:", err);
    return res.status(500).json({
      status: "error",
      error: err.message
    });
  }
}
export {
  config,
  handler as default,
  runtime
};
