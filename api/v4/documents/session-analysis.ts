import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
	getDocumentSessionStore,
	loadPrismSessionContextCached,
} from "../../../src/prism-v4/documents/registryStore";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const sessionId = Array.isArray(req.query.sessionId) ? req.query.sessionId[0] : req.query.sessionId;
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	const session = await getDocumentSessionStore(sessionId);
	if (!session) {
		return res.status(404).json({ error: "Session not found" });
	}

	const context = await loadPrismSessionContextCached(sessionId);
	if (!context) {
		return res.status(404).json({ error: "Session not found" });
	}

	return res.status(200).json({ session, analysis: context.collectionAnalysis });
}