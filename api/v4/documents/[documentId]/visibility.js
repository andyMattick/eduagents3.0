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
const SUPABASE_TIMEOUT_MS = 8e3;
function createRequestId(req) {
  const raw = Array.isArray(req.headers["x-request-id"]) ? req.headers["x-request-id"][0] : req.headers["x-request-id"];
  if (typeof raw === "string" && raw.trim().length > 0)
    return raw.trim();
  return `visibility-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function maskCallerId(value) {
  if (!value || value.length < 12)
    return "unknown";
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
function logVisibilityEvent(event, context = {}) {
  console.log(
    JSON.stringify({
      scope: "visibility",
      event,
      ...context
    })
  );
}
async function supabaseRest(table, options = {}) {
  const { url, key } = supabaseAdmin();
  const { method = "GET", select, filters = {}, body, prefer, timeoutMs = SUPABASE_TIMEOUT_MS } = options;
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  let res;
  try {
    res = await fetch(reqUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error(`Supabase REST ${method} ${table} timed out after ${timeoutMs}ms`);
      timeoutError.code = "timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST ${method} ${table} failed (${res.status}): ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json"))
    return res.json();
  return null;
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
var runtime = "nodejs";
async function handler(req, res) {
  const requestId = createRequestId(req);
  const requestStartedAt = Date.now();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("x-request-id", requestId);
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Method not allowed" } });
  }
  const documentId = Array.isArray(req.query?.documentId) ? req.query.documentId[0] : req.query?.documentId;
  if (!documentId || typeof documentId !== "string") {
    return res.status(400).json({ error: { code: "invalid_request", message: "Missing documentId" } });
  }
  const authUserId = Array.isArray(req.headers["x-auth-user-id"]) ? req.headers["x-auth-user-id"][0] : req.headers["x-auth-user-id"];
  const legacyUserId = Array.isArray(req.headers["x-user-id"]) ? req.headers["x-user-id"][0] : req.headers["x-user-id"];
  const callerId = typeof (authUserId ?? legacyUserId) === "string" ? (authUserId ?? legacyUserId).trim() : null;
  if (!callerId) {
    return res.status(401).json({ error: { code: "unauthenticated", message: "Authentication required" } });
  }
  if (!isUuid(callerId)) {
    return res.status(401).json({ error: { code: "unauthenticated", message: "Authentication required" } });
  }
  const callerTag = maskCallerId(callerId);
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
  logVisibilityEvent("request_start", {
    requestId,
    documentId,
    callerId: callerTag,
    isPublic
  });
  try {
    const readStartAt = Date.now();
    logVisibilityEvent("supabase_read_start", { requestId, documentId, callerId: callerTag });
    const rows = await supabaseRest("prism_v4_documents", {
      select: "document_id,owner_id,is_public",
      filters: { document_id: `eq.${documentId}` },
      timeoutMs: SUPABASE_TIMEOUT_MS
    });
    logVisibilityEvent("supabase_read_ok", {
      requestId,
      documentId,
      elapsedMs: Date.now() - readStartAt
    });
    const doc = Array.isArray(rows) ? rows[0] : null;
    if (!doc) {
      return res.status(404).json({ error: { code: "not_found", message: "Document not found" } });
    }
    if (doc.owner_id !== callerId) {
      return res.status(403).json({ error: { code: "forbidden", message: "You do not own this document" } });
    }
    if (doc.is_public === isPublic) {
      return res.status(200).json({
        documentId,
        isPublic,
        status: "noop",
        message: isPublic ? "Document is already public." : "Document is already private."
      });
    }
    const writeStartAt = Date.now();
    logVisibilityEvent("supabase_write_start", {
      requestId,
      documentId,
      callerId: callerTag,
      isPublic
    });
    await supabaseRest("prism_v4_documents", {
      method: "PATCH",
      filters: {
        document_id: `eq.${documentId}`,
        owner_id: `eq.${callerId}`
      },
      body: { is_public: isPublic },
      prefer: "return=minimal",
      timeoutMs: SUPABASE_TIMEOUT_MS
    });
    logVisibilityEvent("supabase_write_ok", {
      requestId,
      documentId,
      elapsedMs: Date.now() - writeStartAt
    });
    logVisibilityEvent("request_ok", {
      requestId,
      documentId,
      callerId: callerTag,
      elapsedMs: Date.now() - requestStartedAt
    });
    return res.status(200).json({
      documentId,
      isPublic,
      status: "updated",
      message: isPublic ? "Document is now public." : "Document is now private."
    });
  } catch (error) {
    const isTimeout = (error == null ? void 0 : error.code) === "timeout";
    const elapsedMs = Date.now() - requestStartedAt;
    logVisibilityEvent("request_error", {
      requestId,
      documentId,
      callerId: callerTag,
      elapsedMs,
      timeout: isTimeout,
      error: error instanceof Error ? error.message : String(error)
    });
    if (isTimeout) {
      return res.status(500).json({
        error: { code: "timeout", message: "Supabase did not respond in time" }
      });
    }
    return res.status(500).json({
      error: { code: "internal_error", message: error instanceof Error ? error.message : "Visibility update failed" }
    });
  }
}
export {
  handler as default,
  runtime
};
