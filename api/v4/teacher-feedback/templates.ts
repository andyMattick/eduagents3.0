import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getTeacherDerivedTemplateRecords } from "../../../src/prism-v4/teacherFeedback";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const subject = Array.isArray(req.query.subject) ? req.query.subject[0] : req.query.subject;
		const domain = Array.isArray(req.query.domain) ? req.query.domain[0] : req.query.domain;
		const templates = await getTeacherDerivedTemplateRecords(subject, domain);
		return res.status(200).json({ templates });
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load teacher templates" });
	}
}