/**
 * generateScenarios.ts — LLM-based scenario generation for studio assessments.
 *
 * Generates fresh, scenario-based questions for each concept using the
 * universal 7-item-type menu (State/Define, Interpret, Apply, Decide, Explain,
 * Evaluate, Conclude). Each question is self-contained with its own scenario.
 *
 * Falls back to the extracted items if Gemini is unavailable or parsing fails.
 */

import { callGemini } from "../../../lib/gemini";
import type { TestItem, TestSection, TestProduct } from "../../../src/prism-v4/schema/integration/IntentProduct";
import type { ExtractedProblemDifficulty, ExtractedProblemCognitiveDemand } from "../../../src/prism-v4/schema/semantic/ExtractedProblem";

// ── Universal item-type menu ──────────────────────────────────────────────────
// These 7 families work for any concept, subject, or grade level.

const UNIVERSAL_ITEM_TYPES = [
	"State / Define",
	"Interpret",
	"Apply",
	"Decide",
	"Explain",
	"Evaluate",
	"Conclude",
] as const;

type UniversalItemType = (typeof UNIVERSAL_ITEM_TYPES)[number];

// ── Domain pool ───────────────────────────────────────────────────────────────
// Varied real-world domains so successive versions feel different.

const SCENARIO_DOMAINS = [
	"public health (e.g., wait times, medication dosage, infection rates)",
	"food science (e.g., sodium content, sugar levels, calorie claims)",
	"environmental science (e.g., pollution levels, water quality, temperature readings)",
	"sports analytics (e.g., shooting percentage, average yards, completion rates)",
	"retail or business (e.g., transaction amounts, defect rates, customer satisfaction)",
	"transportation (e.g., commute times, accident rates, fuel efficiency)",
	"agriculture (e.g., crop yield, germination rates, pesticide effectiveness)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
	return h;
}

function pickDomain(seed: string): string {
	return SCENARIO_DOMAINS[hashString(seed) % SCENARIO_DOMAINS.length]!;
}

/**
 * Deterministically select N item types for a concept by shuffling the
 * universal menu using the concept string as a seed.
 */
function selectItemTypes(concept: string, count: number): UniversalItemType[] {
	const n = Math.min(count, UNIVERSAL_ITEM_TYPES.length);
	const shuffled = [...UNIVERSAL_ITEM_TYPES] as UniversalItemType[];
	const seed = hashString(concept);
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = ((seed * (i + 1) * 1664525 + 1013904223) >>> 0) % shuffled.length;
		[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
	}
	return shuffled.slice(0, n);
}

function mapDifficulty(d: number): ExtractedProblemDifficulty {
	if (d <= 2) return "low";
	if (d >= 4) return "high";
	return "medium";
}

function mapCognitiveDemand(itemType: string): ExtractedProblemCognitiveDemand {
	const t = itemType.toLowerCase();
	if (t.includes("state") || t.includes("define")) return "recall";
	if (t.includes("interpret")) return "conceptual";
	if (t.includes("apply")) return "procedural";
	if (t.includes("decide") || t.includes("evaluate")) return "analysis";
	if (t.includes("explain") || t.includes("conclude")) return "conceptual";
	return "procedural";
}

// ── Problem-format system ─────────────────────────────────────────────────────
// Implements the Master Compatibility Table: 8 formats × 7 item-types.
// Each format has allowed item-types, a base time range (seconds), and a
// format-specific prompt instruction block the LLM receives.

type ProblemFormat = "TF" | "MC" | "MS" | "Matching" | "DnD" | "Sorting" | "SA" | "FRQ";

/** Which formats are valid for each item-type (drawn from the spec table). */
const FORMAT_ALLOWED_BY_ITEM_TYPE: Record<UniversalItemType, ProblemFormat[]> = {
	"State / Define": ["TF", "MC", "MS", "Matching", "DnD", "Sorting", "SA", "FRQ"],
	"Interpret":      ["TF", "MC", "MS", "Matching", "DnD", "Sorting", "SA", "FRQ"],
	"Apply":          ["MC", "MS", "DnD", "Sorting", "SA", "FRQ"],
	"Decide":         ["TF", "MC", "MS", "DnD", "Sorting", "SA", "FRQ"],
	"Explain":        ["SA", "FRQ"],
	"Evaluate":       ["MC", "MS", "DnD", "Sorting", "SA", "FRQ"],
	"Conclude":       ["TF", "MC", "MS", "SA", "FRQ"],
};

