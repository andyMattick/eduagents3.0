import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getAnalyzedDocumentsForSession, getDocumentSession, getSessionDocuments, upsertDocumentSession } from "../../../src/prism-v4/documents/registry";
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

		const session = getDocumentSession(sessionId);
		if (!session) {
			return res.status(404).json({ error: "Session not found" });
		}

		return res.status(200).json({
			session,
			documents: getSessionDocuments(sessionId),
			analyzedDocuments: getAnalyzedDocumentsForSession(sessionId),
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

		const session = upsertDocumentSession({
			sessionId: payload.sessionId,
			documentIds: payload.documentIds,
			documentRoles: payload.documentRoles,
			sessionRoles: payload.sessionRoles,
			createdAt: getDocumentSession(payload.sessionId)?.createdAt,
		});

		return res.status(200).json(session);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Session route failed" });
	}
}
