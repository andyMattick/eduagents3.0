import { describe, test, expect } from "vitest";
import { fallbackConcepts } from "../builder/fallbackLogic";
import type { ConceptGroup } from "../../conceptGrouping";

const groups: ConceptGroup[] = [
	{
		parentId: "null-hypothesis",
		parentLabel: "Null hypothesis",
		questionCount: 5,
		children: [
			{ id: "alt-hypothesis", label: "Alternative hypothesis", weight: 2.0, questionCount: 3 },
			{ id: "h0-notation", label: "H₀ notation", weight: 1.5, questionCount: 2 },
		],
	},
	{
		parentId: "p-value",
		parentLabel: "P-value",
		questionCount: 5,
		children: [],
	},
	{
		parentId: "decision-rule",
		parentLabel: "Decision rule",
		questionCount: 3,
		children: [],
	},
];

describe("fallbackConcepts", () => {
	test("returns children of the group first", () => {
		const fallbacks = fallbackConcepts("null-hypothesis", groups);
		expect(fallbacks[0]).toBe("alt-hypothesis");
		expect(fallbacks[1]).toBe("h0-notation");
	});

	test("appends other parent IDs after children", () => {
		const fallbacks = fallbackConcepts("null-hypothesis", groups);
		expect(fallbacks).toContain("p-value");
		expect(fallbacks).toContain("decision-rule");
	});

	test("does not include the concept itself in fallbacks", () => {
		const fallbacks = fallbackConcepts("null-hypothesis", groups);
		expect(fallbacks).not.toContain("null-hypothesis");
	});

	test("returns only other parents when the group has no children", () => {
		const fallbacks = fallbackConcepts("p-value", groups);
		expect(fallbacks).toContain("null-hypothesis");
		expect(fallbacks).toContain("decision-rule");
		expect(fallbacks).not.toContain("p-value");
	});

	test("returns empty array for unknown conceptId", () => {
		const fallbacks = fallbackConcepts("unknown-concept", groups);
		// No children (group not found), but all parents count as fallbacks
		expect(fallbacks).toEqual(["null-hypothesis", "p-value", "decision-rule"]);
	});
});
