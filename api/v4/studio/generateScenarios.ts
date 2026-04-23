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
import type { TestItem, TestSection, TestProduct, Misconception } from "../../../src/prism-v4/schema/integration/IntentProduct";
import type { ExtractedProblemDifficulty, ExtractedProblemCognitiveDemand } from "../../../src/prism-v4/schema/semantic/ExtractedProblem";

// ── Rich concept graph input (structurally compatible with WeightedConceptGraph
//    from extractConceptGraph.ts — defined locally to avoid circular imports) ──
interface RichConceptGraphInput {
	nodes: Array<{ id: string; label: string }>;
	edges: Array<{ from: string; to: string; strength: number }>;
	itemPlans: Array<{
		id: string;
		type: "single" | "multi-concept" | "frq";
		concepts: string[];
		suggestedFormat?: string;
		parts?: string[];
		sourceClusterId?: string;
	}>;
	clusters: Array<{
		id: string;
		stem: string;
		subparts: Array<{ id: string; text: string }>;
	}>;
}

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

function pickFrom<T>(list: readonly T[], seed: string): T {
	return list[hashString(seed) % list.length]!;
}

// ── Scenario Style Library ────────────────────────────────────────────────────
// One style is deterministically selected per (concept × itemType) pair and
// injected into the LLM prompt so scenarios stay varied across items.

export const SCENARIO_STYLES: Record<string, readonly string[]> = {
	"State / Define": [
		"Everyday life example",
		"Classroom or school setting",
		"Consumer product or device",
		"Simple scientific phenomenon",
		"Basic business or workplace example",
		"Health or wellness example",
		"Transportation or travel scenario",
	],
	Interpret: [
		"Research study summary",
		"News headline or media claim",
		"Graph or table description",
		"Survey results",
		"Scientific experiment outcome",
		"Policy or public decision claim",
		"Product performance comparison",
	],
	Apply: [
		"Lab experiment with measurements",
		"Business operations scenario",
		"Public services (traffic, transit, utilities)",
		"Health or medical data",
		"Environmental data",
		"Engineering or design scenario",
		"Sports performance or training data",
	],
	Decide: [
		"Hypothesis test with p-value",
		"Quality control decision",
		"Medical screening threshold",
		"Policy approval decision",
		"Product safety or performance threshold",
		"Hiring or admissions decision",
		"Environmental compliance decision",
	],
	Explain: [
		"Student misconception explanation",
		"Real-world phenomenon explanation",
		"Policy or system explanation",
		"Scientific mechanism",
		"Mathematical reasoning",
		"Everyday scenario requiring conceptual clarity",
		"Technology or engineering explanation",
	],
	Evaluate: [
		"Evaluate a flawed study",
		"Evaluate a misleading claim",
		"Evaluate a graph or chart",
		"Evaluate a decision or policy",
		"Evaluate a method or procedure",
		"Evaluate a product claim",
		"Evaluate a student's reasoning",
	],
	Conclude: [
		"Hypothesis test conclusion",
		"Trend identification",
		"Cause vs correlation",
		"Policy impact conclusion",
		"Product performance conclusion",
		"Scientific experiment conclusion",
		"Business or operations conclusion",
	],
};

// ── Subject-Specific Scenario Library ────────────────────────────────────────
// When subject is known, these add domain flavour on top of the style.

export const SUBJECT_SCENARIOS: Record<string, readonly string[]> = {
	math: [
		"Calculate the mean wait time at a hospital emergency room",
		"Find the median income across zip codes in a city survey",
		"Determine the standard deviation of test scores in a class",
		"Compute the slope of a cost function for a small business",
		"Model a proportional relationship between fuel use and distance",
		"Interpret a scatter plot of study hours vs exam scores",
		"Solve a linear equation representing a service subscription cost",
	],
	science: [
		"Measure the effect of temperature on enzyme reaction rates",
		"Analyse carbon dioxide levels in a greenhouse over a year",
		"Predict the trajectory of a projectile given initial velocity",
		"Calculate the half-life of a radioactive sample",
		"Compare the density of liquids in a chemistry lab",
		"Interpret results from a controlled biology experiment",
		"Evaluate a hypothesis about plant growth under different light conditions",
	],
	ela: [
		"Identify the author's claim in an editorial about school policy",
		"Analyse the tone of a speech delivered at a public event",
		"Evaluate the evidence a journalist uses to support a controversial claim",
		"Determine the central idea of an informational article",
		"Explain the effect of a figurative language choice in a novel excerpt",
		"Compare two persuasive essays on the same topic",
		"Construct an argument using evidence from a primary source document",
	],
	social_studies: [
		"Analyse the cause of a major economic shift in the 20th century",
		"Evaluate the effectiveness of a public health policy",
		"Interpret a historical map showing trade routes",
		"Compare the political systems of two countries",
		"Explain the impact of a government decision on a local community",
		"Evaluate the short- and long-term effects of a historical event",
		"Determine how geography influenced settlement patterns in a region",
	],
};

