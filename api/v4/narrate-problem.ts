import type { VercelRequest, VercelResponse } from "@vercel/node";

import { narrateProblem } from "../../src/prism-v4/narrator/service";
import type { NarrateProblemRequest } from "../../src/prism-v4/narrator/types";

export const runtime = "nodejs";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as NarrateProblemRequest;
	}

	try {
		return JSON.parse(body) as NarrateProblemRequest;
	} catch {
		throw new Error("Invalid JSON body");
	}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

	if (req.method === "OPTIONS") {
		return res.status(200).json({});
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const payload = parseBody(req.body ?? {});
		if (!payload?.problemText || !payload?.semanticFingerprint || !payload?.lens) {
			return res.status(400).json({ error: "Missing required fields: problemText, semanticFingerprint, lens" });
		}

		const response = await narrateProblem(payload);
		return res.status(200).json(response);
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Narration failed",
		});
	}
}
