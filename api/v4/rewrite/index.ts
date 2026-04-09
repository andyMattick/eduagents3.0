import type { VercelRequest, VercelResponse } from "@vercel/node";

import { callGeminiWithRetry } from "../../../lib/gemini/callGeminiWithRetry";
import { estimateTokens } from "../../../lib/rewrite/estimateTokens";
import { supabaseRest } from "../../../lib/supabase";
import type { RewriteSuggestions } from "../../../src/types/simulator";
import {
	fetchSessionText,
	getDocument,
	getItemsForDocument,
	getSectionsForDocument,
	type V4Item,
	type V4Section,
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

const MAX_PROMPT_TOKENS = 7_500;
const ITEM_BATCH_SIZE = 12;

function chunkArray<T>(values: T[], size: number): T[][] {
	if (!values.length) return [];
	const out: T[][] = [];
	for (let i = 0; i < values.length; i += size) {
		out.push(values.slice(i, i + size));
	}
	return out;
}

function slimItemLevel(
	itemLevel: Record<string, string[]>,
	allowedItemNumbers: number[],
): Record<string, string[]> {
	const allowed = new Set(allowedItemNumbers.map(String));
	const reduced: Record<string, string[]> = {};
	for (const [key, value] of Object.entries(itemLevel)) {
		if (allowed.has(key)) reduced[key] = value;
	}
	return reduced;
}

function assertPromptWithinBudget(prompt: string) {
	const estimated = estimateTokens(prompt);
	if (estimated > MAX_PROMPT_TOKENS) {
		throw new Error(`Prompt exceeds token budget (${estimated} > ${MAX_PROMPT_TOKENS})`);
	}
}

function enrichRewriteResponseWithOriginals(
	json: Record<string, unknown>,
	items: V4Item[],
	sections: V4Section[],
): Record<string, unknown> {
	const payload: Record<string, unknown> = { ...json };

	if (Array.isArray(json.rewrittenItems)) {
		const rewrittenItems = json.rewrittenItems.map((entry) => {
			const row = entry as Record<string, unknown>;
			const itemNumber = Number(row.originalItemNumber);
			const source = items.find((item) => item.itemNumber === itemNumber);
			if (!source?.stem) return row;
			return {
				...row,
				original: source.stem,
			};
		});
		payload.rewrittenItems = rewrittenItems;

		const first = rewrittenItems[0] as Record<string, unknown> | undefined;
		if (
			typeof first?.original === "string" &&
			typeof first?.rewrittenStem === "string" &&
			typeof first?.originalItemNumber !== "undefined"
		) {
			payload.original = first.original;
			payload.rewritten = first.rewrittenStem;
			payload.type = "item";
			payload.id = String(first.originalItemNumber);
		}
	}

	if (Array.isArray(json.sections)) {
		const rewrittenSections = json.sections.map((entry) => {
			const row = entry as Record<string, unknown>;
			const sectionId = String(row.sectionId ?? "");
			const source = sections.find((section) => section.sectionId === sectionId);
			if (!source?.text) return row;
			return {
				...row,
				original: source.text,
			};
		});
		payload.sections = rewrittenSections;

		const first = rewrittenSections[0] as Record<string, unknown> | undefined;
		if (
			typeof payload.original !== "string" &&
			typeof first?.original === "string" &&
			typeof first?.rewrittenText === "string" &&
			typeof first?.sectionId === "string"
		) {
			payload.original = first.original;
			payload.rewritten = first.rewrittenText;
			payload.type = "section";
			payload.id = first.sectionId;
		}
	}

	return payload;
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

	try {

	let prompt: string;
	let persistenceDocumentId: string | undefined = documentId;
	let responseJson: Record<string, unknown> | null = null;
	let sourceItems: V4Item[] = [];
	let sourceSections: V4Section[] = [];

	if (documentId) {
		const [doc, items, sections] = await Promise.all([
			getDocument(documentId),
			getItemsForDocument(documentId),
			getSectionsForDocument(documentId),
		]);
		sourceItems = items;
		sourceSections = sections;

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
			assertPromptWithinBudget(prompt);
			const raw = await callGeminiWithRetry({
				prompt,
				metadata: { runType: "rewrite", documentId: persistenceDocumentId, sessionId },
				options: { temperature: 0.3, maxOutputTokens: 8192 },
			});
			responseJson = extractJsonObject(raw);
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
			assertPromptWithinBudget(prompt);
			const raw = await callGeminiWithRetry({
				prompt,
				metadata: { runType: "rewrite", documentId: persistenceDocumentId, sessionId },
				options: { temperature: 0.3, maxOutputTokens: 8192 },
			});
			responseJson = extractJsonObject(raw);
		} else {
			const requested = Object.keys(mergedSuggestions.itemLevel).map(Number).filter((n) => !Number.isNaN(n));
			const scopedItems = requested.length > 0
				? items.filter((item) => requested.includes(item.itemNumber))
				: items;

			const batches = chunkArray(scopedItems, ITEM_BATCH_SIZE);
			const rewrittenItems: Array<Record<string, unknown>> = [];
			for (let index = 0; index < batches.length; index++) {
				const batch = batches[index];
				const batchItemNumbers = batch.map((item) => item.itemNumber);
				const batchSuggestions = {
					testLevel: index === 0 ? mergedSuggestions.testLevel : [],
					itemLevel: slimItemLevel(mergedSuggestions.itemLevel, batchItemNumbers),
				};

				prompt = buildItemRewritePrompt(batch, batchSuggestions, preferences);
				assertPromptWithinBudget(prompt);
				const raw = await callGeminiWithRetry({
					prompt,
					metadata: {
						runType: "rewrite",
						documentId: persistenceDocumentId,
						sessionId,
						batchIndex: index,
						batchCount: batches.length,
					},
					options: { temperature: 0.3, maxOutputTokens: 4096 },
				});
				const json = extractJsonObject(raw) as { rewrittenItems?: Array<Record<string, unknown>> };
				if (Array.isArray(json.rewrittenItems)) {
					rewrittenItems.push(...json.rewrittenItems);
				}
			}

			responseJson = {
				rewrittenItems,
				testLevel: mergedSuggestions.testLevel,
				metadata: {
					batched: true,
					batchSize: ITEM_BATCH_SIZE,
					batchCount: batches.length,
				},
			};
		}
	} else {
		const { text, docCount } = await fetchSessionText(sessionId!);
		if (!text) {
			return res.status(422).json({ error: "No document text found for this session." });
		}
		prompt = buildTextRewritePrompt(text, docCount, mergedSuggestions, preferences);
		assertPromptWithinBudget(prompt);
		const raw = await callGeminiWithRetry({
			prompt,
			metadata: { runType: "rewrite", documentId: persistenceDocumentId, sessionId },
			options: { temperature: 0.3, maxOutputTokens: 8192 },
		});
		responseJson = extractJsonObject(raw);
	}

		const json = responseJson;
		if (!json) {
			return res.status(500).json({ error: "Rewrite failed: no response payload generated." });
		}
		const enrichedJson = enrichRewriteResponseWithOriginals(json, sourceItems, sourceSections);

		if (persistenceDocumentId) {
			supabaseRest("v4_rewrite_runs", {
				method: "POST",
				body: {
					document_id: persistenceDocumentId,
					rewritten_items: (enrichedJson as { rewrittenItems?: unknown }).rewrittenItems ?? null,
					metadata: {
						hasSections: Array.isArray((enrichedJson as { sections?: unknown[] }).sections),
						hasItems:
							Array.isArray((enrichedJson as { items?: unknown[] }).items) ||
							Array.isArray((enrichedJson as { rewrittenItems?: unknown[] }).rewrittenItems),
					},
				},
			}).catch(() => {});
		}

		return res.status(200).json(enrichedJson);
	} catch (err) {
		if (err instanceof Error && err.message.includes("Prompt exceeds token budget")) {
			return res.status(413).json({ error: err.message });
		}
		console.error("[rewrite] error:", err);
		return res.status(500).json({ error: err instanceof Error ? err.message : "Rewrite failed" });
	}
}
