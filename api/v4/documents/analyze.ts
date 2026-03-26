import type { VercelRequest, VercelResponse } from "@vercel/node";

import { analyzeRegisteredDocument } from "../../../src/prism-v4/documents/analysis";
import {
	getAnalyzedDocumentStore,
	getDocumentSessionIdStore,
	getRegisteredDocumentStore,
	saveAnalyzedDocumentStore,
} from "../../../src/prism-v4/documents/registryStore";

export const runtime = "nodejs";

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as { documentId?: string; sessionId?: string };
	}

	return JSON.parse(body) as { documentId?: string; sessionId?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const payload = parseBody(req.body ?? {});
		if (!payload.documentId) {
			return res.status(400).json({ error: "documentId is required" });
		}

		const document = await getRegisteredDocumentStore(payload.documentId);
		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		let analyzedDocument = await getAnalyzedDocumentStore(payload.documentId);
		if (!analyzedDocument) {
			analyzedDocument = await analyzeRegisteredDocument({
				documentId: document.documentId,
				sourceFileName: document.sourceFileName,
				sourceMimeType: document.sourceMimeType,
				rawBinary: document.rawBinary,
				azureExtract: document.azureExtract,
				canonicalDocument: document.canonicalDocument,
			});
			const sessionId = payload.sessionId ?? await getDocumentSessionIdStore(payload.documentId);
			await saveAnalyzedDocumentStore(analyzedDocument, sessionId);
		}
		return res.status(200).json({
			documentId: payload.documentId,
			status: analyzedDocument.problems.length > 0 || analyzedDocument.fragments.length > 0 ? "ready" : "registered",
			analyzedDocument,
		});
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Analyze route failed" });
	}
}
