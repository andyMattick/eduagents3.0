/**
 * End-to-end tests for the Assessment Builder pipeline.
 *
 * The API endpoint (/api/v4/studio/generateItems) is unreachable in the test
 * environment, so generatorOrchestrator falls back to deterministic placeholder
 * items. That is intentional — these tests validate the full pipeline shape:
 * count → type → difficulty → concept allocation → output structure.
 */

import { describe, test, expect } from "vitest";
import { buildAssessment } from "../builder/controller";
import type { ConceptGroup } from "../../conceptGrouping";
import type { AssessmentItem } from "../assessmentTypes";

// ---------------------------------------------------------------------------
// Rich multi-concept fixture (simulates a real session with 4 parent groups)
// ---------------------------------------------------------------------------

const statsGroups: ConceptGroup[] = [
	{
		parentId: "null-hypothesis",
		parentLabel: "Null hypothesis",
		questionCount: 4,
		children: [
			{ id: "alt-hypothesis", label: "Alternative hypothesis", weight: 2.0, questionCount: 2 },
		],
	},
	{
		parentId: "p-value",
		parentLabel: "P-value",
		questionCount: 5,
		children: [],
	},
	{
		parentId: "confidence-interval",
		parentLabel: "Confidence interval",
		questionCount: 3,
		children: [
			{ id: "margin-of-error", label: "Margin of error", weight: 1.5, questionCount: 2 },
		],
	},
	{
		parentId: "decision-rule",
		parentLabel: "Decision rule",
		questionCount: 3,
		children: [],
	},
];

// ---------------------------------------------------------------------------
// 1. Count enforcement
// ---------------------------------------------------------------------------

describe("e2e — count enforcement", () => {
	test("returns exactly 12 items for a 4-concept session", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 12,
			types: ["mc", "short_answer"],
			difficulty: "mixed",
		});
		expect(result.items).toHaveLength(12);
	});

	test("returns exactly 1 item", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 1,
			types: ["mc"],
			difficulty: "easy",
		});
		expect(result.items).toHaveLength(1);
	});

	test("returns exactly 20 items (max cap)", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 20,
			types: ["mc", "short_answer", "frq"],
			difficulty: "hard",
		});
		expect(result.items).toHaveLength(20);
	});

	test("never returns extra items when count is odd", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 7,
			types: ["mc", "short_answer"],
			difficulty: "easy",
		});
		expect(result.items).toHaveLength(7);
	});
});

// ---------------------------------------------------------------------------
// 2. Type enforcement
// ---------------------------------------------------------------------------

describe("e2e — type enforcement", () => {
	test("only mc items when types=['mc']", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 8,
			types: ["mc"],
			difficulty: "easy",
		});
		for (const item of result.items) {
			expect(item.type).toBe("mc");
		}
	});

	test("only short_answer items when types=['short_answer']", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 6,
			types: ["short_answer"],
			difficulty: "medium",
		});
		for (const item of result.items) {
			expect(item.type).toBe("short_answer");
		}
	});

	test("at least one of each requested type appears in a large set", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 15,
			types: ["mc", "short_answer", "frq"],
			difficulty: "mixed",
		});
		const typeSet = new Set(result.items.map((i: AssessmentItem) => i.type));
		expect(typeSet.has("mc")).toBe(true);
		expect(typeSet.has("short_answer")).toBe(true);
		expect(typeSet.has("frq")).toBe(true);
	});

	test("no items have a type outside the requested list", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 10,
			types: ["mc", "frq"],
			difficulty: "mixed",
		});
		for (const item of result.items) {
			expect(["mc", "frq"]).toContain(item.type);
		}
	});
});

// ---------------------------------------------------------------------------
// 3. Difficulty enforcement
// ---------------------------------------------------------------------------

