import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { ConceptVerificationPreviewRequest } from "../../../src/prism-v4/schema/integration";
import { buildConceptVerificationPreview } from "./sharedPreview";

export const runtime = "nodejs";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as ConceptVerificationPreviewRequest;
	}
	return JSON.parse(body) as ConceptVerificationPreviewRequest;
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
		const preview = await buildConceptVerificationPreview(payload);
		return res.status(200).json(preview);
	} catch (error) {
		if (error instanceof Error && error.message === "Session not found") {
			return res.status(404).json({ error: error.message });
		}
		if (error instanceof Error && /required|conceptBlueprint/.test(error.message)) {
			return res.status(400).json({ error: error.message });
		}
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Concept verification preview failed",
		});
	}
}