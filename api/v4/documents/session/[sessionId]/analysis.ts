import type { VercelRequest, VercelResponse } from "@vercel/node";

import { buildDocumentCollectionAnalysis } from "../../../../../src/prism-v4/documents/analysis";
import { buildDefaultCollectionAnalysis, getCollectionAnalysis, getDocumentSession } from "../../../../../src/prism-v4/documents/registry";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const sessionId = Array.isArray(req.query.sessionId) ? req.query.sessionId[0] : req.query.sessionId;
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	const session = getDocumentSession(sessionId);
	if (!session) {
		return res.status(404).json({ error: "Session not found" });
	}

	const analysis = getCollectionAnalysis(sessionId) ?? buildDocumentCollectionAnalysis(sessionId) ?? buildDefaultCollectionAnalysis(sessionId);
	return res.status(200).json({ session, analysis });
}
