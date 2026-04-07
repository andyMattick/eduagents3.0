/**
 * /api/v4/studio/generate-items — LLM-powered assessment item generator
 *
 * Accepts a structured generation request and returns `AssessmentItem[]`.
 * Prompts are fully server-side; callers pass params, not raw prompt text.
 *
 * Falls back gracefully to placeholder items when Gemini is unavailable or
 * returns unparseable output.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGemini } from "../../../lib/gemini";
import type { AssessmentItem, DifficultyLevel, ItemType } from "../../../src/components_new/v4/assessment/assessmentTypes";
import { SYSTEM_PROMPT, ITEM_TYPE_GUIDELINES } from "../../../src/components_new/v4/assessment/promptLibrary";
import { pickScenario } from "../../../src/components_new/v4/assessment/scenarioStyles";
import { difficultyToTime } from "../../../src/components_new/v4/assessment/difficultyRules";
import { allowedTypesForConcept } from "../../../src/components_new/v4/assessment/itemTypeMapping";
import { computeStepCount } from "../../../src/components_new/v4/steps/stepEngine";
import type { CanonicalConcept } from "../../../src/components_new/v4/domain/domainTypes";

export const runtime = "nodejs";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── Prompt templates are imported from promptLibrary.ts ─────────────────────

function buildUserPrompt(params: GenerateItemsRequest): string {
	const { conceptId, canonical, type, difficulty, count } = params;
	const typeGuideline = ITEM_TYPE_GUIDELINES[type] ?? "";
	const label = canonical?.label ?? conceptId;
	const description = canonical?.description ?? "";
	const prereqs = canonical?.prerequisites?.join(", ") ?? "";
	const misconceptions = canonical?.misconceptions?.join(", ") ?? "";
	const scenarioStyle = pickScenario(canonical?.subject, `${conceptId}__${type}`);
	const estimatedTime = difficultyToTime(type, difficulty);

	// Pre-generation step estimate using concept description as problem-text proxy
	const concept = toCanonicalConcept(canonical, conceptId);
	const targetSteps = computeStepCount(concept, {
		conceptId: concept.id,
		difficulty,
		scenarioComplexity: "medium",
		learnerProfile: "core",
		problemText: description,
	});

	return `\
${typeGuideline}

Generate ${count} assessment item${count === 1 ? "" : "s"}.

Concept:
- ID: ${conceptId}
- Canonical Label: ${label}
${description ? `- Description: ${description}` : ""}
${prereqs ? `- Prerequisites: ${prereqs}` : ""}
${misconceptions ? `- Common Misconceptions: ${misconceptions}` : ""}

Item Requirements:
- Item Type: ${type}
- Difficulty: ${difficulty}
- Scenario Style: ${scenarioStyle}
- Solution Steps: aim for ${targetSteps} step${targetSteps === 1 ? "" : "s"} in the answer key

Output Format — a JSON array where every element matches this shape:
{
  "stem": "...",
  "type": "${type}",
  ${type === "mc" ? '"options": ["A...", "B...", "C...", "D..."],' : ""}
  "correctAnswer": "...",
  "rationale": "...",
  "concepts": ["${canonical?.id ?? conceptId}"],
  "difficulty": "${difficulty}",
  "estimatedTimeSeconds": ${estimatedTime}
}`;
}

// ── Request/response types ────────────────────────────────────────────────────

interface CanonicalInfo {
	id: string;
	label: string;
	description?: string;
	subject?: string;
	prerequisites: string[];
	misconceptions?: string[];
	typicalStepRange?: [number, number];
}

function toCanonicalConcept(canonical: CanonicalInfo | undefined, conceptId: string): CanonicalConcept {
	return {
		id: canonical?.id ?? conceptId,
		label: canonical?.label ?? conceptId,
		description: canonical?.description,
		subject: canonical?.subject ?? "general",
		prerequisites: canonical?.prerequisites ?? [],
		misconceptions: canonical?.misconceptions,
		typicalStepRange: canonical?.typicalStepRange,
	};
}

interface GenerateItemsRequest {
	conceptId: string;
	canonical?: CanonicalInfo;
	type: ItemType;
	difficulty: DifficultyLevel;
	count: number;
}

// ── JSON parse helpers ────────────────────────────────────────────────────────

function stripFences(raw: string): string {
	return raw
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();
}

function isValidItemType(v: unknown): v is ItemType {
	return v === "mc" || v === "short_answer" || v === "frq";
}

function isValidDifficulty(v: unknown): v is DifficultyLevel {
	return v === "easy" || v === "medium" || v === "hard";
}

function parseItems(
	raw: string,
	params: GenerateItemsRequest,
): AssessmentItem[] {
	const cleaned = stripFences(raw);
	const parsed = JSON.parse(cleaned) as unknown[];

	if (!Array.isArray(parsed)) throw new Error("LLM response is not a JSON array");

	return parsed.map((item, idx) => {
		const obj = item as Record<string, unknown>;
		const type = isValidItemType(obj.type) ? obj.type : params.type;
		const difficulty = isValidDifficulty(obj.difficulty) ? obj.difficulty : params.difficulty;

		return {
			id: `${params.conceptId}__${type}__${difficulty}__${idx}`,
			stem: typeof obj.stem === "string" && obj.stem.trim() ? obj.stem.trim() : `Question ${idx + 1}`,
			type,
			...(type === "mc" && Array.isArray(obj.options) ? { options: obj.options as string[] } : {}),
			correctAnswer: typeof obj.correctAnswer === "string" ? obj.correctAnswer : "",
			rationale: typeof obj.rationale === "string" ? obj.rationale : undefined,
			concepts: Array.isArray(obj.concepts)
				? (obj.concepts as string[])
				: [params.canonical?.id ?? params.conceptId],
			difficulty,
			estimatedTimeSeconds:
				typeof obj.estimatedTimeSeconds === "number"
					? obj.estimatedTimeSeconds
					: difficultyToTime(type, difficulty),
		};
	});
}

function placeholderItems(params: GenerateItemsRequest): AssessmentItem[] {
	return Array.from({ length: params.count }, (_, i) => ({
		id: `${params.conceptId}__${params.type}__${params.difficulty}__${i}`,
		stem: `[Placeholder] ${params.type.toUpperCase()} question ${i + 1} for "${params.canonical?.label ?? params.conceptId}"`,
		type: params.type,
		...(params.type === "mc"
			? { options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: "Option A" }
			: { correctAnswer: "" }),
		concepts: [params.canonical?.id ?? params.conceptId],
		difficulty: params.difficulty,
		estimatedTimeSeconds: difficultyToTime(params.type, params.difficulty),
	}));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
	Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

	if (req.method === "OPTIONS") return res.status(200).json({});
	if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

	let params: GenerateItemsRequest;
	try {
		const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
		const { conceptId, canonical, type, difficulty, count } = body as GenerateItemsRequest;

		if (!conceptId || !type || !difficulty || !count) {
			return res.status(400).json({ error: "Missing required fields: conceptId, type, difficulty, count" });
		}

		// Validate type is appropriate for this canonical concept; auto-correct if not
		const resolvedType: ItemType = (() => {
			if (!isValidItemType(type)) return "mc";
			if (!canonical?.id) return type;
			const allowed = allowedTypesForConcept(canonical.id);
			return allowed.includes(type) ? type : (allowed[0] as ItemType);
		})();

		params = { conceptId, canonical, type: resolvedType, difficulty, count: Math.max(1, Math.min(count, 20)) };
	} catch {
		return res.status(400).json({ error: "Invalid JSON body" });
	}

	const prompt = `${SYSTEM_PROMPT}\n\n---\n\n${buildUserPrompt(params)}`;

	try {
		const raw = await callGemini({
			model: "gemini-2.0-flash",
			prompt,
			temperature: 0.7,
			maxOutputTokens: 4096,
		});

		const items = parseItems(raw, params);

		// Enrich each item with a step count derived from the actual generated stem
		const concept = toCanonicalConcept(params.canonical, params.conceptId);
		const enriched = items.map((item) => ({
			...item,
			stepCount: computeStepCount(concept, {
				conceptId: concept.id,
				difficulty: item.difficulty,
				scenarioComplexity: "medium",
				learnerProfile: "core",
				problemText: item.stem,
			}),
		}));

		// Ensure we never return more items than requested
		return res.status(200).json({ items: enriched.slice(0, params.count) });
	} catch (err) {
		console.error("[generate-items] Gemini or parse error:", err instanceof Error ? err.message : err);
		// Graceful fallback — callers still get usable placeholder items
		return res.status(200).json({ items: placeholderItems(params) });
	}
}
