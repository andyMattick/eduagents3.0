/**
 * GOLDEN FIXTURE 1 — Statistics / Hypothesis Testing
 *
 * Document: Introductory statistics unit covering one-proportion z-tests.
 * This is the canonical reference fixture. The expected output is the
 * anti-regression anchor for all future changes to conceptGrouping.ts.
 */
import type { ConceptGroup, ConceptNode, Edge, ItemPlan } from "../../conceptGrouping";

export const nodes: ConceptNode[] = [
	{ id: "null-hypothesis", label: "Null Hypothesis", weight: 2.5 },
	{ id: "alternative-hypothesis", label: "Alternative Hypothesis", weight: 2.0 },
	{ id: "null-hypothesis-formulation", label: "Null Hypothesis Formulation", weight: 1.3 },
	{ id: "alternative-hypothesis-formulation", label: "Alternative Hypothesis Formulation", weight: 1.3 },
	{ id: "null-and-alternative-hypothesis-formulation", label: "Null and Alternative Hypothesis Formulation", weight: 1.2 },

	{ id: "p-value", label: "P-value", weight: 2.4 },
	{ id: "interpretation-of-p-value", label: "Interpretation of P-value", weight: 1.8 },
	{ id: "p-value-calculation", label: "P-value Calculation", weight: 1.6 },
	{ id: "p-value-calculation-one-proportion", label: "P-value Calculation (One-Proportion z-test)", weight: 1.5 },

	{ id: "decision-rule", label: "Decision Rule", weight: 2.1 },
	{ id: "decision-alpha-005", label: "Hypothesis Testing Decision (α = 0.05)", weight: 1.4 },
	{ id: "decision-alpha-001", label: "Hypothesis Testing Decision (α = 0.01)", weight: 1.4 },

	{ id: "one-proportion-test", label: "One-Proportion Hypothesis Test", weight: 2.0 },
];

export const edges: Edge[] = [
	{ from: "null-hypothesis", to: "alternative-hypothesis", strength: 0.9 },
	{ from: "null-hypothesis", to: "null-hypothesis-formulation", strength: 0.85 },
	{ from: "null-hypothesis", to: "alternative-hypothesis-formulation", strength: 0.82 },
	{ from: "null-hypothesis", to: "null-and-alternative-hypothesis-formulation", strength: 0.8 },

	{ from: "p-value", to: "interpretation-of-p-value", strength: 0.88 },
	{ from: "p-value", to: "p-value-calculation", strength: 0.86 },
	{ from: "p-value", to: "p-value-calculation-one-proportion", strength: 0.84 },

	{ from: "decision-rule", to: "decision-alpha-005", strength: 0.9 },
	{ from: "decision-rule", to: "decision-alpha-001", strength: 0.9 },
];

export const itemPlans: ItemPlan[] = [
	{ id: "q1",  concepts: ["null-hypothesis"] },
	{ id: "q2",  concepts: ["alternative-hypothesis"] },
	{ id: "q3",  concepts: ["null-hypothesis-formulation"] },
	{ id: "q4",  concepts: ["alternative-hypothesis-formulation"] },
	{ id: "q5",  concepts: ["null-and-alternative-hypothesis-formulation"] },
	{ id: "q6",  concepts: ["p-value"] },
	{ id: "q7",  concepts: ["interpretation-of-p-value"] },
	{ id: "q8",  concepts: ["p-value-calculation"] },
	{ id: "q9",  concepts: ["p-value-calculation-one-proportion"] },
	{ id: "q10", concepts: ["decision-rule"] },
	{ id: "q11", concepts: ["decision-alpha-005"] },
	{ id: "q12", concepts: ["decision-alpha-001"] },
	{ id: "q13", concepts: ["one-proportion-test"] },
	{ id: "q14", concepts: ["one-proportion-test"] },
	{ id: "q15", concepts: ["one-proportion-test"] },
];

/**
 * EXPECTED OUTPUT — the authoritative result for this fixture.
 * If buildConceptGroups produces anything different, a test MUST fail.
 *
 * Sort order: by questionCount descending.
 * Children sort order: by weight descending within each group.
 */
export const expectedGroups: ConceptGroup[] = [
	{
		parentId: "null-hypothesis",
		parentLabel: "Null Hypothesis",
		questionCount: 5,
		children: [
			{ id: "alternative-hypothesis", label: "Alternative Hypothesis", weight: 2.0, questionCount: 1 },
			{ id: "null-hypothesis-formulation", label: "Null Hypothesis Formulation", weight: 1.3, questionCount: 1 },
			{ id: "alternative-hypothesis-formulation", label: "Alternative Hypothesis Formulation", weight: 1.3, questionCount: 1 },
			{ id: "null-and-alternative-hypothesis-formulation", label: "Null and Alternative Hypothesis Formulation", weight: 1.2, questionCount: 1 },
		],
	},
	{
		parentId: "p-value",
		parentLabel: "P-value",
		questionCount: 4,
		children: [
			{ id: "interpretation-of-p-value", label: "Interpretation of P-value", weight: 1.8, questionCount: 1 },
			{ id: "p-value-calculation", label: "P-value Calculation", weight: 1.6, questionCount: 1 },
			{ id: "p-value-calculation-one-proportion", label: "P-value Calculation (One-Proportion z-test)", weight: 1.5, questionCount: 1 },
		],
	},
	{
		parentId: "decision-rule",
		parentLabel: "Decision Rule",
		questionCount: 3,
		children: [
			{ id: "decision-alpha-005", label: "Hypothesis Testing Decision (α = 0.05)", weight: 1.4, questionCount: 1 },
			{ id: "decision-alpha-001", label: "Hypothesis Testing Decision (α = 0.01)", weight: 1.4, questionCount: 1 },
		],
	},
	{
		parentId: "one-proportion-test",
		parentLabel: "One-Proportion Hypothesis Test",
		questionCount: 3,
		children: [],
	},
];
