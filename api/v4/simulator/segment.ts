/**
 * POST /api/v4/simulator/segment
 *
 * Hybrid segmentation route.
 * Accepts { text } or { azureExtract } and returns { items: [{ itemNumber, text }] }.
 *
 * Uses Azure layout + local rules (no LLM in the primary path).
 * LLM is called only when hybrid returns <=1 item (rare fallback).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { segmentText } from "./shared";

export const runtime = "nodejs";
export const maxDuration = 30;

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "OPTIONS") {
		return res
			.status(200)
			.setHeader("Access-Control-Allow-Origin", "*")
			.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
			.setHeader("Access-Control-Allow-Headers", "Content-Type")
			.end();
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	let body = req.body;
	if (typeof body === "string") {
		try { body = JSON.parse(body); } catch { /* keep as-is */ }
	}

	const { text, azureExtract } = (body ?? {}) as { text?: string; azureExtract?: Record<string, unknown> };
	if (!text && !azureExtract) {
		return res.status(400).json({ error: "text or azureExtract is required" });
	}

	try {
		const azure = azureExtract ?? (text ? { content: text } : {});
		const items = await segmentText(azure);
		return res.status(200).json({ items });
	} catch (err) {
		console.error("[segment] ERROR:", err);
		return res.status(500).json({
			error: err instanceof Error ? err.message : "Segmentation failed",
		});
	}
}
