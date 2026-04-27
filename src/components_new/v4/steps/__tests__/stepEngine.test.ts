import { describe, it, expect } from "vitest";
import { computeStepCount } from "../stepEngine";
import { analyzeStructure } from "../structureParser";
import { adjustForDifficulty } from "../difficultyAdjustments";
import { adjustForScenario } from "../scenarioAdjustments";
import { adjustForLearner } from "../learnerAdjustments";
import { getConceptStepRange } from "../conceptStepRange";
import type { StepContext } from "../stepTypes";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const statsConcept = { typicalStepRange: [2, 4] as [number, number] };
const mathConcept  = { typicalStepRange: [4, 6] as [number, number] };
const elaConcept   = { typicalStepRange: [3, 5] as [number, number] };

function ctx(overrides: Partial<StepContext> = {}): StepContext {
	return {
		conceptId: "test.concept",
		difficulty: "medium",
		scenarioComplexity: "medium",
		learnerProfile: "core",
		problemText: "Solve for x.",
		...overrides,
	};
}

// ── conceptStepRange ──────────────────────────────────────────────────────────

describe("getConceptStepRange", () => {
	it("returns concept typicalStepRange when present", () => {
		expect(getConceptStepRange({ typicalStepRange: [3, 5] })).toEqual([3, 5]);
	});

	it("returns default [2, 4] for null concept", () => {
		expect(getConceptStepRange(null)).toEqual([2, 4]);
	});

	it("returns default [2, 4] for concept without typicalStepRange", () => {
		expect(getConceptStepRange({})).toEqual([2, 4]);
	});
});

// ── adjustForDifficulty ───────────────────────────────────────────────────────

describe("adjustForDifficulty", () => {
	it("decrements by 1 for easy", () => {
		expect(adjustForDifficulty(4, "easy")).toBe(3);
	});

	it("increments by 1 for hard", () => {
		expect(adjustForDifficulty(4, "hard")).toBe(5);
	});

	it("is neutral for medium", () => {
		expect(adjustForDifficulty(4, "medium")).toBe(4);
	});
});

// ── adjustForScenario ─────────────────────────────────────────────────────────

describe("adjustForScenario", () => {
	it("increments by 1 for high complexity", () => {
		expect(adjustForScenario(4, "high")).toBe(5);
	});

	it("is neutral for medium", () => {
		expect(adjustForScenario(4, "medium")).toBe(4);
	});

	it("is neutral for low", () => {
		expect(adjustForScenario(4, "low")).toBe(4);
	});
});

// ── adjustForLearner ─────────────────────────────────────────────────────────

describe("adjustForLearner", () => {
	it("increments by 1 for support", () => {
		expect(adjustForLearner(4, "support")).toBe(5);
	});

	it("increments by 1 for accessible", () => {
		expect(adjustForLearner(4, "accessible")).toBe(5);
	});

	it("increments by 2 for iep504", () => {
		expect(adjustForLearner(4, "iep504")).toBe(6);
	});

	it("decrements by 1 for challenge", () => {
		expect(adjustForLearner(4, "challenge")).toBe(3);
	});

	it("is neutral for core", () => {
		expect(adjustForLearner(4, "core")).toBe(4);
	});
});

// ── analyzeStructure ─────────────────────────────────────────────────────────

describe("analyzeStructure", () => {
	it("detects distribution parentheses", () => {
		const r = analyzeStructure("Distribute 3(x + 2) and simplify.");
		expect(r.hasParentheses).toBe(true);
		expect(r.operations).toBeGreaterThanOrEqual(1);
	});

	it("detects p-value operation", () => {
		const r = analyzeStructure("Compute the p-value for the test.");
		expect(r.operations).toBeGreaterThanOrEqual(1);
	});

	it("detects variable on both sides", () => {
		const r = analyzeStructure("Solve 3x + 2 = x - 4.");
		expect(r.variableBothSides).toBe(true);
	});

	it("detects equation representation", () => {
		const r = analyzeStructure("Use the equation below to find the slope.");
		expect(r.representations).toContain("equation");
	});

	it("detects graph representation", () => {
		const r = analyzeStructure("Looking at the graph, determine the maximum.");
		expect(r.representations).toContain("graph");
	});

	it("detects table representation", () => {
		const r = analyzeStructure("Refer to the table of values provided.");
		expect(r.representations).toContain("table");
	});

	it("returns low complexity for a short text", () => {
		const r = analyzeStructure("What is 2 + 2?");
		expect(r.scenarioComplexity).toBe("low");
	});

	it("returns high complexity for a long, densely-connected text", () => {
		const longText = "A researcher collected data from 150 patients, however the results were inconclusive, and because the sample size was large but the variance was high, the team decided to re-examine the null hypothesis and therefore ran additional tests, although the funding was limited, but the conclusions were drawn from multiple analyses because the study required it.";
		const r = analyzeStructure(longText);
		expect(r.scenarioComplexity).toBe("high");
	});
});

