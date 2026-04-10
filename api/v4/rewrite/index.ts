import type { VercelRequest, VercelResponse } from "@vercel/node";

import { callGeminiWithRetryWithUsage } from "../../../lib/gemini/callGeminiWithRetry";
import { estimateTokens } from "../../../lib/rewrite/estimateTokens";
import { supabaseAdmin, supabaseRest } from "../../../lib/supabase";
import type { RewriteSuggestions } from "../../../src/types/simulator";
import type { RewriteSuggestion, SuggestionFilterResult } from "../../../src/types/v4/suggestions";
import { isNoOpRewrite, validateRewriteRequest } from "./rewriteValidator";
import { filterAndClassifySuggestions, validateSuggestionSelection, getActionableSelectedTexts } from "./suggestionEngine";
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
} from "./prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const REWRITE_MODEL = "gemini-2.0-flash";

type RewriteBody = {
	documentId?: string;
	sessionId?: string;
	docType?: "assignment" | "assessment" | "mixed" | "notes";
	original?: string;
	// New: flat array of suggestions (replaces nested selectedSuggestions)
	suggestions?: RewriteSuggestion[];
	selectedSuggestionIds?: string[];
	// Legacy: kept for backward compatibility, will be migrated
	selectedSuggestions?: {
		testLevel?: string[];
		itemLevel?: Record<string, string[]>;
	};
	teacherSuggestions?: string[];
	selectedItems?: number[];
	preferences?: Record<string, unknown>;
};

/**
 * Convert legacy nested suggestion format to new flat format.
 * This provides backward compatibility while migrating to the new model.
 */
function migrateLegacySuggestions(
	selectedSuggestions: RewriteBody["selectedSuggestions"],
	teacherSuggestions: string[]
): RewriteSuggestion[] {
	const result: RewriteSuggestion[] = [];

	// Migrate system test-level suggestions
	if (selectedSuggestions?.testLevel) {
		for (const text of selectedSuggestions.testLevel) {
			result.push({
				id: `legacy_tl_${result.length}`,
				scope: "testLevel" as const,
				text,
				source: "system" as const,
				actionable: true,
				selected: true,
			});
		}
	}

	// Migrate system item-level suggestions
	if (selectedSuggestions?.itemLevel) {
		for (const [itemId, texts] of Object.entries(selectedSuggestions.itemLevel)) {
			for (const text of texts) {
				result.push({
					id: `legacy_il_${result.length}`,
					scope: "itemLevel" as const,
					itemId,
					text,
					source: "system" as const,
					actionable: true,
					selected: true,
				});
			}
		}
	}

	// Migrate teacher suggestions
	for (const text of teacherSuggestions) {
		result.push({
			id: `legacy_teacher_${result.length}`,
			scope: "testLevel" as const,
			text,
			source: "teacher" as const,
			actionable: true,
			selected: true,
		});
	}

	return result;
}

/**
 * Convert new flat suggestion format back to legacy nested format.
 * This bridges the new suggestion engine with the existing prompt builders.
 * Temporary: will be removed when prompt builders are updated.
 */
function convertToLegacyRewriteSuggestions(suggestions: RewriteSuggestion[]): RewriteSuggestions {
	const testLevel: string[] = [];
	const itemLevel: Record<string, string[]> = {};

	for (const s of suggestions) {
		if (s.scope === "testLevel") {
			testLevel.push(s.text);
		} else if (s.scope === "itemLevel" && s.itemId) {
			if (!itemLevel[s.itemId]) {
				itemLevel[s.itemId] = [];
			}
			itemLevel[s.itemId].push(s.text);
		}
	}

	return { testLevel, itemLevel };
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
Apply only the selected suggestions below. If a suggestion is not listed, do not apply it.

REWRITE RULES:
- Preserve original learning objectives and correctness.
- Do not add new content.
- Do not increase difficulty unless explicitly requested.
- Keep the same number of items and item numbers.
- Keep existing structure, order, and formatting unless a selected suggestion explicitly asks for formatting changes.
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
Apply only the selected suggestions below. If a suggestion is not listed, do not apply it.

REWRITE RULES:
- Preserve meaning and correctness.
- Do not add new concepts.
- Keep structure and order unless a selected suggestion explicitly asks for a structural change.
- Do not duplicate headings or sections.
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

function buildPromptSnapshot(prompts: string[]): string {
	if (prompts.length === 0) return "";
	const joined = prompts.join("\n\n----- PROMPT SPLIT -----\n\n");
	if (joined.length <= 20_000) return joined;
	return `${joined.slice(0, 20_000)}\n\n[truncated]`;
}

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
	return estimated;
}