/** Base time range in seconds (midpoint used; multiplied by difficulty). */
const FORMAT_BASE_SECONDS: Record<ProblemFormat, number> = {
	TF:      25,   // 20-30 s
	MC:      52,   // 45-60 s
	MS:      75,   // 60-90 s
	Matching: 105, // 90-120 s
	DnD:     105,  // 90-120 s
	Sorting:  75,  // 60-90 s
	SA:       75,  // 60-90 s
	FRQ:     240,  // 3-5 min
};

const DIFFICULTY_MULTIPLIER: Record<number, number> = { 1: 0.8, 2: 1.0, 3: 1.2, 4: 1.3, 5: 1.4 };

/** Format-specific answer-shape instructions appended to the LLM user message. */
const FORMAT_INSTRUCTIONS: Record<ProblemFormat, string> = {
	TF: [
		"Format: True/False",
		"- Write one unambiguous statement that is clearly true or clearly false.",
		'- The "answer" field must be exactly "True" or "False".',
		'- The "structuredAnswer" field must be exactly "True" or "False".',
	].join("\n"),

	MC: [
		"Format: Multiple Choice",
		"- Provide 1 correct answer and 3 plausible distractors. No 'all of the above'.",
		"- Label choices A, B, C, D.",
		'- The "answer" field: short string indicating the correct letter (e.g. "B").',
		'- The "structuredAnswer" field must be:',
		'  { "correct": "B", "choices": ["A. ...", "B. ...", "C. ...", "D. ..."] }',
	].join("\n"),

	MS: [
		"Format: Multiple Select",
		'- Provide 2-3 correct answers and 2-3 distractors. Prompt must say "Select all that apply."',
		'- The "answer" field: comma-separated correct letters (e.g. "A, C").',
		'- The "structuredAnswer" field must be:',
		'  { "correct": ["A", "C"], "choices": ["A. ...", "B. ...", "C. ...", "D. ...", "E. ..."] }',
	].join("\n"),

	Matching: [
		"Format: Matching",
		"- Provide 4-6 term→definition pairs. No duplicates or ambiguous matches.",
		'- The "answer" field: a readable summary of the pairs.',
		'- The "structuredAnswer" field must be an object mapping each term to its definition:',
		'  { "Term A": "Definition 2", "Term B": "Definition 4" }',
	].join("\n"),

	DnD: [
		"Format: Drag-and-Drop",
		"- Provide 3-6 draggable items and 2-3 categories (or a sequence to fill).",
		'- The "answer" field: a readable summary of correct placements.',
		'- The "structuredAnswer" field must map each item to its category:',
		'  { "Item 1": "Category A", "Item 2": "Category B" }',
	].join("\n"),

	Sorting: [
		"Format: Sorting / Ordering",
		"- Provide 3-6 items that have a clear logical or procedural order.",
		'- The "answer" field: a readable description of the correct order.',
		'- The "structuredAnswer" field must be a JSON array in correct order:',
		'  ["Step 1", "Step 2", "Step 3"]',
	].join("\n"),

	SA: [
		"Format: Short Answer",
		"- Question should be answerable in 1-3 sentences.",
		'- The "answer" field: a model 1-3 sentence answer.',
		'- The "structuredAnswer" field: same as "answer" (plain string).',
	].join("\n"),

	FRQ: [
		"Format: Free Response",
		"- Create 2-4 sub-parts (A, B, C…). Each part must be independently answerable.",
		"- You may make this a multi-concept question if appropriate.",
		'- The "answer" field: a brief summary of what a complete response covers.',
		'- The "structuredAnswer" field must be:',
		'  { "partA": "...", "partB": "...", "partC": "..." }',
	].join("\n"),
};

