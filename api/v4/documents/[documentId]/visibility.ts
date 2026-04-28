"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/documents/[documentId]/visibility.ts
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}
async function supabaseRest(table, options = {}) {
  const { url, key } = supabaseAdmin();
  const { method = "GET", select, filters = {}, body, prefer } = options;
  const reqUrl = new URL(`${url}/rest/v1/${table}`);
  if (select)
    reqUrl.searchParams.set("select", select);
  for (const [k, v] of Object.entries(filters))
    reqUrl.searchParams.set(k, v);
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  if (prefer)
    headers["Prefer"] = prefer;
  const res = await fetch(reqUrl.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST ${method} ${table} failed (${res.status}): ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json"))
    return res.json();
  return null;
}
var runtime = "nodejs";
async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Method not allowed" } });
  }
  const documentId = Array.isArray(req.query?.documentId) ? req.query.documentId[0] : req.query?.documentId;
  if (!documentId || typeof documentId !== "string") {
    return res.status(400).json({ error: { code: "invalid_request", message: "Missing documentId" } });
  }
  const callerId = Array.isArray(req.headers["x-auth-user-id"]) ? req.headers["x-auth-user-id"][0] : req.headers["x-auth-user-id"];
  if (!callerId || typeof callerId !== "string") {
    return res.status(401).json({ error: { code: "unauthenticated", message: "Authentication required" } });
  }
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  } catch {
    return res.status(400).json({ error: { code: "invalid_request", message: "Request body must be valid JSON" } });
  }
  const { isPublic } = body;
  if (typeof isPublic !== "boolean") {
    return res.status(400).json({ error: { code: "invalid_request", message: "isPublic must be a boolean" } });
  }
  try {
    const rows = await supabaseRest("prism_v4_documents", {
      select: "document_id,owner_id",
      filters: { document_id: `eq.${documentId}` }
    });
    const doc = Array.isArray(rows) ? rows[0] : null;
    if (!doc) {
      return res.status(404).json({ error: { code: "not_found", message: "Document not found" } });
    }
    if (doc.owner_id !== callerId) {
      return res.status(403).json({ error: { code: "forbidden", message: "You do not own this document" } });
    }
    await supabaseRest("prism_v4_documents", {
      method: "PATCH",
      filters: { document_id: `eq.${documentId}` },
      body: { is_public: isPublic },
      prefer: "return=minimal"
    });
    return res.status(200).json({ documentId, isPublic });
  } catch (error) {
    console.error("[visibility] error", error);
    return res.status(500).json({
      error: { code: "internal_error", message: error instanceof Error ? error.message : "Visibility update failed" }
    });
  }
}
export {
  handler as default,
  runtime
};
