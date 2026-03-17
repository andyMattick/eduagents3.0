/**
 * /api/documents/store — Store extracted document text + embeddings
 *
 * POST { title, content, metadata? }
 * Returns { docId }
 *
 * Requires Authorization header (Supabase JWT).
 * Chunks the content, embeds each chunk via Gemini, and stores
 * everything in the documents + document_chunks tables.
 */
import { authenticateUser } from "../../lib/auth";
import { storeDocument } from "../../lib/rag";

export const runtime = "nodejs";
export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Auth
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    // Parse body
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const { title, content, metadata } = body || {};

    if (!content) {
      return res.status(400).json({ error: "Missing required field: content" });
    }

    const docId = await storeDocument({
      userId: auth.userId,
      title: title || "Untitled Document",
      content,
      metadata,
    });

    return res.status(200).json({ docId });
  } catch (err: any) {
    console.error("documents/store error:", err);
    return res.status(500).json({ error: err.message });
  }
}