// ── FRQ Structure Templates ───────────────────────────────────────────────────
// Per item-type templates guide part-structure when the LLM generates FRQs.

export const FRQ_TEMPLATES: Record<string, readonly string[]> = {
	Apply: [
		"Part A: Set up the calculation. Part B: Solve and show work. Part C: Interpret what the answer means in context.",
		"Part A: Identify the relevant formula or procedure. Part B: Apply it to the given data. Part C: Check the reasonableness of your answer.",
		"Part A: Define the variables. Part B: Perform the computation. Part C: Explain what the result tells us.",
	],
	Decide: [
		"Part A: State the null and alternative hypotheses. Part B: Perform the test and find the test statistic. Part C: Make a decision and justify it.",
		"Part A: Identify the decision criteria. Part B: Evaluate the evidence. Part C: State your decision and explain your reasoning.",
		"Part A: Describe the threshold or standard. Part B: Compare the data to the threshold. Part C: Conclude whether the standard is met.",
	],
	Interpret: [
		"Part A: Describe what the graph or data shows. Part B: Identify any trend, pattern, or anomaly. Part C: Explain what the pattern means in context.",
		"Part A: Summarise the key values or findings. Part B: Compare two or more aspects of the data. Part C: Draw a conclusion based on your comparison.",
		"Part A: Identify the key claim or result. Part B: Evaluate whether the data supports it. Part C: Explain any limitations.",
	],
	Explain: [
		"Part A: State the concept in your own words. Part B: Provide a real-world example that illustrates it. Part C: Explain why a common misconception about this concept is incorrect.",
		"Part A: Define the key term or idea. Part B: Describe the mechanism or process. Part C: Explain the implications or applications.",
		"Part A: Describe the phenomenon. Part B: Identify the underlying cause. Part C: Explain the effect or consequence.",
	],
	Evaluate: [
		"Part A: Describe the claim or argument being evaluated. Part B: Identify a specific strength and a specific flaw. Part C: State your overall assessment and justify it.",
		"Part A: Summarise the evidence presented. Part B: Evaluate whether the reasoning is valid. Part C: Explain how the argument could be improved.",
		"Part A: Identify the criteria for evaluation. Part B: Apply the criteria to the case. Part C: Reach a justified conclusion.",
	],
	Conclude: [
		"Part A: State the key finding from the data or analysis. Part B: Connect the finding back to the original question or hypothesis. Part C: Identify one limitation of this conclusion.",
		"Part A: Summarise the evidence. Part B: State what conclusion the evidence supports. Part C: Describe one alternative explanation and why it is less likely.",
		"Part A: Describe the result. Part B: Explain the significance of the result. Part C: Suggest a next step for investigation.",
	],
};

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

/**
 * Probabilistic difficulty bias: mostly_easy → 70% items ≤ 2; mostly_hard → 70% items ≥ 4.
 * Uses per-slot seed so distribution is deterministic and varied across items.
 */
