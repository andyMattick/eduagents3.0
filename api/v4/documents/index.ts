import type { VercelRequest, VercelResponse } from "@vercel/node";

import { supabaseRest } from "../../../lib/supabase";

export const runtime = "nodejs";

type DocumentRow = {
  document_id: string;
  source_file_name: string | null;
  created_at: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rows = await supabaseRest("prism_v4_documents", {
      method: "GET",
      select: "document_id,source_file_name,created_at",
      filters: {
        order: "created_at.desc",
        limit: "100",
      },
    });

    const documents = ((rows as DocumentRow[]) ?? []).map((row) => ({
      documentId: row.document_id,
      sourceFileName: row.source_file_name ?? row.document_id,
      createdAt: row.created_at,
    }));

    return res.status(200).json({ documents });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list documents" });
  }
}
