/**
 * /api/documents/store — Store extracted document text + embeddings + semantics
 *
 * POST { title, content, metadata? }
 * Returns { docId, semantics }
 *
 * Requires Authorization header (Supabase JWT).
 * Extracts educational semantics, chunks the content, embeds each chunk
 * via LLM, and stores everything in the documents + document_chunks tables.
 */
import { authenticateUser } from "../../lib/auth";
import { storeDocument } from "../../lib/rag";
import { extractSemantics } from "../../lib/semantic/parseQuery";

export const runtime = "nodejs";
export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
  console.log("[documents/store] handler invoked");
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Auth
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    console.info("[documents/store] authenticated", { userId: auth.userId });

    // Parse body
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const { title, content, metadata } = body || {};

    if (!content) {
      return res.status(400).json({ error: "Missing required field: content" });
    }

    // Extract semantics before storing (never blocks on failure)
    let semantics = null;
    try {
      console.info("[store] semantic extraction started");
      semantics = await extractSemantics(content);
      console.info("[store] semantic extraction finished", { hasSemantics: Boolean(semantics) });
    } catch (err) {
      console.warn("[store] Semantic extraction failed (non-blocking):", err);
    }

    let docId: string | null = null;
    let ragStatus: "stored" | "skipped" = "skipped";

    try {
      console.info("[store] attempting insert");
      docId = await storeDocument({
        userId: auth.userId,
        title: title || "Untitled Document",
        content,
        metadata: {
          ...metadata,
          ...(semantics ? { semantics } : {}),
        },
      });
      ragStatus = "stored";
      console.info("[store] insert success", { docId });
    } catch (err) {
      console.error("[store] Non-blocking failure:", err);
    }

    console.info("[respond] returning JSON", { ragStatus, hasDocId: Boolean(docId) });
    return res.status(200).json({ docId, semantics, ragStatus });
  } catch (err: any) {
    console.error("documents/store error:", err);
    return res.status(500).json({
      error: "DOCUMENT_STORE_FAILED",
      detail: err?.message || "Unknown documents/store failure",
    });
  }
}