function getSingleHeaderValue(header: string | string[] | undefined): string {
	if (Array.isArray(header)) return header[0] ?? "";
	return header ?? "";
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveActor(req: VercelRequest): { actorKey: string; userId: string | null } {
	const forwarded = getSingleHeaderValue(req.headers["x-forwarded-for"]);
	const ip = forwarded.split(",")[0]?.trim() || "unknown";
	const claimed = getSingleHeaderValue(req.headers["x-user-id"]) || getSingleHeaderValue(req.headers["x-teacher-id"]);
	const userId = isUuid(claimed) ? claimed : null;
	return {
		actorKey: userId ?? `ip:${ip}`,
		userId,
	};
}

async function incrementTokenUsage(actorKey: string, userId: string | null, tokens: number): Promise<void> {
	if (!Number.isFinite(tokens) || tokens <= 0) return;
	try {
		const { url, key } = supabaseAdmin();
		await fetch(`${url}/rest/v1/rpc/increment_token_usage`, {
			method: "POST",
			headers: {
				apikey: key,
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				p_actor_key: actorKey,
				p_tokens: Math.max(1, Math.round(tokens)),
				p_user_id: userId,
			}),
		});
	} catch {
		// Non-fatal: metering should never block rewrite completion.
	}
}

async function logPipelineError(params: {
	actorKey: string;
	userId: string | null;
	endpoint: string;
	errorMessage: string;
	payload: Record<string, unknown>;
}): Promise<void> {
	try {
		await supabaseRest("pipeline_errors", {
			method: "POST",
			body: {
				actor_key: params.actorKey,
				user_id: params.userId,
				endpoint: params.endpoint,
				error_message: params.errorMessage,
				payload: params.payload,
			},
		});
	} catch {
		// Non-fatal: error logging should not mask rewrite failures.
	}
}

async function logRewriteEvent(params: {
	actorKey: string;
	userId: string | null;
	sectionId: string | null;
	appliedSuggestions: string[];
	profile: string | null;
	original: string;
	rewritten: string;
	prompt: string;
	validatorReport: Record<string, unknown>;
	model: string;
	suggestionsAll?: RewriteSuggestion[];
	suggestionsSelected?: RewriteSuggestion[];
	suggestionsActionableSelected?: RewriteSuggestion[];
	suggestionsNonActionableSelected?: RewriteSuggestion[];
}): Promise<number | null> {
	try {
		const inserted = await supabaseRest("rewrite_events", {
			method: "POST",
			select: "id",
			prefer: "return=representation",
			body: {
				actor_key: params.actorKey,
				user_id: params.userId,
				section_id: params.sectionId,
				applied_suggestions: params.appliedSuggestions,
				profile: params.profile,
				original: params.original,
				rewritten: params.rewritten,
				prompt: params.prompt,
				validator_report: params.validatorReport,
				model: params.model,
				suggestions_all: params.suggestionsAll ?? null,
				suggestions_selected: params.suggestionsSelected ?? null,
				suggestions_actionable_selected: params.suggestionsActionableSelected ?? null,
				suggestions_non_actionable_selected: params.suggestionsNonActionableSelected ?? null,
			},
		});
		if (Array.isArray(inserted) && inserted.length > 0) {
			return Number((inserted[0] as { id?: number }).id ?? null);
		}
		return null;
	} catch {
		// Non-fatal: rewrite itself succeeded.
		return null;
	}
}

