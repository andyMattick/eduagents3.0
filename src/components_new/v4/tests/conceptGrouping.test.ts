/**
 * CONCEPT GROUPING — ROBUST TEST SUITE (v4)
 *
 * Spec §7: Nine test categories providing full anti-regression coverage.
 * These tests MUST fail if:
 *
 *   • A refinement concept becomes a parent
 *   • A noise node becomes a parent
 *   • A child appears as top-level
 *   • A parent loses children unexpectedly
 *   • A parent disappears
 *   • A new parent appears unexpectedly
 *   • The hierarchy collapses to one parent
 *   • The coder "simplifies" logic incorrectly
 *   • Domain-specific hacks break another domain
 *
 * Golden fixtures: stats (canonical), biology, ELA.
 * Each fixture is a non-regression anchor for its domain.
 */
import { describe, expect, it } from "vitest";
import {
	buildConceptGroups,
	countPlans,
	filterTopLevel,
	isCategory,
	isChild,
	isRefinement,
	normalize,
	selectParents,
} from "../conceptGrouping";
import type { ConceptNode, Edge, ItemPlan } from "../conceptGrouping";

import * as stats from "./fixtures/stats.fixture";
import * as bio from "./fixtures/biology.fixture";
import * as ela from "./fixtures/ela.fixture";

// ===========================================================================
// TEST 1 — Label normalization
// ===========================================================================

describe("Test 1 — normalize()", () => {
	it("lowercases, collapses whitespace, removes punctuation", () => {
		expect(normalize("P-value")).toBe("p value");
		expect(normalize("  Null Hypothesis  ")).toBe("null hypothesis");
		expect(normalize("α = 0.05")).toBe("005");
	});

	it("treats hyphenated and spaced variants as equal", () => {
		expect(normalize("P-value")).toBe(normalize("P value"));
	});
});

// ===========================================================================
// TEST 2 — Refinement detection
// ===========================================================================

describe("Test 2 — isRefinement() — no refinement becomes a parent", () => {
	it("flags interpretation labels", () => {
		expect(isRefinement("Interpretation of P-value")).toBe(true);
	});

	it("flags calculation labels", () => {
		expect(isRefinement("P-value Calculation")).toBe(true);
		expect(isRefinement("ATP Yield Calculation")).toBe(true);
	});

	it("flags formulation labels", () => {
		expect(isRefinement("Null Hypothesis Formulation")).toBe(true);
	});

	it("flags step labels", () => {
		expect(isRefinement("Glycolysis Steps")).toBe(true);
		expect(isRefinement("Theme Development Steps")).toBe(true);
	});

	it("flags example labels", () => {
		expect(isRefinement("Metaphor Example")).toBe(true);
		expect(isRefinement("Chlorophyll Function Example")).toBe(true);
	});

	it("flags setup labels", () => {
		expect(isRefinement("Rising Action Setup")).toBe(true);
	});

	it("flags 'decision (' pattern even with unicode paren content", () => {
		expect(isRefinement("Hypothesis Testing Decision (α = 0.05)")).toBe(true);
		expect(isRefinement("Hypothesis Testing Decision (α = 0.01)")).toBe(true);
	});

	it("does NOT flag top-level concept labels as refinements", () => {
		expect(isRefinement("Null Hypothesis")).toBe(false);
		expect(isRefinement("P-value")).toBe(false);
		expect(isRefinement("Decision Rule")).toBe(false);
		expect(isRefinement("Photosynthesis")).toBe(false);
		expect(isRefinement("Narrative Structure")).toBe(false);
	});
});

// ===========================================================================
// TEST 3 — Category detection
// ===========================================================================

describe("Test 3 — isCategory() — category discrimination", () => {
	it("accepts broad category labels", () => {
		expect(isCategory("Null Hypothesis")).toBe(true);
		expect(isCategory("P-value")).toBe(true);
		expect(isCategory("Decision Rule")).toBe(true);
		expect(isCategory("One-Proportion Hypothesis Test")).toBe(true);
		expect(isCategory("Cellular Respiration Process")).toBe(true);
		expect(isCategory("Figurative Language Strategy")).toBe(true);
	});

	it("rejects refinement labels even when they contain category tokens", () => {
		expect(isCategory("Null Hypothesis Formulation")).toBe(false);
		expect(isCategory("Hypothesis Testing Decision (α = 0.05)")).toBe(false);
		expect(isCategory("Interpretation of P-value")).toBe(false);
	});

	it("rejects labels with no category hint tokens", () => {
		expect(isCategory("α = 0.05")).toBe(false);
		expect(isCategory("General Overview")).toBe(false);
		expect(isCategory("science.inquiry")).toBe(false);
	});
});

