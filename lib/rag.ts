/**
 * lib/rag.ts — Server-side RAG utilities
 *
 * Chunking, embedding (Gemini), storage, and retrieval for the
 * document memory system.  All functions use process.env for secrets
 * and the Supabase REST API — safe to call from any Vercel API route.
 */

import { supabaseAdmin } from "./supabase";
import { createHash } from "crypto";

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
  const dedupRes = await fetch(
    `${url}/rest/v1/documents?user_id=eq.${encodeURIComponent(userId)}&content_hash=eq.${encodeURIComponent(hash)}&select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (dedupRes.ok) {
    const existing = await dedupRes.json();
    if (Array.isArray(existing) && existing.length > 0) {
      return existing[0].id; // already stored
    }
  }

  // 1. Insert document
  const docRes = await fetch(`${url}/rest/v1/documents`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId,
      title,
      content,
      content_hash: hash,
      metadata: metadata ?? {},
    }),
  });

  if (!docRes.ok) {
    const err = await docRes.text();
    throw new Error(`Failed to insert document: ${err}`);
  }

  const docs = await docRes.json();
  const docId = Array.isArray(docs) ? docs[0]?.id : docs?.id;
  if (!docId) throw new Error("Document insert returned no id");

  // 2. Chunk + embed + store (parallel in batches)
  const chunks = chunkText(content);
  const chunkMeta = { title, ...(metadata ?? {}) };

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);

    await Promise.all(
      batch.map(async (chunk) => {
        const embedding = await embedText(chunk);

        const chunkRes = await fetch(`${url}/rest/v1/document_chunks`, {
          method: "POST",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({
            document_id: docId,
            user_id: userId,
            content: chunk,
            embedding: `[${embedding.join(",")}]`,
            metadata: chunkMeta,
          }),
        });

        if (!chunkRes.ok) {
          console.warn(`Failed to store chunk for doc ${docId}:`, await chunkRes.text());
        }
      })
    );
  }

  return docId;
}

// ── Retrieve relevant chunks ────────────────────────────────────────────────

export interface RankedChunk {
  content: string;
  similarity: number;
}

export async function retrieveRelevantChunks({
  query,
  userId,
  matchCount = 5,
}: {
  query: string;
  userId: string;
  matchCount?: number;
}): Promise<RankedChunk[]> {
  const embedding = await embedText(query);
  const { url, key } = supabaseAdmin();

  // Call the match_chunks RPC (pgvector cosine similarity)
  // Threshold filtering is handled server-side by match_chunks
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

  const data: RankedChunk[] = await rpcRes.json();

  // Return sorted by similarity (best first)
  return (data ?? []).sort((a, b) => b.similarity - a.similarity);
}

// ── Context window control ──────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 3000;

export function selectTopChunks(chunks: RankedChunk[]): string[] {
  let total = 0;
  const selected: string[] = [];

  for (const chunk of chunks) {
    if (total + chunk.content.length > MAX_CONTEXT_CHARS) break;
    selected.push(chunk.content);
    total += chunk.content.length;
  }

  return selected;
}

// ── Build RAG-enhanced prompt ───────────────────────────────────────────────

export function buildRAGPrompt(chunks: string[], userPrompt: string): string {
  if (chunks.length === 0) return userPrompt;

  return `You are an expert educational assistant.

Use ONLY the context below to answer the task.

If the answer is not clearly in the context, say:
"I don't have enough information from the document."

Do NOT make up information.

--- CONTEXT ---
${chunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}

--- TASK ---
${userPrompt}`;
}
