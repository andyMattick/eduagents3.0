"use strict";
/* Bundled by esbuild — do not edit */

// lib/auth.ts
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

// lib/supabase.ts
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}

// lib/rag.ts
import { createHash } from "crypto";
var schemaColumnSupport = /* @__PURE__ */ new Map();
function getMissingSchemaColumn(errorText) {
  if (!errorText.includes("PGRST204") && !errorText.includes("schema cache")) {
    return null;
  }
  const match = errorText.match(/'([^']+)' column/);
  return match ? match[1] : null;
}
async function insertWithSchemaFallback({
  url,
  headers,
  body,
  label
}) {
  const requestBody = { ...body };
  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });
    if (res.ok) {
      return res;
    }
    const err = await res.text();
    const missingColumn = getMissingSchemaColumn(err);
    if (missingColumn && missingColumn in requestBody) {
      delete requestBody[missingColumn];
      console.warn(`[RAG] ${label} column missing in live schema; retrying without ${missingColumn}`);
      continue;
    }
    throw new Error(`Failed to insert ${label}: ${err}`);
  }
}
function createAuthHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`
  };
}
function createJsonHeaders(key, prefer) {
  const headers = {
    ...createAuthHeaders(key),
    "Content-Type": "application/json"
  };
  if (prefer) {
    headers.Prefer = prefer;
  }
  return headers;
}
async function hasColumn(url, key, table, column) {
  const cacheKey = `${table}.${column}`;
  const cached = schemaColumnSupport.get(cacheKey);
  if (cached !== void 0) {
    return cached;
  }
  const res = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(column)}&limit=1`, {
    headers: createAuthHeaders(key)
  });
  if (res.ok) {
    schemaColumnSupport.set(cacheKey, true);
    return true;
  }
  const errorText = await res.text();
  const missingColumn = getMissingSchemaColumn(errorText);
  if (missingColumn === column) {
    console.warn(`[RAG] ${table}.${column} missing in live schema; disabling dependent logic`);
    schemaColumnSupport.set(cacheKey, false);
    return false;
  }
  console.warn(`[RAG] Failed probing ${table}.${column}; treating as unavailable`, errorText);
  return false;
}
async function isTableReachable(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: createAuthHeaders(key)
  });
  if (res.ok) {
    return true;
  }
  console.warn(`[RAG] ${table} reachability probe failed:`, await res.text());
  return false;
}
async function canInsertDocument(url, key, userId, supportsContentHash) {
  const probeContent = `RAG health probe ${new Date().toISOString()}`;
  const probeBody = {
    user_id: userId,
    title: "[health-check] rag probe",
    content: probeContent,
    metadata: {
      probe: true,
      source: "api/health/rag"
    }
  };
  if (supportsContentHash) {
    probeBody.content_hash = contentHash(probeContent);
  }
  try {
    const res = await insertWithSchemaFallback({
      url: `${url}/rest/v1/documents`,
      headers: createJsonHeaders(key, "return=representation"),
      body: probeBody,
      label: "document health probe"
    });
    const docs = await res.json();
    const docId = Array.isArray(docs) ? docs[0]?.id : docs?.id;
    if (!docId) {
      return false;
    }
    await fetch(`${url}/rest/v1/documents?id=eq.${encodeURIComponent(docId)}`, {
      method: "DELETE",
      headers: createJsonHeaders(key, "return=minimal")
    });
    return true;
  } catch (error) {
    console.warn("[RAG] Document insert probe failed:", error);
    return false;
  }
}
async function probeRagHealth(userId) {
  const { url, key } = supabaseAdmin();
  const documentsTable = await isTableReachable(url, key, "documents");
  if (!documentsTable) {
    return {
      documentsTable: false,
      contentHashColumn: false,
      canInsert: false
    };
  }
  const contentHashColumn = await hasColumn(url, key, "documents", "content_hash");
  const canInsert = await canInsertDocument(url, key, userId, contentHashColumn);
  return {
    documentsTable,
    contentHashColumn,
    canInsert
  };
}
function contentHash(text) {
  return createHash("sha256").update(text).digest("hex");
}

// api/health/rag.ts
var runtime = "nodejs";
var config = { maxDuration: 60 };
async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }
    const health = await probeRagHealth(auth.userId);
    return res.status(health.documentsTable && health.canInsert ? 200 : 503).json({
      documents_table: health.documentsTable,
      content_hash_column: health.contentHashColumn,
      can_insert: health.canInsert
    });
  } catch (err) {
    console.error("health/rag error:", err);
    return res.status(500).json({
      error: "RAG_HEALTH_FAILED",
      detail: err?.message || "Unknown RAG health failure"
    });
  }
}
export {
  config,
  handler as default,
  runtime
};
