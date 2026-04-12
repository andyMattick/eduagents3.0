import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getDocument, getItemsForDocument, getSectionsForDocument } from "../simulator/shared";
import { supabaseRest } from "../../../lib/supabase";
import { loadPrismDocumentAnalysisTarget } from "../../../src/prism-v4/documents/registryStore";

export const runtime = "nodejs";

type DocumentStatusResponse = {
	documentId: string;
	docType: "assignment" | "assessment" | "mixed" | "notes" | null;
	analysisAvailable: boolean;
	rewriteEligible: boolean;
};

function normalizeDocType(value: unknown): DocumentStatusResponse["docType"] {
	if (typeof value !== "string") return null;
	const normalized = value.trim().toLowerCase();
	if (!normalized) return null;

	if (normalized === "problem" || normalized === "assessment" || normalized === "test") {
		return "assessment";
	}
	if (normalized === "assignment") return "assignment";
	if (normalized === "mixed") return "mixed";
	if (normalized === "notes" || normalized === "review" || normalized === "slides" || normalized === "article") {
		return "notes";
	}

	return null;
}

function extractDocTypeFromSessionRoles(sessionRoles: unknown, documentId: string): DocumentStatusResponse["docType"] {
	if (!sessionRoles || typeof sessionRoles !== "object") return null;

	const byDocument = (sessionRoles as Record<string, unknown>)[documentId];
	if (Array.isArray(byDocument)) {
		for (const entry of byDocument) {
			const parsed = normalizeDocType(entry);
			if (parsed) return parsed;
		}
	}

	if (byDocument && typeof byDocument === "object") {
		const typed = byDocument as Record<string, unknown>;
		const parsed = normalizeDocType(typed.docType ?? typed.documentType ?? typed.type);
		if (parsed) return parsed;
	}

	const topLevel = sessionRoles as Record<string, unknown>;
	return normalizeDocType(topLevel.docType ?? topLevel.documentType ?? topLevel.type);
}

function isRewriteEligible(docType: DocumentStatusResponse["docType"]) {
	return docType === "assignment" || docType === "assessment" || docType === "mixed";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const documentId = Array.isArray(req.query.documentId) ? req.query.documentId[0] : req.query.documentId;
	if (!documentId) {
		return res.status(400).json({ error: "documentId is required" });
	}

	try {
		const [document, items, sections, analysisTarget] = await Promise.all([
			getDocument(documentId),
			getItemsForDocument(documentId),
			getSectionsForDocument(documentId),
			loadPrismDocumentAnalysisTarget(documentId).catch(() => null),
		]);

		const sessionId = analysisTarget?.sessionId ?? null;
		const sessionRows = sessionId
			? await supabaseRest("prism_v4_sessions", {
				method: "GET",
				select: "session_id,session_roles,created_at",
				filters: { session_id: `eq.${sessionId}` },
			})
			: await supabaseRest("prism_v4_sessions", {
				method: "GET",
				select: "session_id,session_roles,created_at",
				filters: { document_ids: `cs.{${documentId}}` },
			});

		const session = Array.isArray(sessionRows) && sessionRows.length > 0
			? (sessionRows[0] as { session_roles?: unknown; created_at?: string | null })
			: null;
		const sessionDocType = extractDocTypeFromSessionRoles(session?.session_roles, documentId);
		const fallbackDocType = normalizeDocType(document?.doc_type);
		const inferredDocType = sessionDocType ?? fallbackDocType ?? (
			sections.length > 0 && items.length > 0
				? "mixed"
				: sections.length > 0
				? "notes"
				: items.length > 0
				? "assessment"
				: null
		);
		const analysisAvailable = Boolean(analysisTarget?.analyzedDocument) || Boolean(session?.created_at);
		const payload: DocumentStatusResponse = {
			documentId,
			docType: inferredDocType,
			analysisAvailable,
			rewriteEligible: isRewriteEligible(inferredDocType),
		};

		return res.status(200).json(payload);
	} catch {
		const fallback: DocumentStatusResponse = {
			documentId,
			docType: null,
			analysisAvailable: false,
			rewriteEligible: false,
		};
		return res.status(200).json(fallback);
	}
}
