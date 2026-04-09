import type { VercelRequest, VercelResponse } from "@vercel/node";

import { ensureSessionDocumentsStore, registerDocumentsStore } from "../../../../src/prism-v4/documents/registryStore";
import { ingestDocument } from "../../../../src/prism-v4/ingestion/ingestDocument";

export const runtime = "nodejs";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type SubmitBody = {
	sessionId?: string;
	text?: string;
	metadata?: Record<string, unknown>;
};

function parseBody(body: unknown): SubmitBody {
	if (typeof body === "string") {
		return JSON.parse(body) as SubmitBody;
	}
	return (body ?? {}) as SubmitBody;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

	if (req.method === "OPTIONS") {
		return res.status(200).json({});
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { sessionId, text, metadata } = parseBody(req.body);
		const normalizedSessionId = typeof sessionId === "string" ? sessionId.trim() : "";
		const normalizedText = typeof text === "string" ? text.trim() : "";

		if (!normalizedSessionId) {
			return res.status(400).json({ error: "sessionId is required" });
		}

		if (!normalizedText) {
			return res.status(400).json({ error: "text is required" });
		}

		const sourceFileName = typeof metadata?.sourceFileName === "string" && metadata.sourceFileName.trim().length > 0
			? metadata.sourceFileName.trim()
			: "student-submission.txt";
		const sourceMimeType = typeof metadata?.sourceMimeType === "string" && metadata.sourceMimeType.trim().length > 0
			? metadata.sourceMimeType.trim()
			: "text/plain";

		let registered = null as null | { documentId: string; sourceFileName: string; sourceMimeType: string; createdAt: string };
		try {
			const [storeRegistered] = await registerDocumentsStore(
				[{ sourceFileName, sourceMimeType }],
				normalizedSessionId,
			);
			registered = storeRegistered ?? null;
		} catch (registrationError) {
			console.warn("[student-portal/submit] registerDocumentsStore failed; using in-memory fallback:", registrationError instanceof Error ? registrationError.message : registrationError);
			const { registerDocuments, upsertDocumentSession } = await import("../../../../src/prism-v4/documents/registry");
			const [fallbackRegistered] = registerDocuments([{ sourceFileName, sourceMimeType }]);
			if (fallbackRegistered) {
				upsertDocumentSession({
					sessionId: normalizedSessionId,
					documentIds: [fallbackRegistered.documentId],
					documentRoles: { [fallbackRegistered.documentId]: ["unknown"] },
					sessionRoles: { [fallbackRegistered.documentId]: ["source-material"] },
				});
				registered = fallbackRegistered;
			}
		}

		if (!registered) {
			return res.status(500).json({ error: "Failed to register student document" });
		}

		try {
			await ensureSessionDocumentsStore(normalizedSessionId, [registered.documentId]);
		} catch (sessionError) {
			console.warn("[student-portal/submit] ensureSessionDocumentsStore non-fatal:", sessionError instanceof Error ? sessionError.message : sessionError);
		}

		let ingestionSummary: { docType: "problem" | "notes" | "mixed"; itemCount: number; sectionCount: number } | null = null;
		try {
			const ingestion = await ingestDocument({
				source: "student-portal",
				documentId: registered.documentId,
				rawText: normalizedText,
				metadata: metadata ?? {},
			});
			ingestionSummary = {
				docType: ingestion.docType,
				itemCount: ingestion.items.length,
				sectionCount: ingestion.sections.length,
			};
		} catch (ingestionError) {
			console.warn("[student-portal/submit] ingestDocument non-fatal:", ingestionError instanceof Error ? ingestionError.message : ingestionError);
		}

		return res.status(200).json({
			documentId: registered.documentId,
			sessionId: normalizedSessionId,
			ingestion: ingestionSummary,
		});
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Failed to submit student document",
		});
	}
}
