import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getDocument, getItemsForDocument, getSectionsForDocument } from "../simulator/shared";
import { supabaseRest } from "../../../lib/supabase";
import { loadPrismDocumentAnalysisTarget } from "../../../src/prism-v4/documents/registryStore";

export const runtime = "nodejs";

type DocumentStatusResponse = {
	documentId: string;
	docType: "problem" | "notes" | "mixed" | null;
	items: number;
	sections: number;
	analysis: boolean;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const documentId = Array.isArray(req.query.documentId) ? req.query.documentId[0] : req.query.documentId;
	if (!documentId) {
		return res.status(400).json({ error: "documentId is required" });
	}

	try {
		const [document, items, sections, analysisRows, analysisTarget] = await Promise.all([
			getDocument(documentId),
			getItemsForDocument(documentId),
			getSectionsForDocument(documentId),
			supabaseRest("v4_analysis", {
				method: "GET",
				select: "document_id",
				filters: { document_id: `eq.${documentId}` },
			}),
			loadPrismDocumentAnalysisTarget(documentId).catch(() => null),
		]);

		const analysisFromSupabase = Array.isArray(analysisRows) && analysisRows.length > 0;
		const analysis = analysisFromSupabase || Boolean(analysisTarget?.analyzedDocument);
		const payload: DocumentStatusResponse = {
			documentId,
			docType: document?.doc_type ?? null,
			items: items.length,
			sections: sections.length,
			analysis,
		};

		return res.status(200).json(payload);
	} catch {
		const fallback: DocumentStatusResponse = {
			documentId,
			docType: null,
			items: 0,
			sections: 0,
			analysis: false,
		};
		return res.status(200).json(fallback);
	}
}
