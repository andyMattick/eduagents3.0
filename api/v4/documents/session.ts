import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
	getAnalyzedDocumentsForSessionStore,
	getDocumentSessionStore,
	getSessionDocumentsStore,
	upsertDocumentSessionStore,
} from "../../../src/prism-v4/documents/registryStore";
import type { DocumentSession } from "../../../src/prism-v4/schema/domain";

export const runtime = "nodejs";

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as Partial<DocumentSession>;
	}

	return JSON.parse(body) as Partial<DocumentSession>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "GET") {
		const sessionId = Array.isArray(req.query.sessionId) ? req.query.sessionId[0] : req.query.sessionId;
		if (!sessionId) {
			return res.status(400).json({ error: "sessionId is required" });
		}

		const session = await getDocumentSessionStore(sessionId);
		if (!session) {
			return res.status(404).json({ error: "Session not found" });
		}

		const [documents, analyzedDocuments] = await Promise.all([
			getSessionDocumentsStore(sessionId),
			getAnalyzedDocumentsForSessionStore(sessionId),
		]);

		return res.status(200).json({
			session,
			documents,
			analyzedDocuments,
		});
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const payload = parseBody(req.body ?? {});
		if (!payload.sessionId || !payload.documentIds || !payload.documentRoles || !payload.sessionRoles) {
			return res.status(400).json({ error: "sessionId, documentIds, documentRoles, and sessionRoles are required" });
		}

		const existing = await getDocumentSessionStore(payload.sessionId);
		const session = await upsertDocumentSessionStore({
			sessionId: payload.sessionId,
			documentIds: payload.documentIds,
			documentRoles: payload.documentRoles,
			sessionRoles: payload.sessionRoles,
			createdAt: existing?.createdAt,
		});

		return res.status(200).json(session);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Session route failed" });
	}
}
