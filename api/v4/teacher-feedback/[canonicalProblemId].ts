import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getFeedbackForProblem } from "../../../src/prism-v4/teacherFeedback";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { canonicalProblemId } = req.query;
		const problemId = Array.isArray(canonicalProblemId) ? canonicalProblemId[0] : canonicalProblemId;
		if (!problemId) {
			return res.status(400).json({ error: "Missing canonicalProblemId" });
		}

		const feedback = await getFeedbackForProblem(problemId);
		return res.status(200).json({ feedback });
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load teacher feedback" });
	}
}