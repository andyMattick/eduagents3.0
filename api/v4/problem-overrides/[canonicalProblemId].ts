import type { VercelRequest, VercelResponse } from "@vercel/node";

import { deleteProblemOverride, getProblemOverride } from "../../../src/prism-v4/teacherFeedback";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET" && req.method !== "DELETE") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { canonicalProblemId } = req.query;
		const problemId = Array.isArray(canonicalProblemId) ? canonicalProblemId[0] : canonicalProblemId;
		if (!problemId) {
			return res.status(400).json({ error: "Missing canonicalProblemId" });
		}

		if (req.method === "DELETE") {
			const result = await deleteProblemOverride(problemId);
			return res.status(200).json(result);
		}

		const overrides = await getProblemOverride(problemId);
		return res.status(200).json({ overrides });
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load problem overrides" });
	}
}