function applyDifficultyBias(
	diffInt: number,
	bias: "easy" | "mixed" | "hard" | undefined,
	slotSeed: number,
): number {
	if (!bias || bias === "mixed") return diffInt;
	const roll = ((slotSeed * 1664525 + 1013904223) >>> 0) % 10; // 0–9
	if (bias === "easy") {
		// 70% → clamp to ≤ 2; 30% → clamp to ≤ 3
		return roll < 7 ? Math.min(diffInt, 2) : Math.min(diffInt, 3);
	}
	// mostly_hard: 70% → boost to ≥ 4; 30% → boost to ≥ 3
	return roll < 7 ? Math.max(diffInt, 4) : Math.max(diffInt, 3);
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

/**
 * Shuffle MC/MS answer choices so the correct answer is not always in the same
 * position (eliminates the "always B" pattern). Updates both `structuredAnswer`
 * and `answerGuidance` to reflect the new order.
 */
function shuffleMCChoices(item: TestItem, slotSeed: number): TestItem {
	const fmt = item.problemType;
	if (fmt !== "MC" && fmt !== "MS") return item;
	const sa = item.structuredAnswer;
	if (!sa || typeof sa !== "object" || Array.isArray(sa)) return item;
	const data = sa as { correct?: string | string[]; choices?: string[] };
	if (!Array.isArray(data.choices) || data.choices.length < 2) return item;

	// Fisher-Yates using slotSeed for determinism
	const choices = [...data.choices];
	for (let i = choices.length - 1; i > 0; i--) {
		const j = ((slotSeed * (i + 7) * 1664525 + 1013904223) >>> 0) % (i + 1);
		[choices[i], choices[j]] = [choices[j]!, choices[i]!];
	}

	// Re-label A, B, C … and track where the correct answer(s) ended up
	const oldLabels = data.choices.map((c) => c.match(/^([A-E])\./)?.[1] ?? "");
	const newLabels = choices.map((_, idx) => String.fromCharCode(65 + idx));
	// Build old-label → new-label mapping
	const labelMap = new Map<string, string>();
	for (let i = 0; i < choices.length; i++) {
		const oldLabel = oldLabels[data.choices.indexOf(choices[i]!)] ?? "";
		if (oldLabel) labelMap.set(oldLabel, newLabels[i]!);
	}
	// Re-prefix choice text
	const relabeledChoices = choices.map((c, i) => {
		const text = c.replace(/^[A-E]\.\s*/, "");
		return `${newLabels[i]}. ${text}`;
	});

	let newCorrect: string | string[];
	if (Array.isArray(data.correct)) {
		newCorrect = (data.correct as string[]).map((l) => labelMap.get(l) ?? l);
	} else {
		newCorrect = labelMap.get(data.correct as string) ?? (data.correct as string);
	}

	return {
		...item,
		structuredAnswer: { correct: newCorrect, choices: relabeledChoices },
		answerGuidance: Array.isArray(newCorrect) ? newCorrect.join(", ") : (newCorrect as string),
	};
}

// ── Problem-format system ─────────────────────────────────────────────────────
// Implements the Master Compatibility Table: 8 formats × 7 item-types.
// Each format has allowed item-types, a base time range (seconds), and a
// format-specific prompt instruction block the LLM receives.

type ProblemFormat = "TF" | "MC" | "MS" | "Matching" | "DnD" | "Sorting" | "SA" | "FRQ";

/** Which formats are valid for each item-type (drawn from the spec table). */
const FORMAT_ALLOWED_BY_ITEM_TYPE: Record<UniversalItemType, ProblemFormat[]> = {
	"State / Define": ["TF", "MC", "MS", "Matching", "Sorting", "SA", "FRQ"],
	"Interpret":      ["TF", "MC", "MS", "Matching", "Sorting", "SA", "FRQ"],
	"Apply":          ["MC", "MS", "Sorting", "SA", "FRQ"],
	"Decide":         ["TF", "MC", "MS", "Sorting", "SA", "FRQ"],
	"Explain":        ["SA", "FRQ"],
	"Evaluate":       ["MC", "MS", "Sorting", "SA", "FRQ"],
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
		"- Write one unambiguous declarative STATEMENT that is clearly true or clearly false.",
		"- Do NOT write a question. Do NOT end the stem with a question mark.",
		"- Do NOT use open-ended phrasing such as 'Explain...', 'Describe...', or 'How...'.",
		"- The stem must be a complete sentence that can be evaluated as true or false.",
		'- The "answer" field must be exactly "True" or "False".',
		'- The "structuredAnswer" field must be exactly "True" or "False".',
	].join("\n"),

	MC: [
		"Format: Multiple Choice",
		"- Write a clear question STEM ONLY. Do NOT include answer choices inside the prompt field.",
		"- Provide exactly 1 correct answer and 3 plausible distractors.",
		"- Label choices A, B, C, D. Return choices ONLY in the structuredAnswer block.",
		"- Distractors must be realistic, conceptually relevant, and reflect common misconceptions about the topic.",
		"- No 'all of the above' or 'none of the above' options.",
		'- The "answer" field: the correct label only (e.g. "B").',
		'- The "structuredAnswer" field must be:',
		'  { "correct": "B", "choices": ["A. ...", "B. ...", "C. ...", "D. ..."] }',
	].join("\n"),

	MS: [
		"Format: Multiple Select",
		'- Write a clear question STEM ONLY. Do NOT include choices inside the prompt field.',
		'- The prompt must end with "(Select all that apply.)"',
		"- Provide 2-3 correct answers and 2-3 distractor options.",
		"- Distractors must reflect plausible misconceptions, not obviously wrong answers.",
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
		"- Provide 3-6 items that have a clear logical or procedural order (e.g. steps in a process, stages of a cycle, chronological events).",
		"- Do NOT disguise a numeric calculation as an ordering task.",
		"- Each item must be a discrete, labelable thing — not a number or formula.",
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
function selectFormat(concept: string, itemType: UniversalItemType, slotIndex: number, overrideAllowed?: ProblemFormat[]): ProblemFormat {
	const allowed = overrideAllowed && overrideAllowed.length > 0
		? overrideAllowed
		: FORMAT_ALLOWED_BY_ITEM_TYPE[itemType];
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
	/** Scenario style hint injected into the prompt (e.g. "Lab experiment with measurements"). */
	scenarioStyle?: string,
	/** FRQ structure template injected when FRQ items are expected. */
	frqTemplate?: string,
	/** Tone for question writing. Default: "conversational". */
	teacherTone?: "conversational" | "formal",
	/** Subject-specific scenario example injected for extra domain flavour. */
	subjectScenarioHint?: string,
	/** Per-concept time budget in minutes (e.g. "~8 min"). Injected as a calibration hint. */
	timeBudgetHint?: string,
	/** For multi-concept items: every listed concept MUST be jointly tested in one question. */
	requiredConcepts?: string[],
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

	const requiredConceptsLine =
		requiredConcepts && requiredConcepts.length > 1
			? `REQUIRED: This single assessment item MUST explicitly and equally engage with ALL of these concepts together in one cohesive question: ${requiredConcepts.join(", ")}. Do NOT produce an item that tests only one of them in isolation.`
			: "";

	const scenarioLine = scenarioStyle
		? `Scenario style to use: "${scenarioStyle}" — use this type of context for the scenario.`
		: "";

	const frqLine = frqTemplate
		? `FRQ structure to follow (when generating FRQ items): ${frqTemplate}`
		: "";

	const subjectLine = subjectScenarioHint
		? `Subject-specific scenario example (adapt freely, do not copy): "${subjectScenarioHint}"`
		: "";

	const timeBudgetLine = timeBudgetHint
		? `Target time for this set of questions: ${timeBudgetHint}. Calibrate question complexity so students can reasonably complete all items in that time.`
		: "";

	return [
		"You are an expert assessment writer who creates teacher-quality questions.",
		`Tone: ${teacherTone ?? "conversational"}. Write questions in that voice.`,
		"Your questions must:",
		"- be fully original and never copy or paraphrase the source document",
		"- use realistic, varied, domain-appropriate scenarios with specific details",
		"- reflect the target concept clearly and explicitly in the stem",
		"- match the requested item-type and problem format exactly",
		"- be concise, unambiguous, and instructionally sound",
		"- avoid trick questions or unnecessary complexity",
		"- for MC/MS: include misconception-based distractors that reflect real student errors",
		"- be printable (no drag-and-drop or interactive-only interactions)",
		"Always return valid JSON only. Never include explanations outside the JSON array.",
		"",
		`Generate ${quota} assessment item${quota !== 1 ? "s" : ""}.`,
		"",
		`Primary concept: "${concept}"`,
		relatedLine,
		requiredConceptsLine,
		"",
		`Item-type pool (use only these): ${itemTypesList}`,
		`Draw the scenario from this real-world domain: ${domain}`,
		scenarioLine,
		frqLine,
		subjectLine,
		timeBudgetLine,
		"",
		"For each item:",
		"- Choose one item-type from the pool.",
		"- Choose the best problem format for that item-type (see rules below).",
		"- Write a self-contained question with a realistic scenario and specific numbers or details.",
		"- Make the primary concept explicit in the scenario or stem — do not bury it.",
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

// ── Post-generation enrichment helpers ───────────────────────────────────────

/**
 * Generate step-by-step solution for a single item.
 * Returns an empty array if Gemini is unavailable or parsing fails.
 */
async function generateSolutionSteps(item: TestItem): Promise<string[]> {
	const concept = item.primaryConcepts?.[0] ?? item.concept;
	const prompt = [
		"You are an expert teacher explaining how to solve an assessment item.",
		"",
		`Item prompt:\n"${item.prompt}"`,
		"",
		`Concept: "${concept}"`,
		"",
		"Correct answer (structured):",
		JSON.stringify(item.structuredAnswer ?? item.answerGuidance),
		"",
		"Write a clear, step-by-step solution a teacher could use as an answer key.",
		"Each step must be a short sentence. Aim for 2–4 steps.",
		"",
		'Return JSON only: { "steps": ["Step 1...", "Step 2...", "Step 3..."] }',
	].join("\n");

	try {
		const raw = await callGemini({ model: "gemini-2.0-flash", prompt, temperature: 0.4, maxOutputTokens: 512 });
		const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
		const parsed = JSON.parse(text) as { steps?: unknown };
		if (Array.isArray(parsed.steps)) {
			return (parsed.steps as unknown[]).filter((s): s is string => typeof s === "string");
		}
	} catch {
		// Silently degrade — steps are enrichment, not required
	}
	return [];
}

/**
 * Generate a misconception explanation for a single distractor choice.
 */
async function generateMisconceptionForDistractor(
	distractor: string,
	correctAnswer: string,
	concept: string,
): Promise<{ label: string; explanation: string } | null> {
	const prompt = [
		"You are an expert teacher analyzing student misconceptions.",
		"",
		`Concept: "${concept}"`,
		"",
		`Correct answer: "${correctAnswer}"`,
		"",
		`Distractor: "${distractor}"`,
		"",
		"Explain why a student might choose this distractor and what misconception it reflects.",
		"",
		'Return JSON only: { "label": "short name of misconception", "explanation": "detailed explanation" }',
	].join("\n");

	try {
		const raw = await callGemini({ model: "gemini-2.0-flash", prompt, temperature: 0.4, maxOutputTokens: 256 });
		const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
		const parsed = JSON.parse(text) as { label?: unknown; explanation?: unknown };
		if (typeof parsed.label === "string" && typeof parsed.explanation === "string") {
			return { label: parsed.label, explanation: parsed.explanation };
		}
	} catch {
		// Silently degrade
	}
	return null;
}

/**
 * Generate Misconception entries for all non-correct choices in an MC/MS item.
 */
async function generateMisconceptionsForItem(item: TestItem): Promise<Misconception[] | undefined> {
	const sa = item.structuredAnswer as { correct?: string | string[]; choices?: string[] } | null | undefined;
	if (!sa || !Array.isArray(sa.choices) || sa.choices.length === 0) return undefined;

	const correct: string[] = Array.isArray(sa.correct) ? sa.correct : sa.correct ? [sa.correct] : [];
	const correctAnswer = Array.isArray(sa.correct) ? sa.correct.join(", ") : (sa.correct as string ?? "");
	const concept = item.primaryConcepts?.[0] ?? item.concept;

	const results = await Promise.allSettled(
		sa.choices.map(async (choice) => {
			const labelMatch = choice.match(/^([A-E])\./)?.[1] ?? "";
			if (correct.includes(labelMatch)) return null; // skip correct answer
			const text = choice.replace(/^[A-E]\.\s*/, "");
			const result = await generateMisconceptionForDistractor(text, correctAnswer, concept);
			if (!result) return null;
			return { distractor: text, label: result.label, explanation: result.explanation } as Misconception;
		}),
	);

	const misconceptions = results
		.filter((r): r is PromiseFulfilledResult<Misconception> => r.status === "fulfilled" && r.value !== null)
		.map((r) => r.value);

	return misconceptions.length > 0 ? misconceptions : undefined;
}

/**
 * Validate a generated item against format constraints.
 * Returns false for items that should be dropped.
 */
function validateItem(item: TestItem): boolean {
	// Reject DnD (not printable)
	if (item.problemType === "DnD") return false;

	// Reject items with empty prompt
	if (!item.prompt?.trim()) return false;

	// MC/MS: must have ≥ 3 choices
	if (item.problemType === "MC" || item.problemType === "MS") {
		const sa = item.structuredAnswer as { choices?: unknown[] } | null | undefined;
		if (!sa || !Array.isArray(sa.choices) || sa.choices.length < 3) return false;
		// Reject if inline A/B/C/D choices leaked into prompt
		if (item.prompt.split("\n").some((l) => /^\s*[A-E]\.\s+/.test(l))) return false;
	}

	// FRQ: must have at least one named part
	if (item.problemType === "FRQ") {
		const sa = item.structuredAnswer as Record<string, unknown> | null | undefined;
		if (!sa || typeof sa !== "object" || Array.isArray(sa)) return false;
		if (!["partA", "partB", "partC", "partD"].some((k) => sa[k])) return false;
	}

	// Sorting: must have ≥ 2 items
	if (item.problemType === "Sorting") {
		if (!Array.isArray(item.structuredAnswer) || (item.structuredAnswer as unknown[]).length < 2) return false;
	}

	// TF: stem must be a declarative statement, not a question
	if (item.problemType === "TF") {
		const trimmed = item.prompt.trim();
		// Reject if it ends with a question mark
		if (trimmed.endsWith("?")) return false;
		// Reject if it starts with common question words
		if (/^(what|where|when|who|which|how|why|explain|describe|discuss|compare|calculate|solve|find)\b/i.test(trimmed)) return false;
		// Reject if structuredAnswer is not "True" or "False"
		const sa = item.structuredAnswer;
		if (sa !== "True" && sa !== "False") return false;
	}

	// Matching: structuredAnswer must be an object with at least one key
	if (item.problemType === "Matching") {
		const sa = item.structuredAnswer as Record<string, unknown> | null | undefined;
		if (!sa || typeof sa !== "object" || Array.isArray(sa) || Object.keys(sa).length === 0) return false;
	}

	// SA: structuredAnswer must be a non-empty string
	if (item.problemType === "SA") {
		if (typeof item.structuredAnswer !== "string" || !item.structuredAnswer.trim()) return false;
	}

	// Concept reference: primaryConcepts or concept must be populated
	if (!item.concept && (!item.primaryConcepts || item.primaryConcepts.length === 0)) return false;

	return true;
}

// ── Subject detection ─────────────────────────────────────────────────────────

function detectSubject(concept: string): keyof typeof SUBJECT_SCENARIOS | null {
	// Normalise rich concept IDs (e.g. "null-hypothesis") → "null hypothesis" for pattern matching.
	const lower = concept.toLowerCase().replace(/-/g, " ");
	// Inferential statistics terms (checked before the generic math pattern)
	if (/\b(null hypothesis|alternative hypothesis|p-value|p value|type i error|type ii error|significance level|significance|test statistic|sampling distribution|confidence interval|proportion test|mean test|power of the test|decision rule|statistical power|hypothesis test)\b/.test(lower)) return "math";
	if (/\b(math|algebra|geometry|calculus|statistics|equation|function|graph|number|probability|fraction|ratio|percent|slope|mean|median|mode)\b/.test(lower)) return "math";
	if (/\b(science|biology|chemistry|physics|density|reaction|hypothesis|experiment|organism|cell|force|energy|atom|molecule|ecosystem|evolution|genetics|wave|current)\b/.test(lower)) return "science";
	if (/\b(reading|writing|grammar|literature|author|tone|claim|evidence|narrative|figurative|persuasion|essay|text|poetry|theme|inference|syntax|rhetoric)\b/.test(lower)) return "ela";
	if (/\b(history|social|geography|government|economics|policy|civilization|trade|political|culture|revolution|constitution|democracy|migration|economic|empire)\b/.test(lower)) return "social_studies";
	return null;
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
	/** Restrict which formats may be used (teacher-selected). Ignored when forcedFormat is set. */
	allowedFormats?: ProblemFormat[],
	/** Bias difficulty distribution: "easy" → mostly 1-2, "hard" → mostly 4-5. */
	difficultyBias?: "easy" | "mixed" | "hard",
	/** Writing tone passed to LLM. Default: "conversational". */
	teacherTone?: "conversational" | "formal",
	/** Per-concept target time in minutes — passed as calibration hint to the LLM. */
	timeBudgetMinutes?: number,
	/** For multi-concept or FRQ plans: all listed labels MUST be tested jointly in one item. */
	requiredConcepts?: string[],
): Promise<TestSection> {
	const concept = section.concept;
	const quota = Math.max(1, section.items.length);
	const sourceDocumentId = section.sourceDocumentIds[0] ?? "generated";
	const sourceFileName = section.items[0]?.sourceFileName ?? "Generated";
	const domain = pickDomain(seed + concept);
	const itemTypes = selectItemTypes(concept, Math.min(quota, 4));

	// Pick a varied scenario style and FRQ template deterministically
	const primaryItemType = itemTypes[0] ?? "Apply";
	const styleList = SCENARIO_STYLES[primaryItemType] ?? SCENARIO_STYLES["Apply"]!;
	const scenarioStyle = pickFrom(styleList, seed + concept + "style");
	const frqTemplateList = FRQ_TEMPLATES[primaryItemType];
	const frqTemplate = frqTemplateList ? pickFrom(frqTemplateList, seed + concept + "frq") : undefined;

	// Detect subject from concept name to inject a relevant scenario example
	const subjectKey = detectSubject(concept);
	const subjectScenarioHint = subjectKey
		? pickFrom(SUBJECT_SCENARIOS[subjectKey]!, seed + concept + "subject")
		: undefined;

	const timeBudgetHint = timeBudgetMinutes !== undefined ? `~${timeBudgetMinutes} min` : undefined;

	let raw: string;
	try {
		const prompt = buildAssessmentPrompt(concept, itemTypes, quota, domain, relatedConcepts, forcedFormat, scenarioStyle, frqTemplate, teacherTone, subjectScenarioHint, timeBudgetHint, requiredConcepts);
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
		const itemType = (r.itemType ?? itemTypes[i % itemTypes.length] ?? "Apply") as UniversalItemType;

		// Use forcedFormat > LLM-returned format > deterministic selection.
		// If allowedFormats is set, constrain the deterministic picker to that subset.
		const effectiveAllowed =
			allowedFormats && allowedFormats.length > 0
				? FORMAT_ALLOWED_BY_ITEM_TYPE[itemType].filter((f) => allowedFormats.includes(f))
				: undefined;
		const format: ProblemFormat =
			forcedFormat ??
			(r.problemFormat && r.problemFormat in FORMAT_BASE_SECONDS
				? (r.problemFormat as ProblemFormat)
				: selectFormat(concept, itemType, i, effectiveAllowed));

		// Apply difficulty bias: probabilistic 70/30 split per slot
		const biasedDiff = applyDifficultyBias(diffInt, difficultyBias, hashString(seed + concept + String(i)));

		return shuffleMCChoices({
			itemId: `gen-${seed.slice(-8)}-${concept.replace(/\s+/g, "-").slice(0, 24)}-${i}`,
			prompt: r.prompt.trim(),
			concept,
			primaryConcepts: r.conceptIds && r.conceptIds.length > 0 ? r.conceptIds : [concept],
			sourceDocumentId,
			sourceFileName,
			difficulty: mapDifficulty(biasedDiff),
			difficultyScore: biasedDiff,
			cognitiveDemand: mapCognitiveDemand(r.itemType),
			answerGuidance: r.answer.trim(),
			structuredAnswer: r.structuredAnswer ?? r.answer.trim(),
			problemType: format,
			estimatedTimeSeconds: computeItemTimeSeconds(format, biasedDiff),
			misconceptionTriggers: [],
		}, hashString(seed + concept + String(i)));
	});

	// Validation pass: drop items that fail format constraints
	const validItems = generatedItems.filter(validateItem);
	if (validItems.length < generatedItems.length) {
		console.warn(
			`[generateScenarios] Dropped ${generatedItems.length - validItems.length} invalid item(s) for "${concept}".`,
		);
	}

	// Allowed-format guard: drop any item whose problemType falls outside the teacher's
	// explicit allowed list (handles cases where the LLM returned a valid-but-disallowed format).
	const formatGuardedItems =
		allowedFormats && allowedFormats.length > 0 && !forcedFormat
			? validItems.filter((item) => allowedFormats.includes(item.problemType as ProblemFormat))
			: validItems;
	if (formatGuardedItems.length < validItems.length) {
		console.warn(
			`[generateScenarios] Dropped ${validItems.length - formatGuardedItems.length} item(s) with disallowed format for "${concept}".`,
		);
	}

	// Enrichment pass: generate solution steps + misconceptions in parallel
	const enrichedItems: TestItem[] = await Promise.all(
		formatGuardedItems.map(async (item) => {
			const [solutionSteps, misconceptions] = await Promise.all([
				generateSolutionSteps(item),
				item.problemType === "MC" || item.problemType === "MS"
					? generateMisconceptionsForItem(item)
					: Promise.resolve(undefined),
			]);
			return {
				...item,
				...(solutionSteps.length > 0 ? { solutionSteps } : {}),
				...(misconceptions ? { misconceptions } : {}),
			};
		}),
	);

	return { ...section, items: enrichedItems };
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
 * Runs in local stub mode when external LLM access is disabled.
 */
export async function enrichProductWithScenarios(
	product: TestProduct,
	seed: string,
	conceptQuotas?: Array<{ id: string; name: string; quota: number }>,
	allowedFormats?: ProblemFormat[],
	difficultyBias?: "easy" | "mixed" | "hard",
	teacherTone?: "conversational" | "formal",
	targetTimeMinutes?: number,
	/** When supplied (from the 5-layer concept extractor), drives the generation loop
	 *  with item-level plans instead of the flat concept-quota list. */
	richConceptGraph?: RichConceptGraphInput,
): Promise<TestProduct> {
	// Build a lookup from concept id → extracted section (for source metadata reuse)
	const extractedByConceptId = new Map<string, TestSection>();
	for (const section of product.sections) {
		extractedByConceptId.set(section.concept, section);
	}

	// ── Build label lookup from rich graph nodes (id → human label) ─────────────
	const labelByNodeId = new Map<string, string>();
	if (richConceptGraph) {
		for (const n of richConceptGraph.nodes) labelByNodeId.set(n.id, n.label);
	}
	/** Convert a concept ID like "null-hypothesis" → "Null hypothesis" using the
	 *  node label map when available, otherwise a deterministic title-case heuristic. */
	function idToLabel(id: string): string {
		return labelByNodeId.get(id)
			?? id.split("-").map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(" ");
	}

	// ── Decide generation strategy ────────────────────────────────────────────
	// Priority 1: ItemPlans from the 5-layer concept graph (1 item per plan).
	// Priority 2: Blueprint concept quotas (N items per concept).
	// Priority 3: Fall back to whatever buildIntentPayload extracted.
	type Target = {
		concept: string;
		quota: number;
		sourceDocumentIds: string[];
		sourceFileName: string;
		requiredConcepts?: string[];  // multi-concept / FRQ plans
		forcedFormat?: ProblemFormat; // FRQ plans force FRQ format
	};

	const targets: Target[] =
		richConceptGraph && richConceptGraph.itemPlans.length > 0
			? richConceptGraph.itemPlans.map((plan) => {
					const primaryId = plan.concepts[0] ?? "concept";
					const primaryLabel = idToLabel(primaryId);
					const allLabels = plan.concepts.map(idToLabel);
					const existing = extractedByConceptId.get(primaryId) ?? extractedByConceptId.get(primaryLabel);
					return {
						concept: primaryLabel,
						quota: 1, // one item per plan
						sourceDocumentIds: existing?.sourceDocumentIds ?? product.sections[0]?.sourceDocumentIds ?? ["generated"],
						sourceFileName: existing?.items[0]?.sourceFileName ?? "Generated",
						requiredConcepts: plan.concepts.length > 1 ? allLabels : undefined,
						forcedFormat:
							plan.type === "frq" ? "FRQ" :
							(plan.suggestedFormat as ProblemFormat | undefined),
					};
			  })
			: conceptQuotas && conceptQuotas.length > 0
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
		targets.map((target, idx) => {
			const { concept, quota, sourceDocumentIds, sourceFileName } = target;
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
			// Pass all OTHER concepts as related context.
			// Exclude any concepts already in this plan's required set — they're primary, not secondary.
			const ownIds = new Set(target.requiredConcepts ?? [concept]);
			const relatedConcepts = targets
				.filter((_, j) => j !== idx)
				.map((t) => t.concept)
				.filter((c) => !ownIds.has(c));
			// Distribute total time budget evenly across concepts (integer minutes per concept)
			const perConceptMinutes = targetTimeMinutes !== undefined && targets.length > 0
				? Math.max(1, Math.round(targetTimeMinutes / targets.length))
				: undefined;
			// Plan-specific overrides: forcedFormat locks the format; requiredConcepts
			// are injected into the prompt so the LLM must cover all of them jointly.
			return generateScenarioSection(stubSection, seed, relatedConcepts, target.forcedFormat, allowedFormats, difficultyBias, teacherTone, perConceptMinutes, target.requiredConcepts);
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
/** DnD is excluded — not printable. */
export const VALID_PROBLEM_FORMATS: readonly ProblemFormat[] = [
	"TF", "MC", "MS", "Matching", "Sorting", "SA", "FRQ",
] as const;

export {
	UNIVERSAL_ITEM_TYPES,
	FORMAT_ALLOWED_BY_ITEM_TYPE,
	FORMAT_BASE_SECONDS,
	DIFFICULTY_MULTIPLIER,
	FORMAT_INSTRUCTIONS,
	SCENARIO_DOMAINS,
	selectFormat,
	computeItemTimeSeconds,
	selectItemTypes,
	buildAssessmentPrompt,
	parseItemArray,
	pickFrom,
};
export type { ProblemFormat, UniversalItemType };

// Convenience aliases used in docs and test tooling
export type ItemFormat = ProblemFormat;

/** Union of every valid structuredAnswer shape, keyed by format:
 *  MC  → { correct: string; choices: string[] }
 *  MS  → { correct: string[]; choices: string[] }
 *  TF  → "True" | "False"
 *  Matching → Record<string, string>  (term → definition)
 *  Sorting  → string[]
 *  FRQ → { partA?: string; partB?: string; partC?: string; partD?: string }
 *  SA  → null
 */
export type StructuredAnswer =
	| { correct: string; choices: string[] }
	| { correct: string[]; choices: string[] }
	| "True" | "False"
	| Record<string, string>
	| string[]
	| { partA?: string; partB?: string; partC?: string; partD?: string }
	| null;
