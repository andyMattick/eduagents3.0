import type { VercelRequest, VercelResponse } from "@vercel/node";

import { buildInstructionalUnitOverrideId, saveTeacherFeedback } from "../../src/prism-v4/teacherFeedback";

export const runtime = "nodejs";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
	Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

	if (req.method === "OPTIONS") {
		return res.status(200).json({});
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const payload = req.body ?? {};
		const canonicalProblemId = typeof payload.canonicalProblemId === "string" && payload.canonicalProblemId.trim().length > 0
			? payload.canonicalProblemId
			: payload.scope === "instructional-unit" && typeof payload.sessionId === "string" && typeof payload.unitId === "string"
				? buildInstructionalUnitOverrideId(payload.sessionId, payload.unitId)
				: null;
		if (!payload.teacherId || !payload.documentId || !canonicalProblemId || !payload.target) {
			return res.status(400).json({ error: "Missing required teacher feedback fields." });
		}

		const result = await saveTeacherFeedback({
			...payload,
			canonicalProblemId,
		});
		return res.status(200).json(result);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("INVALID_OVERRIDE:")) {
			return res.status(400).json({ error: error.message.replace("INVALID_OVERRIDE: ", "") });
		}
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Teacher feedback failed",
		});
	}
}