// ===========================================================================
// TEST 4 — Structural support enforced
// ===========================================================================

describe("Test 4 — structural support enforced", () => {
	const supportNodes: ConceptNode[] = [
		{ id: "null-hypothesis", label: "Null Hypothesis", weight: 2.5 },
		{ id: "orphan-hypothesis", label: "Orphan Hypothesis", weight: 1.5 },
	];

	it("node with item plan qualifies for support", () => {
		const plans: ItemPlan[] = [{ id: "q1", concepts: ["null-hypothesis"] }];
		const parents = selectParents(supportNodes, plans, []);
		expect(parents.map((n) => n.id)).toContain("null-hypothesis");
	});

	it("node with ≥ 2 strong edges qualifies for support", () => {
		const twoEdges: Edge[] = [
			{ from: "null-hypothesis", to: "orphan-hypothesis", strength: 0.75 },
			{ from: "null-hypothesis", to: "orphan-hypothesis", strength: 0.72 },
		];
		const parents = selectParents(supportNodes, [], twoEdges);
		expect(parents.map((n) => n.id)).toContain("null-hypothesis");
	});

	it("node with no plans and only 1 weak edge is rejected", () => {
		const weakEdge: Edge[] = [
			{ from: "null-hypothesis", to: "orphan-hypothesis", strength: 0.5 },
		];
		const parents = selectParents(supportNodes, [], weakEdge);
		expect(parents.map((n) => n.id)).not.toContain("null-hypothesis");
	});

	it("node below weight threshold (1.2) is rejected even with support", () => {
		const lowNodes: ConceptNode[] = [
			{ id: "mini-hypothesis", label: "Mini Hypothesis", weight: 1.0 },
		];
		const plans: ItemPlan[] = [{ id: "q1", concepts: ["mini-hypothesis"] }];
		const parents = selectParents(lowNodes, plans, []);
		expect(parents).toHaveLength(0);
	});
});

// ===========================================================================
// TEST 5 — Weight hierarchy enforced
// ===========================================================================

describe("Test 5 — weight hierarchy enforced in child assignment", () => {
	const parent: ConceptNode = { id: "p-value", label: "P-value", weight: 2.4 };
	const heavierNode: ConceptNode = { id: "heavy-node", label: "Heavy P-value Node", weight: 3.0 };
	const lighterNode: ConceptNode = { id: "p-value-calculation", label: "P-value Calculation", weight: 1.6 };

	const edgeList: Edge[] = [
		{ from: "heavy-node", to: "p-value", strength: 0.85 },
		{ from: "p-value-calculation", to: "p-value", strength: 0.86 },
	];

	it("does not assign a heavier node as a child even with a strong edge", () => {
		expect(isChild(heavierNode, parent, edgeList)).toBe(false);
	});

	it("assigns a lighter node with a strong edge as a child", () => {
		expect(isChild(lighterNode, parent, edgeList)).toBe(true);
	});
});

// ===========================================================================
// TEST 6 — Children must never appear as top-level
// ===========================================================================

