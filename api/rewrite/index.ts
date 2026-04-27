import type { VercelRequest, VercelResponse } from "@vercel/node";

import { callLlmWithRetryWithUsage } from "../../lib/retry/callLlmWithRetry";
import { estimateTokens } from "../../lib/rewrite/estimateTokens";
import { normalizeDocumentForRewrite } from "../../lib/rewrite/normalizeDocumentForRewrite";
import { supabaseAdmin, supabaseRest } from "../../lib/supabase";
import { rewriteRequestSchema } from "../../src/schemas/rewrite";
import type { DocType, RewriteRequest, RewriteSuggestion } from "../../src/types/rewrite";

export const runtime = "nodejs";
export const maxDuration = 60;

const REWRITE_MODEL = "llm-disabled";
const MAX_PROMPT_TOKENS = 7_500;

type RewriteErrorCode =
	| "INVALID_REQUEST"
	| "INVALID_DOC_TYPE"
	| "MISSING_ORIGINAL"
	| "NO_SUGGESTIONS_SELECTED"
	| "INVALID_SELECTED_SUGGESTION_ID"
	| "NO_ACTIONABLE_SUGGESTIONS"
	| "NO_CHANGES";

function rewriteError(
	res: VercelResponse,
	status: number,
	code: RewriteErrorCode,
	message: string,
	details?: unknown,
) {
	return res.status(status).json({
		error: message,
		code,
		message,
		...(details !== undefined ? { details } : {}),
	});
}

function buildRewritePrompt(args: {
	original: string;
	docType?: DocType;
	profileApplied?: string;
	actionableSuggestions: RewriteSuggestion[];
}) {
	const { original, docType, profileApplied, actionableSuggestions } = args;
	const docTypeLine = docType ? `Document type: ${docType}.` : "";
	const profileLine = profileApplied ? `Adapt for profile: ${profileApplied}.` : "";

	const suggestionsText = actionableSuggestions
		.map((suggestion, index) => {
			const rationale = suggestion.rationale ? ` (Reason: ${suggestion.rationale})` : "";
			return `${index + 1}. ${suggestion.instruction}${rationale}`;
		})
		.join("\n");

	return [
		"You are improving a teacher-facing document.",
		docTypeLine,
		profileLine,
		"",
		"Apply ONLY the following changes to the document:",
		suggestionsText,
		"",
		"Return JSON only with schema:",
		"{",
		"  \"rewritten\": \"string\",",
		"  \"notes\": \"brief explanation\"",
		"}",
		"",
		"Original document:",
		original,
	].join("\n");
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
	return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as { rewritten?: unknown };
}

function assertPromptWithinBudget(prompt: string) {
	const estimated = estimateTokens(prompt);
	if (estimated > MAX_PROMPT_TOKENS) {
		throw new Error(`Prompt exceeds token budget (${estimated} > ${MAX_PROMPT_TOKENS})`);
	}
}

function isNoOpRewrite(original: string, rewritten: string): boolean {
	const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
	return normalize(original) === normalize(rewritten);
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
		// Non-fatal.
	}
}

async function logRewriteEvent(params: {
	actorKey: string;
	userId: string | null;
	original: string;
	rewritten: string;
	prompt: string;
	profile: string | null;
	model: string;
	suggestionsAll: RewriteSuggestion[];
	suggestionsSelected: RewriteSuggestion[];
	suggestionsActionableSelected: RewriteSuggestion[];
	suggestionsNonActionableSelected: RewriteSuggestion[];
	validatorReport: Record<string, unknown>;
}): Promise<number | null> {
	try {
		const inserted = await supabaseRest("rewrite_events", {
			method: "POST",
			select: "id",
			prefer: "return=representation",
			body: {
				actor_key: params.actorKey,
				user_id: params.userId,
				section_id: null,
				applied_suggestions: params.suggestionsActionableSelected.map((s) => s.instruction),
				profile: params.profile,
				original: params.original,
				rewritten: params.rewritten,
				prompt: params.prompt,
				validator_report: params.validatorReport,
				model: params.model,
				suggestions_all: params.suggestionsAll,
				suggestions_selected: params.suggestionsSelected,
				suggestions_actionable_selected: params.suggestionsActionableSelected,
				suggestions_non_actionable_selected: params.suggestionsNonActionableSelected,
			},
		});
		if (Array.isArray(inserted) && inserted.length > 0) {
			return Number((inserted[0] as { id?: number }).id ?? null);
		}
		return null;
	} catch {
		return null;
	}
}

