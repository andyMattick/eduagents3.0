import { authenticateUser } from "../../lib/auth";
import { probeRagHealth } from "../../lib/rag";

export const runtime = "nodejs";
export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
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
      can_insert: health.canInsert,
    });
  } catch (err: any) {
    console.error("health/rag error:", err);
    return res.status(500).json({
      error: "RAG_HEALTH_FAILED",
      detail: err?.message || "Unknown RAG health failure",
    });
  }
}