async function logTokenUsageEvent(params: {
	actorKey: string;
	userId: string | null;
	rewriteEventId?: number | null;
	sessionId?: string;
	documentId?: string;
	stage: string;
	endpoint: string;
	model?: string;
	tokens: number;
	billed: boolean;
	metadata?: Record<string, unknown>;
}): Promise<void> {
	if (!Number.isFinite(params.tokens) || params.tokens <= 0) return;
	try {
		await supabaseRest("token_usage_events", {
			method: "POST",
			body: {
				actor_key: params.actorKey,
				user_id: params.userId,
				rewrite_event_id: params.rewriteEventId ?? null,
				session_id: params.sessionId ?? null,
				document_id: params.documentId ?? null,
				stage: params.stage,
				endpoint: params.endpoint,
				model: params.model ?? null,
				tokens: Math.max(1, Math.round(params.tokens)),
				billed: params.billed,
				metadata: params.metadata ?? {},
			},
		});
	} catch {
		// Non-fatal: event logging should not mask rewrite completion.
	}
}

function enrichRewriteResponseWithOriginals(
	json: Record<string, unknown>,
	items: V4Item[],
	sections: V4Section[],
	appliedSuggestions: string[],
	preferredItemNumbers: number[],
	profileApplied: string | null,
): Record<string, unknown> {
	const payload: Record<string, unknown> = { ...json };
	payload.appliedSuggestions = appliedSuggestions;
	if (!Array.isArray(payload.testLevel)) payload.testLevel = appliedSuggestions;
	payload.profileApplied = profileApplied;
	payload.message = "Rewrite completed";

	const preferredItemSet = new Set(preferredItemNumbers);

	if (Array.isArray(json.rewrittenItems)) {
		const rewrittenItems = json.rewrittenItems.map((entry, index) => {
			const row = entry as Record<string, unknown>;
			const itemNumber = Number(row.originalItemNumber);
			const source = items.find((item) => item.itemNumber === itemNumber) ?? items[index];
			if (!source?.stem) return row;
			return {
				...row,
				originalItemNumber: Number.isFinite(itemNumber) ? itemNumber : source.itemNumber,
				original: source.stem,
			};
		});
		payload.rewrittenItems = rewrittenItems;

		if (preferredItemSet.size > 0) {
			for (const entry of rewrittenItems) {
				const row = entry as Record<string, unknown>;
				const itemNumber = Number(row.originalItemNumber);
				if (
					preferredItemSet.has(itemNumber) &&
					typeof row.original === "string" &&
					typeof row.rewrittenStem === "string"
				) {
					payload.original = row.original;
					payload.rewritten = row.rewrittenStem;
					payload.type = "item";
					payload.id = String(itemNumber);
					break;
				}
			}
		}

		const first = rewrittenItems[0] as Record<string, unknown> | undefined;
		if (
			typeof payload.original !== "string" &&
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

	if (Array.isArray(json.items)) {
		const rewrittenItems = json.items.map((entry, index) => {
			const row = entry as Record<string, unknown>;
			const itemNumber = Number(row.itemNumber);
			const source = items.find((item) => item.itemNumber === itemNumber) ?? items[index];
			if (!source?.stem) return row;
			return {
				...row,
				itemNumber: Number.isFinite(itemNumber) ? itemNumber : source.itemNumber,
				original: source.stem,
			};
		});
		payload.items = rewrittenItems;

		if (preferredItemSet.size > 0 && typeof payload.original !== "string") {
			for (const entry of rewrittenItems) {
				const row = entry as Record<string, unknown>;
				const itemNumber = Number(row.itemNumber);
				if (
					preferredItemSet.has(itemNumber) &&
					typeof row.original === "string" &&
					typeof row.rewrittenStem === "string"
				) {
					payload.original = row.original;
					payload.rewritten = row.rewrittenStem;
					payload.type = "item";
					payload.id = String(itemNumber);
					break;
				}
			}
		}

		const first = rewrittenItems[0] as Record<string, unknown> | undefined;
		if (
			typeof payload.original !== "string" &&
			typeof first?.original === "string" &&
			typeof first?.rewrittenStem === "string" &&
			typeof first?.itemNumber !== "undefined"
		) {
			payload.original = first.original;
			payload.rewritten = first.rewrittenStem;
			payload.type = "item";
			payload.id = String(first.itemNumber);
		}
	}

	if (Array.isArray(json.sections)) {
		const rewrittenSections = json.sections.map((entry, index) => {
			const row = entry as Record<string, unknown>;
			const sectionId = String(row.sectionId ?? "");
			const source = sections.find((section) => section.sectionId === sectionId) ?? sections[index];
			if (!source?.text) return row;
			return {
				...row,
				sectionId: source.sectionId,
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
	const actor = resolveActor(req);
	let meteredTokens = 0;
	const promptHistory: string[] = [];
	const llmTokenEvents: Array<{
		stage: string;
		tokens: number;
		metadata: Record<string, unknown>;
	}> = [];
	const validatorReport: Record<string, unknown> = {
		requestValidation: null,
		actionableSuggestions: [],
		rawSelectedSuggestions: [],
		profileApplied: null,
		noOp: false,
	};

	if (req.method === "OPTIONS") {
		return res.status(200)
			.setHeader("Access-Control-Allow-Origin", "*")
			.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
			.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-teacher-id")
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
		docType,
		suggestions = [],
		selectedSuggestionIds = [],
		selectedSuggestions,
		teacherSuggestions = [],
		selectedItems = [],
		preferences = {},
	} = (body ?? {}) as RewriteBody;

	if (docType === "notes") {
		return res.status(400).json({
			error: "Rewrite is not supported for notes documents.",
			details: "This document appears to be notes. Analysis is available, but rewriting is only supported for assignments and assessments.",
		});
	}

	// NEW: Filter and classify suggestions server-side
	let suggestionFilter: SuggestionFilterResult = {
		allSuggestions: [],
		selectedSuggestions: [],
		actionableSelected: [],
		nonActionableSelected: [],
		systemSuggestions: [],
		teacherSuggestions: [],
	};

	if (suggestions && suggestions.length > 0) {
		try {
			const selectedIdSet = new Set(selectedSuggestionIds);
			const suggestionsWithSelection = selectedSuggestionIds.length > 0
				? suggestions.map((s) => ({ ...s, selected: selectedIdSet.has(s.id) }))
				: suggestions;
			suggestionFilter = filterAndClassifySuggestions(suggestionsWithSelection);
		} catch (err) {
			return res.status(400).json({
				error: "Invalid suggestion structure",
				details: err instanceof Error ? err.message : "Unknown error",
			});
		}

		// Validate that we have actionable selections
		const suggestionValidation = validateSuggestionSelection(suggestionFilter);
		if (!suggestionValidation.valid) {
			return res.status(400).json({
				error: "No actionable suggestions selected",
				details: suggestionValidation.errors,
				suggestions: {
					selected: suggestionFilter.selectedSuggestions,
					nonActionable: suggestionFilter.nonActionableSelected,
				},
			});
		}
	}

	// Support both new and legacy suggestion formats
	// If using legacy format, migrate to new format for unified processing
	if (!suggestions || suggestions.length === 0) {
		if (selectedSuggestions) {
			const legacySuggestions = migrateLegacySuggestions(selectedSuggestions, teacherSuggestions);
			suggestionFilter = filterAndClassifySuggestions(legacySuggestions);
		} else {
			// Neither new nor legacy format provided
			return res.status(400).json({
				error: "No suggestions provided",
				details: "Supply either 'suggestions' (new format) or 'selectedSuggestions' (legacy format)",
			});
		}
	}

	// At this point, suggestionFilter is guaranteed to be set
	const appliedSuggestions = getActionableSelectedTexts(suggestionFilter);
	const rawSelectedSuggestions = suggestionFilter.selectedSuggestions.map((s) => s.text);

	// Convert to legacy format for backward compatibility with prompt builders
	const mergedSuggestions = convertToLegacyRewriteSuggestions(suggestionFilter.actionableSelected);
	const actionableTeacherSuggestions = suggestionFilter.teacherSuggestions
		.filter((s) => s.actionable)
		.map((s) => s.text);

	validatorReport.actionableSuggestions = appliedSuggestions;
	validatorReport.rawSelectedSuggestions = rawSelectedSuggestions;
	validatorReport.profileApplied = typeof preferences?.profile === "string" ? preferences.profile : null;

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

		const sourceForValidation =
			sections.map((section) => section.text).join("\n\n").trim() ||
			items.map((item) => item.stem).join("\n\n").trim();
		const validation = validateRewriteRequest({
			original: sourceForValidation,
			appliedSuggestions: rawSelectedSuggestions,
			actionableSuggestions: appliedSuggestions,
			profileApplied: preferences?.profile,
		});
		validatorReport.requestValidation = validation;
		if (!validation.valid) {
			return res.status(400).json({
				error: "Rewrite validation failed",
				details: validation.errors,
			});
		}

		if (doc?.doc_type === "notes" || (!doc?.doc_type && sections.length > 0 && items.length === 0)) {
			return res.status(400).json({
				error: "Rewrite is not supported for notes documents.",
				details: "This document appears to be notes. Analysis is available, but rewriting is only supported for assignments and assessments.",
			});
		} else if (doc?.doc_type === "mixed" || (!doc?.doc_type && sections.length > 0 && items.length > 0)) {
			prompt = buildMixedRewritePrompt({
				items,
				sections,
				selectedSuggestions: {
					testLevel: mergedSuggestions.testLevel,
					itemLevel: toNumericItemLevel(mergedSuggestions.itemLevel),
				},
				teacherSuggestions: actionableTeacherSuggestions,
				selectedItems,
				preferences,
			});
			assertPromptWithinBudget(prompt);
			promptHistory.push(prompt);
			const llm = await callGeminiWithRetryWithUsage({
				prompt,
				metadata: { runType: "rewrite", documentId: persistenceDocumentId, sessionId },
				options: { model: REWRITE_MODEL, temperature: 0.3, maxOutputTokens: 8192 },
			});
			const used = llm.usageMetadata?.totalTokenCount
				?? (llm.usageMetadata?.promptTokenCount ?? 0) + (llm.usageMetadata?.candidatesTokenCount ?? 0);
			meteredTokens += Math.max(0, used);
			llmTokenEvents.push({
				stage: "rewrite_llm_mixed",
				tokens: Math.max(0, used),
				metadata: {
					prompt_tokens: llm.usageMetadata?.promptTokenCount ?? null,
					output_tokens: llm.usageMetadata?.candidatesTokenCount ?? null,
					total_tokens: used,
				},
			});
			responseJson = extractJsonObject(llm.text);
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
				promptHistory.push(prompt);
				const llm = await callGeminiWithRetryWithUsage({
					prompt,
					metadata: {
						runType: "rewrite",
						documentId: persistenceDocumentId,
						sessionId,
						batchIndex: index,
						batchCount: batches.length,
					},
					options: { model: REWRITE_MODEL, temperature: 0.3, maxOutputTokens: 4096 },
				});
				const used = llm.usageMetadata?.totalTokenCount
					?? (llm.usageMetadata?.promptTokenCount ?? 0) + (llm.usageMetadata?.candidatesTokenCount ?? 0);
				meteredTokens += Math.max(0, used);
				llmTokenEvents.push({
					stage: "rewrite_llm_batch",
					tokens: Math.max(0, used),
					metadata: {
						batch_index: index,
						batch_count: batches.length,
						prompt_tokens: llm.usageMetadata?.promptTokenCount ?? null,
						output_tokens: llm.usageMetadata?.candidatesTokenCount ?? null,
						total_tokens: used,
					},
				});
				const json = extractJsonObject(llm.text) as { rewrittenItems?: Array<Record<string, unknown>> };
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
		const validation = validateRewriteRequest({
			original: text,
			appliedSuggestions: rawSelectedSuggestions,
			actionableSuggestions: appliedSuggestions,
			profileApplied: preferences?.profile,
		});
		validatorReport.requestValidation = validation;
		if (!validation.valid) {
			return res.status(400).json({
				error: "Rewrite validation failed",
				details: validation.errors,
			});
		}
		prompt = buildTextRewritePrompt(text, docCount, mergedSuggestions, preferences);
		assertPromptWithinBudget(prompt);
		promptHistory.push(prompt);
		const llm = await callGeminiWithRetryWithUsage({
			prompt,
			metadata: { runType: "rewrite", documentId: persistenceDocumentId, sessionId },
			options: { model: REWRITE_MODEL, temperature: 0.3, maxOutputTokens: 8192 },
		});
		const used = llm.usageMetadata?.totalTokenCount
			?? (llm.usageMetadata?.promptTokenCount ?? 0) + (llm.usageMetadata?.candidatesTokenCount ?? 0);
		meteredTokens += Math.max(0, used);
		llmTokenEvents.push({
			stage: "rewrite_llm_session",
			tokens: Math.max(0, used),
			metadata: {
				prompt_tokens: llm.usageMetadata?.promptTokenCount ?? null,
				output_tokens: llm.usageMetadata?.candidatesTokenCount ?? null,
				total_tokens: used,
			},
		});
		responseJson = extractJsonObject(llm.text);
	}

		const json = responseJson;
		if (!json) {
			return res.status(500).json({ error: "Rewrite failed: no response payload generated." });
		}
		const enrichedJson = enrichRewriteResponseWithOriginals(
			json,
			sourceItems,
			sourceSections,
			appliedSuggestions,
			Object.keys(mergedSuggestions.itemLevel)
				.map(Number)
				.filter((value) => Number.isFinite(value)),
			typeof preferences?.profile === "string" ? preferences.profile : null,
		);
		const promptSnapshot = buildPromptSnapshot(promptHistory);
		const isNoOp =
			typeof enrichedJson.original === "string" &&
			typeof enrichedJson.rewritten === "string" &&
			isNoOpRewrite(enrichedJson.original, enrichedJson.rewritten);
		validatorReport.noOp = isNoOp;
		if (isNoOp) {
			// Log the failed event before returning so admin can inspect
			await logRewriteEvent({
				actorKey: actor.actorKey,
				userId: actor.userId,
				sectionId: typeof enrichedJson.id === "string" ? enrichedJson.id : null,
				appliedSuggestions: appliedSuggestions,
				profile: typeof preferences?.profile === "string" ? preferences.profile : null,
				original: enrichedJson.original as string,
				rewritten: enrichedJson.rewritten as string,
				prompt: buildPromptSnapshot(promptHistory),
				validatorReport,
				model: REWRITE_MODEL,
				suggestionsAll: suggestionFilter.allSuggestions,
				suggestionsSelected: suggestionFilter.selectedSuggestions,
				suggestionsActionableSelected: suggestionFilter.actionableSelected,
				suggestionsNonActionableSelected: suggestionFilter.nonActionableSelected,
			}).catch(() => {});
			return res.status(500).json({
				error: "Rewrite failed: no changes applied",
				details: {
					message: "The model returned the original text unchanged. The selected suggestions may not apply to this specific content.",
					actionableSelected: suggestionFilter.actionableSelected.map((s) => s.text),
					nonActionableSelected: suggestionFilter.nonActionableSelected.map((s) => s.text),
					selectedSuggestions: suggestionFilter.selectedSuggestions.map((s) => s.text),
				},
			});
		}
		if (meteredTokens > 0) {
			await incrementTokenUsage(actor.actorKey, actor.userId, meteredTokens);
		}

		let rewriteEventId: number | null = null;
		if (typeof enrichedJson.original === "string" && typeof enrichedJson.rewritten === "string") {
			rewriteEventId = await logRewriteEvent({
				actorKey: actor.actorKey,
				userId: actor.userId,
				sectionId: typeof enrichedJson.id === "string" ? enrichedJson.id : null,
				appliedSuggestions: Array.isArray(enrichedJson.appliedSuggestions)
					? (enrichedJson.appliedSuggestions as string[])
					: appliedSuggestions,
				profile: typeof preferences?.profile === "string" ? preferences.profile : null,
				original: enrichedJson.original,
				rewritten: enrichedJson.rewritten,
				prompt: promptSnapshot,
				validatorReport,
				model: REWRITE_MODEL,
				suggestionsAll: suggestionFilter.allSuggestions,
				suggestionsSelected: suggestionFilter.selectedSuggestions,
				suggestionsActionableSelected: suggestionFilter.actionableSelected,
				suggestionsNonActionableSelected: suggestionFilter.nonActionableSelected,
			});
		}

		const originalTokenEstimate =
			typeof enrichedJson.original === "string"
				? estimateTokens(enrichedJson.original)
				: 0;
		if (originalTokenEstimate > 0) {
			await logTokenUsageEvent({
				actorKey: actor.actorKey,
				userId: actor.userId,
				rewriteEventId,
				sessionId,
				documentId: persistenceDocumentId,
				stage: "rewrite_original_text",
				endpoint: "/api/v4/rewrite",
				tokens: originalTokenEstimate,
				billed: false,
				metadata: {
					source: "enriched_original",
				},
			});
		}

		for (const event of llmTokenEvents) {
			await logTokenUsageEvent({
				actorKey: actor.actorKey,
				userId: actor.userId,
				rewriteEventId,
				sessionId,
				documentId: persistenceDocumentId,
				stage: event.stage,
				endpoint: "/api/v4/rewrite",
				model: REWRITE_MODEL,
				tokens: event.tokens,
				billed: true,
				metadata: event.metadata,
			});
		}

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

		// Enrich response with suggestion tracking information
		const responseWithSuggestions = {
			...enrichedJson,
			suggestions: {
				allSuggestions: suggestionFilter.allSuggestions,
				selectedSuggestions: suggestionFilter.selectedSuggestions,
				actionableSelectedSuggestions: suggestionFilter.actionableSelected,
				nonActionableSelectedSuggestions: suggestionFilter.nonActionableSelected,
			},
		};

		return res.status(200).json(responseWithSuggestions);
	} catch (err) {
		await logPipelineError({
			actorKey: actor.actorKey,
			userId: actor.userId,
			endpoint: "/api/v4/rewrite",
			errorMessage: err instanceof Error ? err.message : "Rewrite failed",
			payload: {
				documentId: typeof documentId === "string" ? documentId : null,
				sessionId: typeof sessionId === "string" ? sessionId : null,
				hasSelectedSuggestions: Boolean(selectedSuggestions),
				validatorReport,
				promptCount: promptHistory.length,
			},
		});
		if (err instanceof Error && err.message.includes("Prompt exceeds token budget")) {
			return res.status(413).json({ error: err.message });
		}
		console.error("[rewrite] error:", err);
		return res.status(500).json({ error: err instanceof Error ? err.message : "Rewrite failed" });
	}
}