// ── computeStepCount — clamping and bounds ───────────────────────────────────

describe("computeStepCount — clamping", () => {
	it("result is at least the concept min", () => {
		const result = computeStepCount(statsConcept, ctx({ difficulty: "easy", learnerProfile: "challenge" }));
		expect(result).toBeGreaterThanOrEqual(statsConcept.typicalStepRange[0]);
	});

	it("result does not exceed the concept max", () => {
		const result = computeStepCount(mathConcept, ctx({
			difficulty: "hard",
			learnerProfile: "iep504",
			problemText: "Distribute 3(x + 2) and isolate x. Solve for x using the equation and the graph.",
		}));
		expect(result).toBeLessThanOrEqual(mathConcept.typicalStepRange[1]);
	});

	it("is always at least 1", () => {
		const result = computeStepCount({ typicalStepRange: [1, 1] }, ctx({ difficulty: "easy", learnerProfile: "challenge" }));
		expect(result).toBeGreaterThanOrEqual(1);
	});
});

// ── computeStepCount — teacher override ──────────────────────────────────────

describe("computeStepCount — teacher override", () => {
	it("returns the override directly, bypassing all computation", () => {
		const result = computeStepCount(mathConcept, ctx({ teacherStepOverride: 8 }));
		expect(result).toBe(8);
	});

	it("clamps override to 1 if teacher passes 0", () => {
		const result = computeStepCount(mathConcept, ctx({ teacherStepOverride: 0 }));
		expect(result).toBe(1);
	});
});

// ── computeStepCount — null concept ──────────────────────────────────────────

describe("computeStepCount — null concept", () => {
	it("handles null concept gracefully", () => {
		const result = computeStepCount(null, ctx());
		expect(result).toBeGreaterThanOrEqual(1);
	});

	it("handles undefined concept gracefully", () => {
		const result = computeStepCount(undefined, ctx());
		expect(result).toBeGreaterThanOrEqual(1);
	});
});

// ── computeStepCount — concept-aware ranges ──────────────────────────────────

describe("computeStepCount — concept-aware step ranges", () => {
	it("stats concept (shallow range) stays within [2, 4]", () => {
		const result = computeStepCount(statsConcept, ctx({ difficulty: "medium" }));
		expect(result).toBeGreaterThanOrEqual(2);
		expect(result).toBeLessThanOrEqual(4);
	});

	it("math concept (deeper range) stays within [4, 6]", () => {
		const result = computeStepCount(mathConcept, ctx({ difficulty: "medium" }));
		expect(result).toBeGreaterThanOrEqual(4);
		expect(result).toBeLessThanOrEqual(6);
	});

	it("ela concept stays within [3, 5]", () => {
		const result = computeStepCount(elaConcept, ctx({ difficulty: "medium" }));
		expect(result).toBeGreaterThanOrEqual(3);
		expect(result).toBeLessThanOrEqual(5);
	});
});

// ── computeStepCount — learner profiles ──────────────────────────────────────

describe("computeStepCount — learner profile monotonicity", () => {
	const base = ctx({ difficulty: "medium", problemText: "Solve for x." });

	it("support >= core", () => {
		const core    = computeStepCount(statsConcept, { ...base, learnerProfile: "core" });
		const support = computeStepCount(statsConcept, { ...base, learnerProfile: "support" });
		expect(support).toBeGreaterThanOrEqual(core);
	});

	it("iep504 >= support", () => {
		const support = computeStepCount(statsConcept, { ...base, learnerProfile: "support" });
		const iep     = computeStepCount(statsConcept, { ...base, learnerProfile: "iep504" });
		expect(iep).toBeGreaterThanOrEqual(support);
	});

	it("challenge <= core", () => {
		const core      = computeStepCount(statsConcept, { ...base, learnerProfile: "core" });
		const challenge = computeStepCount(statsConcept, { ...base, learnerProfile: "challenge" });
		expect(challenge).toBeLessThanOrEqual(core);
	});
});

// ── computeStepCount — difficulty monotonicity ───────────────────────────────

describe("computeStepCount — difficulty monotonicity", () => {
	it("hard >= medium for the same item", () => {
		const medium = computeStepCount(mathConcept, ctx({ difficulty: "medium" }));
		const hard   = computeStepCount(mathConcept, ctx({ difficulty: "hard" }));
		expect(hard).toBeGreaterThanOrEqual(medium);
	});

	it("medium >= easy for the same item", () => {
		const easy   = computeStepCount(mathConcept, ctx({ difficulty: "easy" }));
		const medium = computeStepCount(mathConcept, ctx({ difficulty: "medium" }));
		expect(medium).toBeGreaterThanOrEqual(easy);
	});
});
