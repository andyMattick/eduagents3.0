import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getDocumentSession, upsertDocumentSession } from "../../../src/prism-v4/documents/registry";
import type { DocumentSession } from "../../../src/prism-v4/schema/domain";

export const runtime = "nodejs";

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as Partial<DocumentSession>;
	}

	return JSON.parse(body) as Partial<DocumentSession>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
