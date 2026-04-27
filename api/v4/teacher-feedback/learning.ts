import type { VercelRequest, VercelResponse } from "@vercel/node";

import { loadTemplateLearning } from "../../../src/prism-v4/semantic/learning";

export const runtime = "nodejs";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
	if (_req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const records = await loadTemplateLearning();
		return res.status(200).json({ records });
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load template learning records" });
	}
}