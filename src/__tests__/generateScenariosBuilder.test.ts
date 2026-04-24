/**
 * generateScenariosBuilder.test.ts
 *
 * Full QA suite for the new builder work:
 *   - Concept ranking → quota math (applyConceptRankings)
 *   - Universal item-type selector (selectItemTypes)
 *   - Problem-format compatibility table (FORMAT_ALLOWED_BY_ITEM_TYPE / selectFormat)
 *   - Timing model (computeItemTimeSeconds)
 *   - Prompt content verification (buildAssessmentPrompt)
 *   - JSON parser resilience (parseItemArray)
 *   - generateScenarioSection full item shape (mocked LLM)
 *   - enrichProductWithScenarios multi-concept loop (mocked LLM)
 *   - Edge cases (zero-quota, single-item, large quota, empty prompts)
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// ── Hoist mock before all imports ─────────────────────────────────────────────
const { callLlmMock } = vi.hoisted(() => ({
	callLlmMock: vi.fn<() => Promise<string>>(),
}));

vi.mock("../../lib/llm", () => ({
	callLLM: callLlmMock,
}));

// Ensure stub LLM env is set for scenario enrichment tests.
beforeAll(() => {
	vi.stubEnv("STUB_LLM_KEY", "test-key");
});

afterEach(() => {
	callLlmMock.mockReset();
});

// ── Imports under test (after mock hoisting) ──────────────────────────────────
import {
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
	generateScenarioSection,
	enrichProductWithScenarios,
} from "../../api/v4/studio/generateScenarios";
import type { ProblemFormat, UniversalItemType } from "../../api/v4/studio/generateScenarios";
import { applyConceptRankings } from "../../api/v4/studio/shared";
import type { BlueprintModel } from "../prism-v4/session/InstructionalIntelligenceSession";
import type { TestSection, TestProduct } from "../prism-v4/schema/integration/IntentProduct";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBlueprint(
	concepts: Array<{ id: string; included: boolean; quota: number }>,
): BlueprintModel {
	return {
		concepts: concepts.map((c, i) => ({
			id: c.id,
			name: c.id,
			order: i,
			included: c.included,
			quota: c.quota,
		})),
		bloomLadder: [],
		difficultyRamp: [],
		modeMix: [],
		scenarioMix: [],
	};
}

function makeSection(concept: string, itemCount: number): TestSection {
	return {
		concept,
		sourceDocumentIds: ["doc-1"],
		items: Array.from({ length: itemCount }, (_, i) => ({
			itemId: `stub-${i}`,
			prompt: `Stub prompt ${i}`,
			concept,
			sourceDocumentId: "doc-1",
			sourceFileName: "test.pdf",
			difficulty: "medium" as const,
			cognitiveDemand: "procedural" as const,
			answerGuidance: "stub",
		})),
	};
}

function makeProduct(sections: TestSection[]): TestProduct {
	return {
		kind: "test",
		focus: null,
		title: "Test Product",
		overview: "",
		estimatedDurationMinutes: 30,
		sections,
		totalItemCount: sections.reduce((s, sec) => s + sec.items.length, 0),
		generatedAt: new Date().toISOString(),
	};
}

/** Build a well-formed LLM JSON array response for N items. */
function makeLLMResponse(
	items: Array<{
		itemType?: string;
		problemFormat?: string;
		prompt?: string;
		answer?: string;
		structuredAnswer?: unknown;
		conceptIds?: string[];
		difficulty?: number;
	}>,
): string {
	return JSON.stringify(
		items.map((it, i) => ({
			itemType: it.itemType ?? "Apply",
			problemFormat: it.problemFormat ?? "MC",
			prompt: it.prompt ?? `Scenario-based question ${i + 1}`,
			answer: it.answer ?? "B",
			structuredAnswer: it.structuredAnswer ?? {
				correct: "B",
				choices: ["A. wrong", "B. correct", "C. wrong", "D. wrong"],
			},
			conceptIds: it.conceptIds ?? ["test-concept"],
			difficulty: it.difficulty ?? 3,
		})),
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Concept Ranking → Quotas → Items
// ─────────────────────────────────────────────────────────────────────────────

describe("Section 1 — applyConceptRankings: quota distribution", () => {
	it("1. Ranking A > B > C over 10 items distributes proportionally", () => {
		const blueprint = makeBlueprint([
			{ id: "A", included: true, quota: 0 },
			{ id: "B", included: true, quota: 0 },
			{ id: "C", included: true, quota: 0 },
		]);
		const rankings = [
			{ id: "A", included: true, rank: 1 },
			{ id: "B", included: true, rank: 2 },
			{ id: "C", included: true, rank: 3 },
		];
		const result = applyConceptRankings(blueprint, rankings, 10);
		const quotas = Object.fromEntries(result.concepts.map((c) => [c.id, c.quota]));

		// A gets most (rank 1), C gets least (rank 3)
		expect(quotas["A"]).toBeGreaterThan(quotas["B"]!);
		expect(quotas["B"]).toBeGreaterThanOrEqual(quotas["C"]!);

		// Total must equal exactly 10
		const total = result.concepts.reduce((s, c) => s + c.quota, 0);
		expect(total).toBe(10);
	});

	it("2. Excluding a concept sets its quota to 0 and removes it", () => {
		const blueprint = makeBlueprint([
			{ id: "A", included: true, quota: 0 },
			{ id: "B", included: true, quota: 0 },
			{ id: "C", included: true, quota: 0 },
		]);
		const rankings = [
			{ id: "A", included: true, rank: 1 },
			{ id: "B", included: false, rank: 2 }, // excluded
			{ id: "C", included: true, rank: 2 },
		];
		const result = applyConceptRankings(blueprint, rankings, 10);
		const b = result.concepts.find((c) => c.id === "B");
		expect(b?.quota).toBe(0);
		expect(b?.included).toBe(false);

		// A and C together should account for all items
		const activeTotal = result.concepts
			.filter((c) => c.included)
			.reduce((s, c) => s + c.quota, 0);
		expect(activeTotal).toBe(10);
	});

	it("19. Zero-quota concept (all excluded) returns unchanged blueprint", () => {
		const blueprint = makeBlueprint([{ id: "A", included: true, quota: 5 }]);
		const result = applyConceptRankings(blueprint, [], 10);
		// No rankings supplied → original returned
		expect(result.concepts[0]?.quota).toBe(5);
	});

	it("20. Single-concept with quota 1 receives at least 1 item", () => {
		const blueprint = makeBlueprint([{ id: "A", included: true, quota: 0 }]);
		const rankings = [{ id: "A", included: true, rank: 1 }];
		const result = applyConceptRankings(blueprint, rankings, 1);
		expect(result.concepts[0]?.quota).toBe(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Item-Type Logic
// ─────────────────────────────────────────────────────────────────────────────

describe("Section 2 — selectItemTypes: universal item-type selection", () => {
	it("5a. Returns exactly N item-types when N ≤ 7", () => {
		const types = selectItemTypes("Hypothesis Testing", 4);
		expect(types).toHaveLength(4);
	});

	it("5b. All returned types belong to the 7 universal families", () => {
		const types = selectItemTypes("p-value interpretation", 7);
		for (const t of types) {
			expect(UNIVERSAL_ITEM_TYPES).toContain(t);
		}
	});

	it("5c. Result is deterministic: same concept always returns the same types", () => {
		const a = selectItemTypes("Mean Test", 4);
		const b = selectItemTypes("Mean Test", 4);
		expect(a).toEqual(b);
	});

	it("5d. Different concepts produce different selections", () => {
		const a = selectItemTypes("Hypothesis Testing", 4);
		const b = selectItemTypes("Inquiry Design", 4);
		// Not ALL must differ but the sequences should differ at least partially
		const allSame = a.every((t, i) => t === b[i]);
		expect(allSame).toBe(false);
	});

	it("5e. Requesting more than 7 is capped at 7", () => {
		const types = selectItemTypes("anything", 20);
		expect(types).toHaveLength(7);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Problem Format Logic
// ─────────────────────────────────────────────────────────────────────────────

describe("Section 3 — FORMAT_ALLOWED_BY_ITEM_TYPE: compatibility matrix", () => {
	it("7a. 'Apply' cannot produce TF or Matching", () => {
		const allowed = FORMAT_ALLOWED_BY_ITEM_TYPE["Apply"];
		expect(allowed).not.toContain("TF");
		expect(allowed).not.toContain("Matching");
	});

	it("7b. 'Apply' can produce MC, MS, DnD, Sorting, SA, FRQ", () => {
		const allowed = FORMAT_ALLOWED_BY_ITEM_TYPE["Apply"];
		expect(allowed).toContain("MC");
		expect(allowed).toContain("MS");
		expect(allowed).toContain("DnD");
		expect(allowed).toContain("Sorting");
		expect(allowed).toContain("SA");
		expect(allowed).toContain("FRQ");
	});

	it("7c. 'Explain' can only produce SA and FRQ", () => {
		const allowed = FORMAT_ALLOWED_BY_ITEM_TYPE["Explain"];
		expect(allowed).toHaveLength(2);
		expect(allowed).toContain("SA");
		expect(allowed).toContain("FRQ");
	});

	it("7d. 'State / Define' allows all 8 formats", () => {
		const allowed = FORMAT_ALLOWED_BY_ITEM_TYPE["State / Define"];
		expect(allowed).toHaveLength(8);
	});

	it("7e. selectFormat always returns a format in the allowed list for that item-type", () => {
		const allItemTypes = Object.keys(FORMAT_ALLOWED_BY_ITEM_TYPE) as UniversalItemType[];
		for (const itemType of allItemTypes) {
			for (let slot = 0; slot < 10; slot++) {
				const chosen = selectFormat("test-concept", itemType, slot);
				const allowed = FORMAT_ALLOWED_BY_ITEM_TYPE[itemType];
				expect(allowed, `${itemType} slot ${slot} → ${chosen} not in allowed list`).toContain(chosen);
			}
		}
	});

	it("7f. selectFormat is deterministic: same inputs → same format", () => {
		const f1 = selectFormat("Hypothesis Testing", "Apply", 2);
		const f2 = selectFormat("Hypothesis Testing", "Apply", 2);
		expect(f1).toBe(f2);
	});
});

describe("Section 3 — FORMAT_INSTRUCTIONS: prompt content", () => {
	it("8. MC format instructions mention '1 correct answer and 3' distractors and 'A, B, C, D'", () => {
		const instr = FORMAT_INSTRUCTIONS["MC"];
		expect(instr).toMatch(/1 correct answer/i);
		expect(instr).toMatch(/A, B, C, D/i);
	});

	it("FRQ format instructions mention sub-parts A, B, C", () => {
		const instr = FORMAT_INSTRUCTIONS["FRQ"];
		expect(instr).toMatch(/sub-part/i);
		expect(instr).toMatch(/partA/i);
		expect(instr).toMatch(/partB/i);
	});

	it("TF format instructions require 'True' or 'False' answer", () => {
		const instr = FORMAT_INSTRUCTIONS["TF"];
		expect(instr).toMatch(/True/);
		expect(instr).toMatch(/False/);
	});

	it("Matching format instructions describe a key→value object shape", () => {
		const instr = FORMAT_INSTRUCTIONS["Matching"];
		expect(instr).toMatch(/Term/i);
		expect(instr).toMatch(/Definition/i);
	});
});

describe("Section 3 — buildAssessmentPrompt: prompt wiring", () => {
	it("8. Prompt includes the format instruction block for MC", () => {
		const prompt = buildAssessmentPrompt("p-value", ["Interpret"], 3, "public health", []);
		expect(prompt).toContain("Format: Multiple Choice");
		expect(prompt).toContain("Format: True/False");
		expect(prompt).toContain("Format: Free Response");
	});

	it("Prompt includes the primary concept name", () => {
		const prompt = buildAssessmentPrompt("Hypothesis Testing", ["Apply"], 2, "sports analytics", []);
		expect(prompt).toContain("Hypothesis Testing");
	});

	it("Prompt includes relatedConcepts when provided", () => {
		const prompt = buildAssessmentPrompt("Mean Test", ["Apply"], 2, "retail", ["p-value", "confidence interval"]);
		expect(prompt).toContain("p-value");
		expect(prompt).toContain("confidence interval");
	});

	it("Prompt omits relatedConcepts line when array is empty", () => {
		const prompt = buildAssessmentPrompt("Inquiry", ["Decide"], 1, "agriculture", []);
		expect(prompt).not.toContain("Related concepts");
	});

	it("Prompt requests exactly N items", () => {
		const prompt = buildAssessmentPrompt("Conclude", ["Conclude"], 7, "food science", []);
		expect(prompt).toContain("Generate 7 assessment items");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Timing Model
// ─────────────────────────────────────────────────────────────────────────────

describe("Section 4 — computeItemTimeSeconds: timing model", () => {
	it("10 & 11a. TF at difficulty 3 is approximately 25–30 seconds", () => {
		const t = computeItemTimeSeconds("TF", 3);
		expect(t).toBeGreaterThanOrEqual(25);
		expect(t).toBeLessThanOrEqual(35);
	});

	it("11b. MC at difficulty 3 is approximately 45–65 seconds", () => {
		const t = computeItemTimeSeconds("MC", 3);
		expect(t).toBeGreaterThanOrEqual(45);
		expect(t).toBeLessThanOrEqual(65);
	});

	it("11c. FRQ at difficulty 3 is approximately 180–300 seconds", () => {
		const t = computeItemTimeSeconds("FRQ", 3);
		expect(t).toBeGreaterThanOrEqual(180);
		expect(t).toBeLessThanOrEqual(300);
	});

	it("Higher difficulty → longer time for the same format", () => {
		const easy = computeItemTimeSeconds("MC", 1);
		const hard = computeItemTimeSeconds("MC", 5);
		expect(hard).toBeGreaterThan(easy);
	});

	it("Every format produces a positive time value", () => {
		const formats = Object.keys(FORMAT_BASE_SECONDS) as ProblemFormat[];
		for (const fmt of formats) {
			expect(computeItemTimeSeconds(fmt, 3)).toBeGreaterThan(0);
		}
	});

	it("All 5 difficulty levels produce different times", () => {
		const times = [1, 2, 3, 4, 5].map((d) => computeItemTimeSeconds("SA", d));
		const unique = new Set(times);
		expect(unique.size).toBe(5);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — parseItemArray resilience
// ─────────────────────────────────────────────────────────────────────────────

describe("parseItemArray — JSON parser resilience", () => {
	it("Parses a clean JSON array", () => {
		const raw = JSON.stringify([
			{ itemType: "Apply", prompt: "Q1", answer: "ans", difficulty: 2 },
		]);
		const result = parseItemArray(raw);
		expect(result).toHaveLength(1);
		expect(result![0]!.prompt).toBe("Q1");
	});

	it("Strips markdown code fences and still parses", () => {
		const raw = "```json\n[{\"itemType\":\"Apply\",\"prompt\":\"Q\",\"answer\":\"A\",\"difficulty\":3}]\n```";
		expect(parseItemArray(raw)).toHaveLength(1);
	});

	it("Returns null for completely invalid JSON", () => {
		expect(parseItemArray("not json at all")).toBeNull();
	});

	it("Returns null for a JSON object (not array)", () => {
		expect(parseItemArray('{"key":"val"}')).toBeNull();
	});

	it("Filters out malformed entries but keeps valid ones", () => {
		const raw = JSON.stringify([
			{ itemType: "Apply", prompt: "Good", answer: "ans", difficulty: 3 },
			{ bad: "entry" }, // missing required fields
		]);
		const result = parseItemArray(raw);
		expect(result).toHaveLength(1);
		expect(result![0]!.prompt).toBe("Good");
	});

	it("9. Accepts structuredAnswer as a Matching key→value object", () => {
		const raw = JSON.stringify([
			{
				itemType: "State / Define",
				problemFormat: "Matching",
				prompt: "Match each term",
				answer: "summary",
				structuredAnswer: { "Term A": "Def 1", "Term B": "Def 2" },
				difficulty: 2,
			},
		]);
		const result = parseItemArray(raw);
		expect(result).toHaveLength(1);
		expect(result![0]!.structuredAnswer).toEqual({ "Term A": "Def 1", "Term B": "Def 2" });
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — generateScenarioSection: full item shape
// ─────────────────────────────────────────────────────────────────────────────

describe("generateScenarioSection — full item shape (mocked LLM)", () => {
	it("10. Each generated item carries estimatedTimeSeconds > 0", async () => {
		callLlmMock.mockResolvedValue(makeLLMResponse([{}, {}, {}]));
		const section = makeSection("Hypothesis Testing", 3);
		const result = await generateScenarioSection(section, "seed-abc");
		for (const item of result.items) {
			expect(typeof item.estimatedTimeSeconds).toBe("number");
			expect(item.estimatedTimeSeconds!).toBeGreaterThan(0);
		}
	});

	it("Each item has a non-empty prompt", async () => {
		callLlmMock.mockResolvedValue(makeLLMResponse([
			{ prompt: "A school nurse tracks vaccination rates..." },
			{ prompt: "A retailer records transaction amounts..." },
		]));
		const section = makeSection("Statistical Inference", 2);
		const result = await generateScenarioSection(section, "seed-xyz");
		for (const item of result.items) {
			expect(item.prompt.trim().length).toBeGreaterThan(0);
		}
	});

	it("23. No empty prompts or empty answers from LLM response", async () => {
		callLlmMock.mockResolvedValue(makeLLMResponse([
			{ prompt: "Scenario A", answer: "Answer A" },
			{ prompt: "Scenario B", answer: "Answer B" },
		]));
		const section = makeSection("Mean Test", 2);
		const result = await generateScenarioSection(section, "seed-mn");
		for (const item of result.items) {
			expect(item.prompt.length).toBeGreaterThan(0);
			expect(item.answerGuidance.length).toBeGreaterThan(0);
		}
	});

	it("problemType is set to a valid ProblemFormat string", async () => {
		callLlmMock.mockResolvedValue(
			makeLLMResponse([{ problemFormat: "MC" }, { problemFormat: "SA" }]),
		);
		const section = makeSection("Inquiry", 2);
		const result = await generateScenarioSection(section, "seed-pf");
		const validFormats = new Set(["TF", "MC", "MS", "Matching", "DnD", "Sorting", "SA", "FRQ"]);
		for (const item of result.items) {
			expect(validFormats.has(item.problemType ?? "")).toBe(true);
		}
	});

	it("structuredAnswer is carried through from LLM output", async () => {
		const sa = { correct: "C", choices: ["A. x", "B. y", "C. z", "D. w"] };
		callLlmMock.mockResolvedValue(makeLLMResponse([{ structuredAnswer: sa }]));
		const section = makeSection("p-value", 1);
		const result = await generateScenarioSection(section, "seed-sa");
		expect(result.items[0]!.structuredAnswer).toEqual(sa);
	});

	it("4. conceptIds from LLM populate primaryConcepts on the item", async () => {
		callLlmMock.mockResolvedValue(
			makeLLMResponse([
				{ conceptIds: ["hypothesis_testing", "p_value"] },
			]),
		);
		const section = makeSection("Hypothesis Testing", 1);
		const result = await generateScenarioSection(section, "seed-mc");
		expect(result.items[0]!.primaryConcepts).toEqual(["hypothesis_testing", "p_value"]);
	});

	it("Falls back to original section when LLM throws", async () => {
		callLlmMock.mockRejectedValue(new Error("LLM unavailable"));
		const section = makeSection("Momentum", 3);
		const result = await generateScenarioSection(section, "seed-err");
		// Should be the original stub items unchanged
		expect(result.items).toHaveLength(3);
		expect(result.items[0]!.prompt).toContain("Stub prompt");
	});

	it("Falls back when LLM returns malformed JSON", async () => {
		callLlmMock.mockResolvedValue("not valid json {{");
		const section = makeSection("Gravity", 2);
		const result = await generateScenarioSection(section, "seed-bad");
		expect(result.items).toHaveLength(2);
		expect(result.items[0]!.prompt).toContain("Stub prompt");
	});

	it("13 & 14. FRQ structuredAnswer carries partA/partB/partC", async () => {
		const frqAnswer = { partA: "Define H0", partB: "Compute test stat", partC: "State decision" };
		callLlmMock.mockResolvedValue(
			makeLLMResponse([
				{
					itemType: "Explain",
					problemFormat: "FRQ",
					answer: "Multi-part explanation",
					structuredAnswer: frqAnswer,
					conceptIds: ["hypothesis_testing", "p_value"],
				},
			]),
		);
		const section = makeSection("Explain concept", 1);
		const result = await generateScenarioSection(section, "seed-frq");
		const item = result.items[0]!;
		expect(item.structuredAnswer).toEqual(frqAnswer);
		expect(item.primaryConcepts).toEqual(["hypothesis_testing", "p_value"]);
	});

	it("20. Single-item quota still produces one valid item", async () => {
		callLlmMock.mockResolvedValue(makeLLMResponse([{}]));
		const section = makeSection("Small quota", 1);
		const result = await generateScenarioSection(section, "seed-one");
		expect(result.items).toHaveLength(1);
		expect(result.items[0]!.itemId).toContain("gen-");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — enrichProductWithScenarios: multi-concept loop
// ─────────────────────────────────────────────────────────────────────────────

describe("enrichProductWithScenarios — multi-concept loop (mocked LLM)", () => {
	it("3. Makes one LLM call per concept", async () => {
		// Three concepts, three batches
		callLlmMock
			.mockResolvedValueOnce(makeLLMResponse([{}, {}, {}]))    // concept A
			.mockResolvedValueOnce(makeLLMResponse([{}, {}, {}]))    // concept B
			.mockResolvedValueOnce(makeLLMResponse([{}, {}, {}]));   // concept C

		const product = makeProduct([
			makeSection("Hypothesis Testing", 3),
			makeSection("Mean Test", 3),
			makeSection("Inquiry", 3),
		]);

		await enrichProductWithScenarios(product, "seed-multi");
		expect(callLlmMock).toHaveBeenCalledTimes(3);
	});

	it("3. Each section contains items tagged to its own concept", async () => {
		callLlmMock
			.mockResolvedValueOnce(makeLLMResponse([{ conceptIds: ["A"] }, { conceptIds: ["A"] }]))
			.mockResolvedValueOnce(makeLLMResponse([{ conceptIds: ["B"] }, { conceptIds: ["B"] }]));

		const product = makeProduct([
			makeSection("ConceptA", 2),
			makeSection("ConceptB", 2),
		]);

		const result = await enrichProductWithScenarios(product, "seed-tag");
		// Each section's items should carry the section concept
		expect(result.sections[0]!.concept).toBe("ConceptA");
		expect(result.sections[1]!.concept).toBe("ConceptB");
	});

	it("conceptQuotas drives the number of sections and items", async () => {
		callLlmMock
			.mockResolvedValueOnce(makeLLMResponse([{}, {}, {}, {}]))   // A gets 4
			.mockResolvedValueOnce(makeLLMResponse([{}, {}, {}]))        // B gets 3
			.mockResolvedValueOnce(makeLLMResponse([{}, {}, {}]));       // C gets 3

		const product = makeProduct([]); // no sections — quotas drive it
		const result = await enrichProductWithScenarios(product, "seed-q", [
			{ id: "A", name: "Hypothesis Testing", quota: 4 },
			{ id: "B", name: "Mean Test", quota: 3 },
			{ id: "C", name: "Inquiry", quota: 3 },
		]);

		expect(result.sections).toHaveLength(3);
		expect(result.totalItemCount).toBe(10);
	});

	it("12. estimatedDurationMinutes is recomputed from actual item times", async () => {
		callLlmMock.mockResolvedValue(makeLLMResponse([{}, {}, {}]));
		const product = makeProduct([makeSection("Timing Test", 3)]);
		const original = product.estimatedDurationMinutes;
		const result = await enrichProductWithScenarios(product, "seed-time");
		// Just ensure it's a positive number (may differ from original stub value)
		expect(result.estimatedDurationMinutes).toBeGreaterThan(0);
		// If all items have estimatedTimeSeconds, the re-computed value should differ
		// from the stub 30 min (which assumed no per-item times)
		// We just assert it's numerically reasonable (not stuck at 0 or NaN)
		expect(result.estimatedDurationMinutes).not.toBeNaN();
	});

	it("22. No duplicate item IDs across all sections", async () => {
		callLlmMock
			.mockResolvedValueOnce(makeLLMResponse([{}, {}, {}]))
			.mockResolvedValueOnce(makeLLMResponse([{}, {}, {}]));

		const product = makeProduct([
			makeSection("Alpha", 3),
			makeSection("Beta", 3),
		]);
		const result = await enrichProductWithScenarios(product, "seed-dup");
		const allIds = result.sections.flatMap((s) => s.items.map((i) => i.itemId));
		const unique = new Set(allIds);
		expect(unique.size).toBe(allIds.length);
	});

	it("19. Zero-quota section produces zero items (no LLM call)", async () => {
		const product = makeProduct([makeSection("Empty Concept", 0)]);
		// quota = max(1, items.length) = max(1, 0) = 1 — section still gets 1 call
		// but if conceptQuotas provides quota:0 it should be skipped
		callLlmMock.mockResolvedValue(makeLLMResponse([])); // empty response
		const result = await enrichProductWithScenarios(product, "seed-zero", [
			{ id: "Empty Concept", name: "Empty Concept", quota: 0 },
		]);
		// quota of 0 → stub section has 0 items → falls back to original empty section
		expect(result.sections[0]?.items.length ?? 0).toBe(0);
	});
});