async function logTokenUsageEvent(params: {
	actorKey: string;
	userId: string | null;
	rewriteEventId?: number | null;
	stage: string;
	endpoint: string;
	model?: string;
	tokens: number;
	billed: boolean;
	metadata?: Record<string, unknown>;
}) {
	if (!Number.isFinite(params.tokens) || params.tokens <= 0) return;
	try {
		await supabaseRest("token_usage_events", {
			method: "POST",
			body: {
				actor_key: params.actorKey,
				user_id: params.userId,
				rewrite_event_id: params.rewriteEventId ?? null,
				stage: params.stage,
				endpoint: params.endpoint,
				model: params.model ?? null,
				tokens: Math.max(1, Math.round(params.tokens)),
				billed: params.billed,
				metadata: params.metadata ?? {},
			},
		});
	} catch {
		// Non-fatal.
	}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const actor = resolveActor(req);

	if (req.method === "OPTIONS") {
		return res.status(200)
			.setHeader("Access-Control-Allow-Origin", "*")
			.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
			.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-teacher-id")
			.end();
	}

	if (req.method !== "POST") {
		return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "Use POST." });
	}

	let body = req.body;
	if (typeof body === "string") {
		try {
			body = JSON.parse(body);
		} catch {
			return rewriteError(res, 422, "INVALID_REQUEST", "Invalid JSON request body.");
		}
	}

	const parseResult = rewriteRequestSchema.safeParse(body);
	if (!parseResult.success) {
		return rewriteError(
			res,
			422,
			"INVALID_REQUEST",
			parseResult.error.issues.map((issue) => issue.message).join("; "),
		);
	}

	const { original, suggestions, selectedSuggestionIds, docType, profileApplied } = parseResult.data as RewriteRequest;

	if (docType && !["assignment", "assessment", "mixed"].includes(docType)) {
		return rewriteError(
			res,
			422,
			"INVALID_DOC_TYPE",
			"Rewrite only supports assignment, assessment, or mixed documents.",
		);
	}

	if (!original || original.trim().length === 0) {
		return rewriteError(res, 422, "MISSING_ORIGINAL", "Original document text is required for rewrite.");
	}

	if (selectedSuggestionIds.length === 0) {
		return rewriteError(res, 422, "NO_SUGGESTIONS_SELECTED", "Select at least one suggestion before rewriting.");
	}

	const suggestionMap = new Map<string, RewriteSuggestion>(suggestions.map((s) => [s.id, s]));
	const selectedSuggestions: RewriteSuggestion[] = [];
	for (const id of selectedSuggestionIds) {
		const suggestion = suggestionMap.get(id);
		if (!suggestion) {
			return rewriteError(
				res,
				422,
				"INVALID_SELECTED_SUGGESTION_ID",
				`Selected suggestion id '${id}' not found.`,
			);
		}
		selectedSuggestions.push(suggestion);
	}

	const actionableSelected = selectedSuggestions.filter((suggestion) => suggestion.actionable !== false);
	if (actionableSelected.length === 0) {
		return rewriteError(
			res,
			422,
			"NO_ACTIONABLE_SUGGESTIONS",
			"Selected suggestions cannot be applied automatically.",
		);
	}

	const nonActionableSelected = selectedSuggestions.filter((suggestion) => suggestion.actionable === false);
	const normalizedOriginal = normalizeDocumentForRewrite(original);
	const validatorReport: Record<string, unknown> = {
		requestValidation: {
			valid: true,
			errors: [],
		},
		actionableSuggestions: actionableSelected.map((s) => s.instruction),
		rawSelectedSuggestions: selectedSuggestions.map((s) => s.instruction),
		profileApplied: profileApplied ?? null,
		noOp: false,
	};

	try {
		const prompt = buildRewritePrompt({
			original: normalizedOriginal,
			docType,
			profileApplied,
			actionableSuggestions: actionableSelected,
		});
		assertPromptWithinBudget(prompt);

				const llm = await callLlmWithRetryWithUsage({
			prompt,
			metadata: { runType: "rewrite" },
			options: { model: REWRITE_MODEL, temperature: 0.3, maxOutputTokens: 8192 },
		});
		const used = llm.usageMetadata?.totalTokenCount
			?? (llm.usageMetadata?.promptTokenCount ?? 0) + (llm.usageMetadata?.candidatesTokenCount ?? 0);

		const json = extractJsonObject(llm.text);
		const rewritten = typeof json.rewritten === "string" ? json.rewritten : "";

		if (!rewritten.trim()) {
			return rewriteError(res, 500, "NO_CHANGES", "Rewrite produced no changes. Check suggestions and try again.");
		}

		if (isNoOpRewrite(original, rewritten)) {
			validatorReport.noOp = true;
			await logRewriteEvent({
				actorKey: actor.actorKey,
				userId: actor.userId,
				original,
				rewritten,
				prompt,
				profile: profileApplied ?? null,
				model: REWRITE_MODEL,
				suggestionsAll: suggestions,
				suggestionsSelected: selectedSuggestions,
				suggestionsActionableSelected: actionableSelected,
				suggestionsNonActionableSelected: nonActionableSelected,
				validatorReport,
			});
			return rewriteError(
				res,
				500,
				"NO_CHANGES",
				"Rewrite produced no changes. Check suggestions and try again.",
			);
		}

		if (used > 0) {
			await incrementTokenUsage(actor.actorKey, actor.userId, used);
		}

		const rewriteEventId = await logRewriteEvent({
			actorKey: actor.actorKey,
			userId: actor.userId,
			original,
			rewritten,
			prompt,
			profile: profileApplied ?? null,
			model: REWRITE_MODEL,
			suggestionsAll: suggestions,
			suggestionsSelected: selectedSuggestions,
			suggestionsActionableSelected: actionableSelected,
			suggestionsNonActionableSelected: nonActionableSelected,
			validatorReport,
		});

		await logTokenUsageEvent({
			actorKey: actor.actorKey,
			userId: actor.userId,
			rewriteEventId,
			stage: "rewrite_original_text",
			endpoint: "/api/rewrite",
			tokens: estimateTokens(original),
			billed: false,
			metadata: { source: "request_original" },
		});

		await logTokenUsageEvent({
			actorKey: actor.actorKey,
			userId: actor.userId,
			rewriteEventId,
			stage: "rewrite_llm",
			endpoint: "/api/rewrite",
			model: REWRITE_MODEL,
			tokens: Math.max(0, used),
			billed: true,
			metadata: {
				prompt_tokens: llm.usageMetadata?.promptTokenCount ?? null,
				output_tokens: llm.usageMetadata?.candidatesTokenCount ?? null,
				total_tokens: used,
			},
		});

		const appliedSuggestionIds = actionableSelected.map((suggestion) => suggestion.id);
		const nonAppliedSuggestionIds = selectedSuggestionIds.filter((id) => !appliedSuggestionIds.includes(id));

		return res.status(200).json({
			rewritten,
			appliedSuggestionIds,
			nonAppliedSuggestionIds,
		});
	} catch (error) {
		try {
			await supabaseRest("pipeline_errors", {
				method: "POST",
				body: {
					actor_key: actor.actorKey,
					user_id: actor.userId,
					endpoint: "/api/rewrite",
					error_message: error instanceof Error ? error.message : "Rewrite failed",
					payload: {
						hasSelectedSuggestions: selectedSuggestionIds.length > 0,
						docType: docType ?? null,
					},
				},
			});
		} catch {
			// Non-fatal.
		}

		if (error instanceof Error && error.message.includes("Prompt exceeds token budget")) {
			return res.status(413).json({ error: error.message });
		}

		return res.status(500).json({
			code: "NO_CHANGES",
			message: error instanceof Error ? error.message : "Rewrite failed",
		});
	}
}