describe("Test 6 — children never appear top-level", () => {
	it("stats: all children removed from top-level list", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const allConcepts = stats.nodes.map((n) => ({
			concept: n.id,
			label: n.label,
			questionCount: countPlans(n.id, stats.itemPlans),
		}));
		const topLevel = filterTopLevel(allConcepts, groups);
		const topLevelIds = new Set(topLevel.map((c) => c.concept));
		const childIds = new Set(groups.flatMap((g) => g.children.map((c) => c.id)));

		for (const id of childIds) {
			expect(topLevelIds.has(id)).toBe(false);
		}
	});

	it("biology: all children removed from top-level list", () => {
		const groups = buildConceptGroups(bio.nodes, bio.edges, bio.itemPlans);
		const allConcepts = bio.nodes.map((n) => ({
			concept: n.id,
			label: n.label,
			questionCount: countPlans(n.id, bio.itemPlans),
		}));
		const topLevel = filterTopLevel(allConcepts, groups);
		const topLevelIds = new Set(topLevel.map((c) => c.concept));
		const childIds = new Set(groups.flatMap((g) => g.children.map((c) => c.id)));

		for (const id of childIds) {
			expect(topLevelIds.has(id)).toBe(false);
		}
	});

	it("ELA: expected child ids absent from top-level", () => {
		const groups = buildConceptGroups(ela.nodes, ela.edges, ela.itemPlans);
		const allConcepts = ela.nodes.map((n) => ({
			concept: n.id,
			label: n.label,
			questionCount: countPlans(n.id, ela.itemPlans),
		}));
		const topLevel = filterTopLevel(allConcepts, groups);
		const topLevelIds = new Set(topLevel.map((c) => c.concept));

		for (const id of ela.expectedChildIds) {
			expect(topLevelIds.has(id)).toBe(false);
		}
	});
});

// ===========================================================================
// TEST 7 — Noise rejection
// ===========================================================================

describe("Test 7 — noise nodes never become parents", () => {
	it("stats: taxonomy IDs, framework labels, general-overview nodes are rejected", () => {
		const noisyNodes: ConceptNode[] = [
			...stats.nodes,
			{ id: "science.inquiry", label: "science.inquiry", weight: 0.5 },
			{ id: "hypothesis-testing-framework", label: "Hypothesis Testing Framework", weight: 1.5 },
			{ id: "general-overview", label: "General Overview", weight: 1.3 },
			{ id: "basic-introduction", label: "Basic Introduction", weight: 1.5 },
		];

		const groups = buildConceptGroups(noisyNodes, stats.edges, stats.itemPlans);
		const parentLabels = groups.map((g) => g.parentLabel.toLowerCase());

		expect(parentLabels).not.toContain("science.inquiry");
		expect(parentLabels).not.toContain("hypothesis testing framework");
		expect(parentLabels).not.toContain("general overview");
		expect(parentLabels).not.toContain("basic introduction");
	});

	it("biology: noise nodes are not included", () => {
		const groups = buildConceptGroups(bio.nodes, bio.edges, bio.itemPlans);
		const parentLabels = groups.map((g) => g.parentLabel.toLowerCase());

		expect(parentLabels).not.toContain("general overview");
		expect(parentLabels).not.toContain("bio.framework");
	});
});

// ===========================================================================
// TEST 8 — Golden snapshot: Stats document
// ===========================================================================

describe("Test 8 — Golden snapshot: stats document", () => {
	it("produces the exact 4 expected parent groups in the correct order", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		expect(groups.map((g) => g.parentId)).toEqual(
			stats.expectedGroups.map((g) => g.parentId),
		);
	});

	it("null-hypothesis group has exact 4 children in weight-descending order", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const nullGroup = groups.find((g) => g.parentId === "null-hypothesis")!;

		expect(nullGroup.questionCount).toBe(5);
		expect(nullGroup.children.map((c) => c.id)).toEqual(
			stats.expectedGroups[0].children.map((c) => c.id),
		);
	});

	it("p-value group has exact 3 children", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const pGroup = groups.find((g) => g.parentId === "p-value")!;

		expect(pGroup.questionCount).toBe(4);
		expect(pGroup.children.map((c) => c.id).sort()).toEqual(
			stats.expectedGroups[1].children.map((c) => c.id).sort(),
		);
	});

	it("decision-rule group has exact 2 children", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const dGroup = groups.find((g) => g.parentId === "decision-rule")!;

		expect(dGroup.questionCount).toBe(3);
		expect(dGroup.children.map((c) => c.id).sort()).toEqual(
			stats.expectedGroups[2].children.map((c) => c.id).sort(),
		);
	});

	it("one-proportion-test has 3 questions and no children", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const testGroup = groups.find((g) => g.parentId === "one-proportion-test")!;

		expect(testGroup.questionCount).toBe(3);
		expect(testGroup.children).toHaveLength(0);
	});

	it("alternative-hypothesis is NOT a parent (it is a child)", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const parentIds = groups.map((g) => g.parentId);
		expect(parentIds).not.toContain("alternative-hypothesis");
	});

	it("refinement concepts are NOT parents", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const parentIds = groups.map((g) => g.parentId);
		expect(parentIds).not.toContain("interpretation-of-p-value");
		expect(parentIds).not.toContain("p-value-calculation");
		expect(parentIds).not.toContain("null-hypothesis-formulation");
		expect(parentIds).not.toContain("alternative-hypothesis-formulation");
		expect(parentIds).not.toContain("null-and-alternative-hypothesis-formulation");
		expect(parentIds).not.toContain("decision-alpha-005");
		expect(parentIds).not.toContain("decision-alpha-001");
	});

	it("groups are sorted by questionCount descending", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const counts = groups.map((g) => g.questionCount);
		expect(counts).toEqual([...counts].sort((a, b) => b - a));
	});

	it("children within each group are sorted by weight descending", () => {
		const groups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		for (const g of groups) {
			const weights = g.children.map((c) => c.weight);
			expect(weights).toEqual([...weights].sort((a, b) => b - a));
		}
	});
});

