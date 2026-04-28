"use strict";
/* Bundled by esbuild — do not edit */

// api/documents/store.ts
import { createHash } from "crypto";
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
function chunkText(text, size = 500, overlap = 100) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
function buildStubEmbedding(text, dims = 64) {
  const vector = new Array(dims).fill(0);
  const input = text || "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    vector[i % dims] += code % 97 / 97;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / norm;
    }
  }
  return vector;
}
async function embedText(text) {
  return buildStubEmbedding(text);
}
function contentHash(text) {
  return createHash("sha256").update(text).digest("hex");
}
var EMBED_BATCH_SIZE = 5;
async function storeDocument({
  userId,
  title,
  content,
  metadata
}) {
  const { url, key } = supabaseAdmin();
  const headers = createJsonHeaders(key, "return=representation");
  console.info("[rag] store started", { userId, title });
  const hash = contentHash(content);
  const canUseContentHash = await hasColumn(url, key, "documents", "content_hash");
  if (canUseContentHash) {
    const dedupRes = await fetch(`${url}/rest/v1/documents?user_id=eq.${encodeURIComponent(userId)}&content_hash=eq.${encodeURIComponent(hash)}&select=id&limit=1`, { headers: createAuthHeaders(key) });
    if (dedupRes.ok) {
      const existing = await dedupRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        console.info("[rag] dedup hit", { userId, documentId: existing[0].id });
        return existing[0].id;
      }
    } else {
      const dedupErr = await dedupRes.text();
      if (getMissingSchemaColumn(dedupErr) === "content_hash") {
        schemaColumnSupport.set("documents.content_hash", false);
        console.warn("[RAG] content_hash column missing; skipping document deduplication");
      } else {
        console.warn("[RAG] Document deduplication lookup failed:", dedupErr);
      }
    }
  } else {
    console.warn("[RAG] content_hash column missing; skipping hash logic");
  }
  const documentBody = {
    user_id: userId,
    title,
    content,
    metadata: metadata ?? {}
  };
  if (canUseContentHash) {
    documentBody.content_hash = hash;
  }
  console.info("[rag] document insert start", { userId, title });
  const docRes = await insertWithSchemaFallback({
    url: `${url}/rest/v1/documents`,
    headers,
    body: documentBody,
    label: "document"
  });
  const docs = await docRes.json();
  const docId = Array.isArray(docs) ? docs[0]?.id : docs?.id;
  if (!docId)
    throw new Error("Document insert returned no id");
  console.info("[rag] document insert success", { docId });
  setTimeout(() => {
    console.info("[rag] chunk embedding scheduled", { docId });
    void embedAndStoreChunks({ url, headers, docId, userId, title, content, metadata }).catch((err) => console.error(`[RAG] background embed failed for doc ${docId}:`, err));
  }, 0);
  return docId;
}
async function embedAndStoreChunks({
  url,
  headers,
  docId,
  userId,
  title,
  content,
  metadata
}) {
  try {
    const chunks = chunkText(content);
    const chunkMeta = { title, ...metadata ?? {} };
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      await Promise.all(batch.map(async (chunk) => {
        try {
          const embedding = await embedText(chunk);
          await insertWithSchemaFallback({
            url: `${url}/rest/v1/document_chunks`,
            headers: { ...headers, Prefer: "return=minimal" },
            body: {
              document_id: docId,
              user_id: userId,
              content: chunk,
              embedding: `[${embedding.join(",")}]`,
              metadata: chunkMeta
            },
            label: "document chunk"
          });
        } catch (err) {
          console.warn(`[rag] Chunk embed failed for doc ${docId}:`, err);
        }
      }));
    }
  } catch (err) {
    console.warn(`[rag] embedAndStoreChunks aborted for doc ${docId}:`, err);
  }
}
async function extractSemantics(content) {
  const DEFAULT = {
    topic: "",
    concepts: [],
    relationships: [],
    misconceptions: []
  };
  return DEFAULT;
}
var runtime = "nodejs";
var config = { maxDuration: 60 };
async function handler(req, res) {
  console.log("[documents/store] handler invoked");
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }
    console.info("[documents/store] authenticated", { userId: auth.userId });
    let body = req.body;
    if (typeof body === "string")
      body = JSON.parse(body);
    const { title, content, metadata } = body || {};
    if (!content) {
      return res.status(400).json({ error: "Missing required field: content" });
    }
    let semantics = null;
    try {
      console.info("[store] semantic extraction started");
      semantics = await extractSemantics(content);
      console.info("[store] semantic extraction finished", { hasSemantics: Boolean(semantics) });
    } catch (err) {
      console.warn("[store] Semantic extraction failed (non-blocking):", err);
    }
    let docId = null;
    let ragStatus = "skipped";
    try {
      console.info("[store] attempting insert");
      docId = await storeDocument({
        userId: auth.userId,
        title: title || "Untitled Document",
        content,
        metadata: {
          ...metadata,
          ...semantics ? { semantics } : {}
        }
      });
      ragStatus = "stored";
      console.info("[store] insert success", { docId });
    } catch (err) {
      console.error("[store] Non-blocking failure:", err);
    }
    console.info("[respond] returning JSON", { ragStatus, hasDocId: Boolean(docId) });
    return res.status(200).json({ docId, semantics, ragStatus });
  } catch (err) {
    console.error("documents/store error:", err);
    return res.status(500).json({
      error: "DOCUMENT_STORE_FAILED",
      detail: err?.message || "Unknown documents/store failure"
    });
  }
}
export {
  config,
  handler as default,
  runtime
};
