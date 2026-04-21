/**
 * POST /api/v4/simulator/debug/segmentation
 *
 * Debug-only route.  Returns:
 *   { fullText, segmented: [{ itemNumber, text }] }
 *
 * Lets the teacher UI show a side-by-side of Azure full text vs
 * the hybrid-segmenter boundaries (no Gemini required).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseRest } from "../../../../lib/supabase";
import { buildAzureExtractFromRow, segmentText } from "../shared";

export const runtime = "nodejs";
export const maxDuration = 30;

interface DocRow {
	azure_extract: {
		content?: string;
		paragraphs?: Array<{ text?: string }>;
		pages?: Array<{ text?: string }>;
	} | null;
	canonical_document: {
		nodes?: Array<{ text?: string; normalizedText?: string; nodeType?: string }>;
		paragraphs?: Array<{ text?: string }>;
	} | null;
}

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

	const { sessionId } = (body ?? {}) as { sessionId?: string };
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	try {
		const rows = (await supabaseRest("prism_v4_documents", {
			select: "azure_extract,canonical_document",
			filters: { session_id: `eq.${sessionId}` },
		})) as DocRow[] | null;

		if (!rows || rows.length === 0) {
			return res.status(404).json({ error: "No documents found for this session." });
		}

		// Segment each doc via hybrid segmenter (no Gemini unless fallback needed).
		// Build both the combined full text (for visualizer left panel) and the
		// segmented items (for visualizer right panel).
		const fullTextParts: string[] = [];
		const segmented: Array<{ itemNumber: number; text: string }> = [];
		let itemOffset = 0;

		for (const row of rows) {
			const t = extractFullText(row);
			if (t) fullTextParts.push(t);

			const docItems = await segmentText(buildAzureExtractFromRow(row));
			for (const item of docItems) {
				segmented.push({ itemNumber: itemOffset + item.itemNumber, text: item.text });
			}
			itemOffset += docItems.length;
		}

		const fullText = fullTextParts.join("\n\n---\n\n");

		if (!fullText.trim()) {
			return res.status(422).json({ error: "No readable text found." });
		}

		return res.status(200).json({ fullText, segmented });
	} catch (err) {
		console.error("[debug/segmentation] ERROR:", err);
		return res.status(500).json({
			error: err instanceof Error ? err.message : "Internal error",
		});
	}
}

function extractFullText(row: DocRow): string {
	const nodes = row.canonical_document?.nodes;
	if (nodes && nodes.length > 0) {
		return nodes.map((n) => n.text ?? n.normalizedText ?? "").filter(Boolean).join("\n");
	}
	if (row.azure_extract?.content) return row.azure_extract.content;
	const paras = row.azure_extract?.paragraphs;
	if (paras && paras.length > 0) return paras.map((p) => p.text ?? "").filter(Boolean).join("\n");
	const pages = row.azure_extract?.pages;
	if (pages && pages.length > 0) return pages.map((p) => p.text ?? "").filter(Boolean).join("\n");
	return "";
}