/**
 * Deterministically pick a problem format for this concept+itemType combo,
 * using the item-position within the quota as extra entropy so successive
 * items for the same concept get different formats.
 */
function selectFormat(concept: string, itemType: UniversalItemType, slotIndex: number): ProblemFormat {
	const allowed = FORMAT_ALLOWED_BY_ITEM_TYPE[itemType];
	const seed = hashString(`${concept}-${itemType}-${slotIndex}`);
	return allowed[seed % allowed.length]!;
}

function computeItemTimeSeconds(format: ProblemFormat, difficulty: number): number {
	const base = FORMAT_BASE_SECONDS[format];
	const mult = DIFFICULTY_MULTIPLIER[Math.max(1, Math.min(5, difficulty)) as keyof typeof DIFFICULTY_MULTIPLIER] ?? 1.0;
	return Math.round(base * mult);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildAssessmentPrompt(
	concept: string,
	itemTypes: string[],
	quota: number,
	domain: string,
	relatedConcepts: string[],
	/** When set, override LLM format choice and use this exact format for every item. */
	forcedFormat?: ProblemFormat,
): string {
	const itemTypesList = itemTypes.join(", ");
	// For the example shape we show the richer schema so the LLM learns the fields
	const exampleShape = JSON.stringify(
		{
			itemType: itemTypes[0] ?? "Apply",
			problemFormat: "MC",
			prompt: "full question text including the scenario",
			answer: "B",
			structuredAnswer: { correct: "B", choices: ["A. ...", "B. ...", "C. ...", "D. ..."] },
			conceptIds: [concept],
			difficulty: 3,
		},
		null,
		2,
	);

	const relatedLine =
		relatedConcepts.length > 0
			? `Related concepts you may incorporate into items where appropriate: ${relatedConcepts.join(", ")}`
			: "";

	return [
		"You are an expert assessment writer.",
		"You generate clear, teacher-ready questions with realistic scenarios.",
		"You never copy text from the source document.",
		"You always generate fresh, realistic scenarios.",
		"You follow the requested item-types and problem formats.",
		"You return only valid JSON.",
		"",
		`Generate ${quota} assessment item${quota !== 1 ? "s" : ""}.`,
		"",
		`Primary concept: "${concept}"`,
		relatedLine,
		"",
		`Item-type pool (use only these): ${itemTypesList}`,
		`Draw the scenario from this real-world domain: ${domain}`,
		"",
		"For each item:",
		"- Choose one item-type from the pool.",
		"- Choose the best problem format for that item-type (see rules below).",
		"- Write a self-contained question with a realistic scenario and specific numbers or details.",
		"- Write in clear, student-friendly language.",
		"- Do NOT copy or paraphrase the teacher's source document.",
		"- Include a short answer or explanation in the 'answer' field.",
		"- Include the correct structured answer in the 'structuredAnswer' field as described per format.",
		"- List all concept IDs covered by the item in 'conceptIds'.",
		"- Rate difficulty from 1 (easiest) to 5 (hardest).",
		"",
		...(forcedFormat
		? [
				`Use exactly this problem format for every item — do not deviate:`,
				"---",
				FORMAT_INSTRUCTIONS[forcedFormat],
				"---",
		  ]
		: [
				"Problem-format rules:",
				"---",
				Object.entries(FORMAT_INSTRUCTIONS).map(([, instr]) => instr).join("\n---\n"),
				"---",
		  ]),
		"",
		`Return your answer as a JSON array with exactly ${quota} element${quota !== 1 ? "s" : ""}:`,
		`[\n  ${exampleShape}\n]`,
		"",
		"Each object must have: itemType, problemFormat, prompt, answer, structuredAnswer, conceptIds, difficulty.",
		"Do not include anything outside the JSON array.",
	]
		.filter((l) => l !== undefined)
		.join("\n");
}

// ── Response parser ───────────────────────────────────────────────────────────

interface RawItem {
	itemType: string;
	problemFormat?: string;
	prompt: string;
	answer: string;
	structuredAnswer?: unknown;
	conceptIds?: string[];
	difficulty: number;
}

function isRawItem(v: unknown): v is RawItem {
	if (!v || typeof v !== "object") return false;
	const r = v as Record<string, unknown>;
	return typeof r["itemType"] === "string" && typeof r["prompt"] === "string" && typeof r["answer"] === "string";
}

function extractJSONArray(raw: string): string {
	const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
	const start = stripped.indexOf("[");
	const end = stripped.lastIndexOf("]");
	return start !== -1 && end > start ? stripped.slice(start, end + 1) : stripped;
}

function parseItemArray(raw: string): RawItem[] | null {
	try {
		const arr: unknown = JSON.parse(extractJSONArray(raw));
		if (!Array.isArray(arr)) return null;
		const items = arr.filter(isRawItem);
		return items.length > 0 ? items : null;
	} catch {
		return null;
	}
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Replace the items in a single TestSection with Gemini-generated fresh questions.
 * Generates one standalone scenario-based question per quota slot.
 *
 * @param section  The section to enrich (items.length = quota).
 * @param seed     Entropy string for deterministic domain/format selection.
 * @param relatedConcepts  Other blueprint concepts passed as LLM context (optional).
 * Returns the original section unchanged if generation fails.
 */
export async function generateScenarioSection(
	section: TestSection,
	seed: string,
	relatedConcepts: string[] = [],
	forcedFormat?: ProblemFormat,
): Promise<TestSection> {
	const concept = section.concept;
	const quota = Math.max(1, section.items.length);
	const sourceDocumentId = section.sourceDocumentIds[0] ?? "generated";
	const sourceFileName = section.items[0]?.sourceFileName ?? "Generated";
	const domain = pickDomain(seed + concept);
	const itemTypes = selectItemTypes(concept, Math.min(quota, 4));

	let raw: string;
	try {
		const prompt = buildAssessmentPrompt(concept, itemTypes, quota, domain, relatedConcepts, forcedFormat);
		raw = await callGemini({
			model: "gemini-2.0-flash",
			prompt,
			temperature: 0.75,
			maxOutputTokens: Math.max(1024, quota * 500),
		});
	} catch (err) {
		console.warn(`[generateScenarios] Gemini unavailable for "${concept}":`, err);
		return section;
	}

	const rawItems = parseItemArray(raw);
	if (!rawItems || rawItems.length === 0) {
		console.warn(`[generateScenarios] Unparseable response for "${concept}". Raw:`, raw.slice(0, 300));
		return section;
	}

	const generatedItems: TestItem[] = rawItems.map((r, i) => {
		const diffInt = typeof r.difficulty === "number" ? r.difficulty : 3;
		const difficulty = mapDifficulty(diffInt);
		const itemType = (r.itemType ?? itemTypes[i % itemTypes.length] ?? "Apply") as UniversalItemType;

		// Use forcedFormat > LLM-returned format > deterministic selection.
		const format: ProblemFormat =
			forcedFormat ??
			(r.problemFormat && r.problemFormat in FORMAT_BASE_SECONDS
				? (r.problemFormat as ProblemFormat)
				: selectFormat(concept, itemType, i));

		return {
			itemId: `gen-${seed.slice(-8)}-${concept.replace(/\s+/g, "-").slice(0, 24)}-${i}`,
			prompt: r.prompt.trim(),
			concept,
			primaryConcepts: r.conceptIds && r.conceptIds.length > 0 ? r.conceptIds : [concept],
			sourceDocumentId,
			sourceFileName,
			difficulty,
			cognitiveDemand: mapCognitiveDemand(r.itemType),
			answerGuidance: r.answer.trim(),
			structuredAnswer: r.structuredAnswer ?? r.answer.trim(),
			problemType: format,
			estimatedTimeSeconds: computeItemTimeSeconds(format, diffInt),
			misconceptionTriggers: [],
		};
	});

	return { ...section, items: generatedItems };
}

/**
 * Replace all sections in a TestProduct with Gemini-generated fresh questions.
 *
 * When `conceptQuotas` is provided (from the blueprint), the loop iterates
 * over EVERY concept quota — not just the sections that buildIntentPayload
 * happened to extract from the document. This ensures every teacher-ranked
 * concept gets its assigned number of items even if the source document had
 * little content for that concept.
 *
 * Falls back per-section (or per-concept) if individual generation fails.
 * No-ops entirely if GEMINI_API_KEY is not set.
 */
export async function enrichProductWithScenarios(
	product: TestProduct,
	seed: string,
	conceptQuotas?: Array<{ id: string; name: string; quota: number }>,
): Promise<TestProduct> {
	if (!process.env.GEMINI_API_KEY) {
		console.log("[generateScenarios] GEMINI_API_KEY not set — using extracted items.");
		return product;
	}

	// Build a lookup from concept id → extracted section (for source metadata reuse)
	const extractedByConceptId = new Map<string, TestSection>();
	for (const section of product.sections) {
		extractedByConceptId.set(section.concept, section);
	}

	// Decide which concepts to generate for:
	//   - If blueprint quotas are provided, use them (one section per quota entry).
	//   - Otherwise, fall back to whatever buildIntentPayload extracted.
	const targets: Array<{ concept: string; quota: number; sourceDocumentIds: string[]; sourceFileName: string }> =
		conceptQuotas && conceptQuotas.length > 0
			? conceptQuotas.map((q) => {
					const existing = extractedByConceptId.get(q.id);
					return {
						concept: q.name || q.id,
						quota: q.quota,
						sourceDocumentIds: existing?.sourceDocumentIds ?? product.sections[0]?.sourceDocumentIds ?? ["generated"],
						sourceFileName: existing?.items[0]?.sourceFileName ?? "Generated",
					};
			  })
			: product.sections.map((s) => ({
					concept: s.concept,
					quota: Math.max(1, s.items.length),
					sourceDocumentIds: s.sourceDocumentIds,
					sourceFileName: s.items[0]?.sourceFileName ?? "Generated",
			  }));

	const enrichedSections = await Promise.all(
		targets.map(({ concept, quota, sourceDocumentIds, sourceFileName }, idx) => {
			// Build a synthetic section so generateScenarioSection has the shape it needs
			const stubSection: TestSection = {
				concept,
				sourceDocumentIds,
				items: Array.from({ length: quota }, (_: unknown, i: number) => ({
					itemId: `stub-${i}`,
					prompt: "",
					concept,
					sourceDocumentId: sourceDocumentIds[0] ?? "generated",
					sourceFileName,
					difficulty: "medium" as const,
					cognitiveDemand: "procedural" as const,
					answerGuidance: "",
				})),
			};
			// Pass all OTHER concepts as related context for multi-concept items
			const relatedConcepts = targets
				.filter((_, j) => j !== idx)
				.map((t) => t.concept);
			return generateScenarioSection(stubSection, seed, relatedConcepts);
		}),
	);

	const totalItemCount = enrichedSections.reduce((sum, s) => sum + s.items.length, 0);

	// Sum per-item time estimates (fall back to product estimate if none present)
	const derivedDurationSeconds = enrichedSections
		.flatMap((s) => s.items)
		.reduce((sum, item) => sum + (item.estimatedTimeSeconds ?? 90), 0);
	const estimatedDurationMinutes =
		derivedDurationSeconds > 0
			? Math.round(derivedDurationSeconds / 60)
			: product.estimatedDurationMinutes;

	return {
		...product,
		sections: enrichedSections,
		totalItemCount,
		estimatedDurationMinutes,
	};
}

// ── Internal exports for unit testing only ───────────────────────────────────
// Not part of the public API surface. Import via @internal tag in tests.
export const VALID_PROBLEM_FORMATS: readonly ProblemFormat[] = [
	"TF", "MC", "MS", "Matching", "DnD", "Sorting", "SA", "FRQ",
] as const;

export {
	UNIVERSAL_ITEM_TYPES,
	FORMAT_ALLOWED_BY_ITEM_TYPE,
	FORMAT_BASE_SECONDS,
	DIFFICULTY_MULTIPLIER,
	FORMAT_INSTRUCTIONS,
	selectFormat,
	computeItemTimeSeconds,
	selectItemTypes,
	buildAssessmentPrompt,
	parseItemArray,
};
export type { ProblemFormat, UniversalItemType };
