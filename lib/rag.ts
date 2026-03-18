/**
 * lib/rag.ts — Server-side RAG utilities
 *
 * Chunking, embedding (Gemini), storage, hybrid retrieval,
 * semantic filtering, ranking, context control, and structured
 * prompt building for the document memory system.
 *
 * All functions use process.env for secrets and the Supabase REST
 * API — safe to call from any Vercel API route.
 */

import { supabaseAdmin } from "./supabase";
import { createHash } from "crypto";
import type { QuerySemantics } from "./semantic/parseQuery";

function getMissingSchemaColumn(errorText: string): string | null {
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
  label,
}: {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  label: string;
}) {
  const requestBody = { ...body };

  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
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

// ── Chunking ────────────────────────────────────────────────────────────────

export function chunkText(text: string, size = 500, overlap = 100): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// ── Embedding ───────────────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

// ── Content hashing (deduplication) ─────────────────────────────────────────

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// ── Store document + chunks ─────────────────────────────────────────────────

const EMBED_BATCH_SIZE = 5;

export async function storeDocument({
  userId,
  title,
  content,
  metadata,
}: {
  userId: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const { url, key } = supabaseAdmin();
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 0. Deduplication — skip if identical document already stored
  const hash = contentHash(content);
  let canUseContentHash = true;

  const dedupRes = await fetch(
    `${url}/rest/v1/documents?user_id=eq.${encodeURIComponent(userId)}&content_hash=eq.${encodeURIComponent(hash)}&select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (dedupRes.ok) {
    const existing = await dedupRes.json();
    if (Array.isArray(existing) && existing.length > 0) {
      return existing[0].id; // already stored
    }
  } else {
    const dedupErr = await dedupRes.text();
    if (getMissingSchemaColumn(dedupErr) === "content_hash") {
      canUseContentHash = false;
      console.warn("[RAG] content_hash column missing; skipping document deduplication");
    } else {
      console.warn("[RAG] Document deduplication lookup failed:", dedupErr);
    }
  }

  // 1. Insert document
  const documentBody: Record<string, unknown> = {
    user_id: userId,
    title,
    content,
    metadata: metadata ?? {},
  };
  if (canUseContentHash) {
    documentBody.content_hash = hash;
  }

  const docRes = await insertWithSchemaFallback({
    url: `${url}/rest/v1/documents`,
    headers,
    body: documentBody,
    label: "document",
  });

  const docs = await docRes.json();
  const docId = Array.isArray(docs) ? docs[0]?.id : docs?.id;
  if (!docId) throw new Error("Document insert returned no id");

  // 2. Chunk + embed + store (non-blocking — never fails the document insert)
  setTimeout(() => {
    void embedAndStoreChunks({ url, headers, docId, userId, title, content, metadata }).catch((err) =>
      console.error(`[RAG] background embed failed for doc ${docId}:`, err)
    );
  }, 0);

  return docId;
}

// ── Background embed + store ────────────────────────────────────────────────

async function embedAndStoreChunks({
  url,
  headers,
  docId,
  userId,
  title,
  content,
  metadata,
}: {
  url: string;
  headers: Record<string, string>;
  docId: string;
  userId: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[rag] GEMINI_API_KEY missing — skipping embeddings for doc", docId);
      return;
    }

    const chunks = chunkText(content);
    const chunkMeta = { title, ...(metadata ?? {}) };

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);

      await Promise.all(
        batch.map(async (chunk) => {
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
                metadata: chunkMeta,
              },
              label: "document chunk",
            });
          } catch (err) {
            console.warn(`[rag] Chunk embed failed for doc ${docId}:`, err);
          }
        })
      );
    }
  } catch (err) {
    console.warn(`[rag] embedAndStoreChunks aborted for doc ${docId}:`, err);
  }
}

// ── Retrieve relevant chunks ────────────────────────────────────────────────

export interface RankedChunk {
  content: string;
  similarity: number;
  score: number;
  conceptMatches: string[];
}

export async function retrieveRelevantChunks({
  query,
  userId,
  matchCount = 10,
}: {
  query: string;
  userId: string;
  matchCount?: number;
}): Promise<RankedChunk[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[RAG] GEMINI_API_KEY missing — fallback mode");
    return [];
  }

  try {
    const embedding = await embedText(query);
    const { url, key } = supabaseAdmin();

    // Step 1 — vector retrieval (pgvector cosine similarity, server-side threshold)
    const rpcRes = await fetch(`${url}/rest/v1/rpc/match_chunks`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_embedding: `[${embedding.join(",")}]`,
        p_user_id: userId,
        match_count: matchCount,
      }),
    });

    if (!rpcRes.ok) {
      console.warn("RAG retrieval failed:", await rpcRes.text());
      return [];
    }

    const data: Array<{ content: string; similarity: number }> =
      (await rpcRes.json()) ?? [];

    if (!data.length) {
      console.warn("[RAG] No chunks found — fallback mode");
    }

    // Convert to RankedChunk with default scores
    return data.map((d) => ({
      content: d.content,
      similarity: d.similarity,
      score: d.similarity,
      conceptMatches: [],
    }));
  } catch (err) {
    console.warn("[RAG] Retrieval fallback mode:", err);
    return [];
  }
}

// ── Hybrid filtering + ranking ──────────────────────────────────────────────

const CONCEPT_BOOST = 0.15;

export function rankChunks(
  chunks: RankedChunk[],
  semantics: QuerySemantics
): RankedChunk[] {
  if (chunks.length === 0) return [];

  const concepts = semantics.concepts;

  // Score each chunk: similarity + concept match boost
  const scored = chunks.map((chunk) => {
    const lower = chunk.content.toLowerCase();
    const matches = concepts.filter((c) => lower.includes(c.toLowerCase()));
    const boost = matches.length > 0 ? CONCEPT_BOOST * matches.length : 0;

    return {
      ...chunk,
      score: chunk.similarity + boost,
      conceptMatches: matches,
    };
  });

  // Step 2 — semantic filter: keep chunks that match at least one concept
  const filtered = scored.filter((c) => c.conceptMatches.length > 0);

  // Step 3 — fallback: if filter killed everything, use all chunks
  const final = filtered.length > 0 ? filtered : scored;

  // Step 4 — sort by composite score (best first)
  return final.sort((a, b) => b.score - a.score);
}

// ── Context window control ──────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 3000;

export function selectTopChunks(
  chunks: RankedChunk[],
  maxChars: number = MAX_CONTEXT_CHARS
): string[] {
  let total = 0;
  const selected: string[] = [];

  for (const chunk of chunks) {
    if (total + chunk.content.length > maxChars) break;
    selected.push(chunk.content);
    total += chunk.content.length;
  }

  return selected;
}

// ── Structured prompt builder ───────────────────────────────────────────────

export function buildRAGPrompt(
  chunks: string[],
  userPrompt: string,
  semantics?: QuerySemantics
): string {
  if (chunks.length === 0) return userPrompt;

  const contextBlock = chunks
    .map((c, i) => `[${i + 1}] ${c}`)
    .join("\n\n");

  const conceptsBlock =
    semantics && semantics.concepts.length > 0
      ? `\n--- KNOWN CONCEPTS ---\n${semantics.concepts.join(", ")}\n`
      : "";

  return `You are an expert educational assistant.

--- CONTEXT ---
${contextBlock}
${conceptsBlock}
--- INSTRUCTIONS ---
Use ONLY the context above to answer the task.
If the answer is not clearly in the context, say:
"I don't have enough information from the document."
Do NOT make up information. Do NOT go beyond what the context states.

--- TASK ---
${userPrompt}`;
}
