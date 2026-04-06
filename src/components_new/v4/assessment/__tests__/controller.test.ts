import { describe, test, expect } from "vitest";
import { buildAssessment } from "../builder/controller";
import type { ConceptGroup } from "../../conceptGrouping";

const threeGroups: ConceptGroup[] = [
	{ parentId: "null-hypothesis", parentLabel: "Null hypothesis", questionCount: 5, children: [] },
	{ parentId: "p-value", parentLabel: "P-value", questionCount: 5, children: [] },
	{ parentId: "decision-rule", parentLabel: "Decision rule", questionCount: 3, children: [] },
];

describe("controller — correct count", () => {
	test("builds exactly 10 items", async () => {
		const result = await buildAssessment(threeGroups, {
			count: 10,
			types: ["mc", "short_answer"],
			difficulty: "mixed",
		});
		expect(result.items).toHaveLength(10);
	});

	test("builds exactly 1 item", async () => {
		const result = await buildAssessment(threeGroups, {
			count: 1,
			types: ["mc"],
			difficulty: "easy",
		});
		expect(result.items).toHaveLength(1);
	});

	test("builds exactly 15 items across 3 types", async () => {
		const result = await buildAssessment(threeGroups, {
			count: 15,
			types: ["mc", "short_answer", "frq"],
			difficulty: "hard",
		});
		expect(result.items).toHaveLength(15);
	});
});

describe("controller — totals", () => {
	test("totalTimeSeconds is non-negative", async () => {
		const result = await buildAssessment(threeGroups, {
			count: 5,
			types: ["mc"],
			difficulty: "easy",
		});
		expect(result.totalTimeSeconds).toBeGreaterThanOrEqual(0);
	});

	test("assessment id starts with 'assessment-'", async () => {
		const result = await buildAssessment(threeGroups, {
			count: 4,
			types: ["mc"],
			difficulty: "easy",
		});
		expect(result.id).toMatch(/^assessment-/);
	});
});

describe("controller — focusConceptIds", () => {
	test("only generates items for focused concepts", async () => {
		const result = await buildAssessment(threeGroups, {
			count: 4,
			types: ["mc"],
			difficulty: "easy",
			focusConceptIds: ["p-value"],
		});
		for (const item of result.items) {
			expect(item.concepts).toContain("p-value");
		}
	});
});
