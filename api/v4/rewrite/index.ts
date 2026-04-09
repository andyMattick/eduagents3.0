import type { VercelRequest, VercelResponse } from "@vercel/node";

import { callLLM } from "../../../lib/llm";
import { supabaseRest } from "../../../lib/supabase";
import type { RewriteSuggestions } from "../../../src/types/simulator";
import {
	fetchSessionText,
	getDocument,
	getItemsForDocument,
	getSectionsForDocument,
	type V4Item,
} from "../simulator/shared";
import {
	buildMixedRewritePrompt,
	buildNotesRewritePrompt,
} from "./prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

type RewriteBody = {
	documentId?: string;
	sessionId?: string;
	selectedSuggestions?: {
		testLevel?: string[];
		itemLevel?: Record<string, string[]>;
	};
	teacherSuggestions?: string[];
	selectedItems?: number[];
	preferences?: Record<string, unknown>;
};

function normalizeSuggestions(
	selectedSuggestions: RewriteBody["selectedSuggestions"],
	teacherSuggestions: string[],
): RewriteSuggestions {
	return {
		testLevel: [
			...(selectedSuggestions?.testLevel ?? []),
			...teacherSuggestions,
		],
		itemLevel: selectedSuggestions?.itemLevel ?? {},
	};
}

function toNumericItemLevel(itemLevel: Record<string, string[]>) {
	const out: Record<number, string[]> = {};
	for (const [key, value] of Object.entries(itemLevel)) {
		const parsed = Number(key);
		if (!Number.isNaN(parsed)) {
			out[parsed] = value;
		}
	}
	return out;
}

function buildItemRewritePrompt(
	items: V4Item[],
	suggestions: RewriteSuggestions,
	preferences: Record<string, unknown>,
): string {
	const itemNums = new Set(Object.keys(suggestions.itemLevel).map(Number));
	const relevantItems = itemNums.size > 0
		? items.filter((it) => itemNums.has(it.itemNumber))
		: items;

	return `You are an instructional rewrite engine for teachers.
Improve assessment items using only the provided rewrite suggestions.

REWRITE RULES:
- Preserve original learning objectives and correctness.
- Do not add new content.
- Do not increase difficulty unless explicitly requested.
- Output JSON only, no markdown/code fences.

OUTPUT SCHEMA:
{
  "rewrittenItems": [
    {
      "originalItemNumber": number,
      "rewrittenStem": "string",
      "rewrittenParts": ["optional strings"],
      "notes": "brief explanation"
    }
  ]
}

ITEMS:
${JSON.stringify(relevantItems, null, 2)}

SUGGESTIONS:
${JSON.stringify(suggestions, null, 2)}

PREFERENCES:
${JSON.stringify(preferences, null, 2)}

Return only the JSON object.`;
}

function buildTextRewritePrompt(
	text: string,
	docCount: number,
	suggestions: RewriteSuggestions,
	preferences: Record<string, unknown>,
): string {
	return `You are an assessment rewrite engine for teachers.

Below is source material from ${docCount} document${docCount === 1 ? "" : "s"}.
Apply rewrite suggestions conservatively.

REWRITE RULES:
- Preserve meaning and correctness.
- Do not add new concepts.
- Output JSON only.

OUTPUT SCHEMA:
{
  "rewrittenItems": [
    {
      "originalItemNumber": number,
      "rewrittenStem": "string",
      "rewrittenParts": ["optional strings"],
      "notes": "brief explanation"
    }
  ]
}

DOCUMENT:
${text.substring(0, 8000)}

SUGGESTIONS:
${JSON.stringify(suggestions, null, 2)}

PREFERENCES:
${JSON.stringify(preferences ?? {}, null, 2)}

Return only the JSON object.`;
}

function extractJsonObject(raw: string) {
	const cleaned = raw
		.replace(/```(?:json)?\s*\n?/gi, "")
		.replace(/```\s*/g, "");
	const firstBrace = cleaned.indexOf("{");
	const lastBrace = cleaned.lastIndexOf("}");
	if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
		throw new Error("Rewrite failed: could not extract JSON from response");
	}
	return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "OPTIONS") {
		return res.status(200)
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

	const {
		documentId,
		sessionId,
		selectedSuggestions,
		teacherSuggestions = [],
		selectedItems = [],
		preferences = {},
	} = (body ?? {}) as RewriteBody;

	if (!sessionId && !documentId) {
		return res.status(400).json({ error: "documentId or sessionId is required" });
	}
	if (!selectedSuggestions) {
		return res.status(400).json({ error: "selectedSuggestions are required" });
	}

	const mergedSuggestions = normalizeSuggestions(selectedSuggestions, teacherSuggestions);

	let prompt: string;
	let persistenceDocumentId: string | undefined = documentId;

	if (documentId) {
		const [doc, items, sections] = await Promise.all([
			getDocument(documentId),
			getItemsForDocument(documentId),
			getSectionsForDocument(documentId),
		]);

		if (!items.length && !sections.length) {
			return res.status(422).json({ error: "No stored items or sections found for this document." });
		}

		if (doc?.doc_type === "notes" || (!doc?.doc_type && sections.length > 0 && items.length === 0)) {
			prompt = buildNotesRewritePrompt({
				sections,
				selectedSuggestions: {
					testLevel: mergedSuggestions.testLevel,
					itemLevel: toNumericItemLevel(mergedSuggestions.itemLevel),
				},
				teacherSuggestions,
				preferences,
			});
		} else if (doc?.doc_type === "mixed" || (!doc?.doc_type && sections.length > 0 && items.length > 0)) {
			prompt = buildMixedRewritePrompt({
				items,
				sections,
				selectedSuggestions: {
					testLevel: mergedSuggestions.testLevel,
					itemLevel: toNumericItemLevel(mergedSuggestions.itemLevel),
				},
				teacherSuggestions,
				selectedItems,
				preferences,
			});
		} else {
			prompt = buildItemRewritePrompt(items, mergedSuggestions, preferences);
		}
	} else {
		const { text, docCount } = await fetchSessionText(sessionId!);
		if (!text) {
			return res.status(422).json({ error: "No document text found for this session." });
		}
		prompt = buildTextRewritePrompt(text, docCount, mergedSuggestions, preferences);
	}

	try {
		const raw = await callLLM({
			prompt,
			metadata: { runType: "rewrite", documentId: persistenceDocumentId, sessionId },
			options: { temperature: 0.3, maxOutputTokens: 8192 },
		});

		const json = extractJsonObject(raw);

		if (persistenceDocumentId) {
			supabaseRest("v4_rewrite_runs", {
				method: "POST",
				body: {
					document_id: persistenceDocumentId,
					rewritten_items: json.rewrittenItems ?? null,
					metadata: {
						hasSections: Array.isArray(json.sections),
						hasItems: Array.isArray(json.items) || Array.isArray(json.rewrittenItems),
					},
				},
			}).catch(() => {});
		}

		return res.status(200).json(json);
	} catch (err) {
		console.error("[rewrite] error:", err);
		return res.status(500).json({ error: err instanceof Error ? err.message : "Rewrite failed" });
	}
}