describe("e2e — difficulty enforcement", () => {
	test("all items are 'easy' when difficulty='easy'", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 8,
			types: ["mc"],
			difficulty: "easy",
		});
		for (const item of result.items) {
			expect(item.difficulty).toBe("easy");
		}
	});

	test("all items are 'hard' when difficulty='hard'", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 6,
			types: ["short_answer"],
			difficulty: "hard",
		});
		for (const item of result.items) {
			expect(item.difficulty).toBe("hard");
		}
	});

	test("mixed mode produces all three difficulty levels in a set of 10", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 10,
			types: ["mc"],
			difficulty: "mixed",
		});
		const levels = new Set(result.items.map((i: AssessmentItem) => i.difficulty));
		expect(levels.has("easy")).toBe(true);
		expect(levels.has("medium")).toBe(true);
		expect(levels.has("hard")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 4. Concept coverage
// ---------------------------------------------------------------------------

describe("e2e — concept coverage", () => {
	test("conceptCoverage keys are parent concept IDs", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 8,
			types: ["mc"],
			difficulty: "easy",
		});
		const parentIds = new Set(statsGroups.map((g) => g.parentId));
		for (const key of Object.keys(result.conceptCoverage)) {
			expect(parentIds.has(key)).toBe(true);
		}
	});

	test("all 4 parent concepts appear in coverage for a sufficiently large set", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 12,
			types: ["mc"],
			difficulty: "easy",
		});
		const coveredIds = new Set(Object.keys(result.conceptCoverage));
		for (const group of statsGroups) {
			expect(coveredIds.has(group.parentId)).toBe(true);
		}
	});

	test("focusConceptIds restricts coverage to the focused concept only", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 4,
			types: ["mc"],
			difficulty: "easy",
			focusConceptIds: ["p-value"],
		});
		for (const item of result.items) {
			expect(item.concepts).toContain("p-value");
		}
	});

	test("conceptCoverage counts are positive integers", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 8,
			types: ["mc"],
			difficulty: "easy",
		});
		for (const count of Object.values(result.conceptCoverage)) {
			expect(count).toBeGreaterThan(0);
			expect(Number.isInteger(count)).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// 5. Output structure
// ---------------------------------------------------------------------------

describe("e2e — output structure", () => {
	test("assessment id starts with 'assessment-'", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 4,
			types: ["mc"],
			difficulty: "easy",
		});
		expect(result.id).toMatch(/^assessment-/);
	});

	test("every item has non-empty id, stem, and concepts; mc items have non-empty correctAnswer", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 10,
			types: ["mc", "short_answer"],
			difficulty: "mixed",
		});
		for (const item of result.items) {
			expect(item.id).toBeTruthy();
			expect(item.stem).toBeTruthy();
			expect(item.concepts.length).toBeGreaterThan(0);
			// mc placeholders always have a correctAnswer; open-ended types may return ""
			if (item.type === "mc") {
				expect(item.correctAnswer).toBeTruthy();
			}
		}
	});

	test("totalTimeSeconds equals sum of item estimatedTimeSeconds", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 10,
			types: ["mc", "short_answer", "frq"],
			difficulty: "mixed",
		});
		const computed = result.items.reduce(
			(sum: number, i: AssessmentItem) => sum + i.estimatedTimeSeconds,
			0,
		);
		expect(result.totalTimeSeconds).toBe(computed);
	});

	test("mc items have at least 2 options", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 6,
			types: ["mc"],
			difficulty: "easy",
		});
		for (const item of result.items) {
			expect(item.options?.length).toBeGreaterThanOrEqual(2);
		}
	});

	test("estimatedTimeSeconds is a positive number for every item", async () => {
		const result = await buildAssessment(statsGroups, {
			count: 8,
			types: ["mc", "short_answer"],
			difficulty: "hard",
		});
		for (const item of result.items) {
			expect(item.estimatedTimeSeconds).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// 6. Deterministic output
// ---------------------------------------------------------------------------

describe("e2e — deterministic output", () => {
	test("two identical calls produce the same item ids and stems", async () => {
		const req = {
			count: 8,
			types: ["mc"] as const,
			difficulty: "easy" as const,
		};
		const a = await buildAssessment(statsGroups, req);
		const b = await buildAssessment(statsGroups, req);

		const idsA = a.items.map((i: AssessmentItem) => i.id).join("|");
		const idsB = b.items.map((i: AssessmentItem) => i.id).join("|");
		expect(idsA).toBe(idsB);

		const stemsA = a.items.map((i: AssessmentItem) => i.stem).join("|");
		const stemsB = b.items.map((i: AssessmentItem) => i.stem).join("|");
		expect(stemsA).toBe(stemsB);
	});

	test("changing count changes the result", async () => {
		const base = await buildAssessment(statsGroups, {
			count: 4,
			types: ["mc"],
			difficulty: "easy",
		});
		const bigger = await buildAssessment(statsGroups, {
			count: 8,
			types: ["mc"],
			difficulty: "easy",
		});
		expect(base.items).toHaveLength(4);
		expect(bigger.items).toHaveLength(8);
		// Both are valid but different-length lists
		expect(base.items.length).not.toBe(bigger.items.length);
	});
});
