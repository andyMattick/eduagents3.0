import type { VercelRequest, VercelResponse } from "@vercel/node";

import { buildInstructionalBuilderPlan, resolveInstructionalAssessmentRuntime } from "../../../../src/prism-v4/session";

export const runtime = "nodejs";

function resolveQueryValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const sessionId = resolveQueryValue(req.query.sessionId);
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	try {
		const runtime = await resolveInstructionalAssessmentRuntime({
			sessionId,
			studentId: resolveQueryValue(req.query.studentId),
			teacherId: resolveQueryValue(req.query.teacherId),
			unitId: resolveQueryValue(req.query.unitId),
		});
		return res.status(200).json({
			sessionId,
			builderPlan: buildInstructionalBuilderPlan({
				product: runtime.product,
				conceptProfiles: runtime.assessmentFingerprint.conceptProfiles,
				adaptiveTargets: runtime.adaptiveTargets,
			}),
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Session not found") {
			return res.status(404).json({ error: error.message });
		}
		return res.status(500).json({ error: error instanceof Error ? error.message : "Builder plan request failed" });
	}
}