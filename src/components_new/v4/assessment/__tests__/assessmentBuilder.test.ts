import { describe, test, expect } from "vitest";
import { buildAssessment } from "../builder/controller";
import type { ConceptGroup } from "../../conceptGrouping";

const twoGroups: ConceptGroup[] = [
	{
		parentId: "null-hypothesis",
		parentLabel: "Null hypothesis",
		questionCount: 5,
		children: [{ id: "alt-hypothesis", label: "Alternative hypothesis", weight: 2.0, questionCount: 3 }],
	},
	{
		parentId: "p-value",
		parentLabel: "P-value",
		questionCount: 5,
		children: [],
	},
];

describe("buildAssessment — item count", () => {
	test("produces exactly N items", async () => {
		const assessment = await buildAssessment(twoGroups, {
			count: 10,
			types: ["mc", "short_answer"],
			difficulty: "mixed",
		});
		expect(assessment.items).toHaveLength(10);
	});

	test("never returns more than req.count items", async () => {
		const assessment = await buildAssessment(twoGroups, {
			count: 3,
			types: ["mc"],
			difficulty: "easy",
		});
		expect(assessment.items.length).toBeLessThanOrEqual(3);
	});
});

describe("buildAssessment — structure", () => {
	test("every item has a non-empty id and stem", async () => {
		const assessment = await buildAssessment(twoGroups, {
			count: 6,
			types: ["mc"],
			difficulty: "mixed",
		});
		for (const item of assessment.items) {
			expect(item.id).toBeTruthy();
			expect(item.stem).toBeTruthy();
		}
	});

	test("totalTimeSeconds equals sum of estimatedTimeSeconds", async () => {
		const assessment = await buildAssessment(twoGroups, {
			count: 5,
			types: ["mc"],
			difficulty: "easy",
		});
		const computed = assessment.items.reduce((s, i) => s + i.estimatedTimeSeconds, 0);
		expect(assessment.totalTimeSeconds).toBe(computed);
	});

	test("conceptCoverage keys are subset of requested concept IDs", async () => {
		const assessment = await buildAssessment(twoGroups, {
			count: 4,
			types: ["mc"],
			difficulty: "easy",
		});
		const knownIds = new Set(twoGroups.map((g) => g.parentId));
		for (const key of Object.keys(assessment.conceptCoverage)) {
			expect(knownIds.has(key)).toBe(true);
		}
	});
});