// ===========================================================================
// TEST 9 — Domain-agnostic behavior across 3 subjects
// ===========================================================================

describe("Test 9 — Domain-agnostic behavior across subjects", () => {
	it("biology: produces 3 parent groups without stats-specific knowledge", () => {
		const groups = buildConceptGroups(bio.nodes, bio.edges, bio.itemPlans);
		expect(groups.map((g) => g.parentId).sort()).toEqual(
			bio.expectedGroups.map((g) => g.parentId).sort(),
		);
	});

	it("biology: children are correctly assigned to each parent", () => {
		const groups = buildConceptGroups(bio.nodes, bio.edges, bio.itemPlans);

		const photoGroup = groups.find((g) => g.parentId === "photosynthesis")!;
		expect(photoGroup.children.map((c) => c.id).sort()).toEqual(
			bio.expectedGroups[0].children.map((c) => c.id).sort(),
		);

		const respGroup = groups.find((g) => g.parentId === "cellular-respiration")!;
		expect(respGroup.children.map((c) => c.id).sort()).toEqual(
			bio.expectedGroups[1].children.map((c) => c.id).sort(),
		);

		const ecoGroup = groups.find((g) => g.parentId === "ecosystem")!;
		expect(ecoGroup.children.map((c) => c.id).sort()).toEqual(
			bio.expectedGroups[2].children.map((c) => c.id).sort(),
		);
	});

	it("biology: noise nodes are excluded", () => {
		const groups = buildConceptGroups(bio.nodes, bio.edges, bio.itemPlans);
		const parentIds = groups.map((g) => g.parentId);
		expect(parentIds).not.toContain("general-biology");
		expect(parentIds).not.toContain("bio.framework");
	});

	it("ELA: narrative-structure and figurative-language are parents", () => {
		const groups = buildConceptGroups(ela.nodes, ela.edges, ela.itemPlans);
		const parentIds = groups.map((g) => g.parentId);
		expect(parentIds).toContain("narrative-structure");
		expect(parentIds).toContain("figurative-language");
	});

	it("ELA: expected child ids are correctly placed under their parents", () => {
		const groups = buildConceptGroups(ela.nodes, ela.edges, ela.itemPlans);
		const allChildIds = new Set(groups.flatMap((g) => g.children.map((c) => c.id)));
		for (const id of ela.expectedChildIds) {
			expect(allChildIds.has(id)).toBe(true);
		}
	});

	it("ELA: introduction/ela.framework noise nodes are excluded", () => {
		const groups = buildConceptGroups(ela.nodes, ela.edges, ela.itemPlans);
		const parentIds = groups.map((g) => g.parentId);
		expect(parentIds).not.toContain("general-intro");
		expect(parentIds).not.toContain("ela.framework");
	});

	it("no subject produces a conceptGroups array with only 1 parent when 3+ are expected", () => {
		const statsGroups = buildConceptGroups(stats.nodes, stats.edges, stats.itemPlans);
		const bioGroups = buildConceptGroups(bio.nodes, bio.edges, bio.itemPlans);
		const elaGroups = buildConceptGroups(ela.nodes, ela.edges, ela.itemPlans);

		expect(statsGroups.length).toBeGreaterThanOrEqual(4);
		expect(bioGroups.length).toBeGreaterThanOrEqual(3);
		expect(elaGroups.length).toBeGreaterThanOrEqual(2);
	});
});
