import { describe, expect, it } from "vitest";

import type { ConceptMapModel } from "../../session/InstructionalIntelligenceSession";
import type { ViewerProblemGroup } from "../../viewer/buildViewerData";
import { enrichConceptGraph } from "../enrichConceptGraph";

// ─── Minimal factories ────────────────────────────────────────────────────────

function makeGroup(concepts: string[], groupId = "g-1"): ViewerProblemGroup {
	return {
		groupId,
		documentId: "doc-1",
		sourceFileName: "test.pdf",
		title: "Group",
		problemCount: 1,
		concepts,
		primaryConcepts: concepts.slice(0, 4),
		representations: [],
		misconceptions: [],
		difficulty: "medium",
		cognitiveDemand: "conceptual",
		problems: [],
		previewItems: [],
		previewItemIds: [],
		previewConcepts: [],
		previewSourceDocumentIds: [],
		previewPageSpans: [],
		linkedPreviewCount: 0,
		linkedPreviewFallbackCount: 0,
		linkedBy: "none",
		conceptFrequencies: Object.fromEntries(concepts.map((c) => [c, 1])),
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("enrichConceptGraph", () => {
	it("builds graph from scratch when no existing graph and canonical concepts exist", () => {
		const canonical = new Set(["math.stats.hypothesis-testing", "math.stats.mean-test"]);
		const groups = [makeGroup(["math.stats.hypothesis-testing", "math.stats.mean-test"])];
		const result = enrichConceptGraph(null, groups, canonical);

		expect(result.nodes.map((n) => n.id)).toContain("math.stats.hypothesis-testing");
		expect(result.nodes.map((n) => n.id)).toContain("math.stats.mean-test");
		// Two canonical concepts in the same group → co-occurrence edge
		expect(result.edges.length).toBeGreaterThanOrEqual(1);
	});

	it("node label is the tail segment of a dotted canonical concept", () => {
		const canonical = new Set(["math.statistics.mean-test"]);
		const result = enrichConceptGraph(null, [], canonical);

		const node = result.nodes.find((n) => n.id === "math.statistics.mean-test");
		expect(node?.label).toBe("mean-test");
	});

	it("adds missing canonical nodes to an existing graph", () => {
		const existing: ConceptMapModel = {
			nodes: [{ id: "hypothesis testing", label: "hypothesis testing", weight: 1 }],
			edges: [],
		};
		const canonical = new Set(["math.statistics.hypothesis-testing", "math.statistics.mean-test"]);
		const result = enrichConceptGraph(existing, [], canonical);

		const ids = result.nodes.map((n) => n.id);
		// Original noise node preserved
		expect(ids).toContain("hypothesis testing");
		// Both canonical nodes added
		expect(ids).toContain("math.statistics.hypothesis-testing");
		expect(ids).toContain("math.statistics.mean-test");
	});

	it("does not duplicate nodes already present in the graph", () => {
		const existing: ConceptMapModel = {
			nodes: [{ id: "fractions", label: "fractions", weight: 1 }],
			edges: [],
		};
		const canonical = new Set(["fractions"]);
		const result = enrichConceptGraph(existing, [], canonical);

		const fractionsNodes = result.nodes.filter((n) => n.id === "fractions");
		expect(fractionsNodes.length).toBe(1);
	});

	it("returns the same graph object when nothing new to add", () => {
		const existing: ConceptMapModel = {
			nodes: [{ id: "fractions", label: "fractions", weight: 1 }],
			edges: [],
		};
		const canonical = new Set(["fractions"]);
		const result = enrichConceptGraph(existing, [], canonical);

		expect(result).toBe(existing);
	});

	it("builds co-occurrence edges based on groups sharing canonical concepts", () => {
		const canonical = new Set(["a.b", "a.c", "a.d"]);
		const groups = [
			makeGroup(["a.b", "a.c"], "g-1"),
			makeGroup(["a.c", "a.d"], "g-2"),
		];
		const result = enrichConceptGraph(null, groups, canonical);

		const edgePairs = result.edges.map((e) => `${e.from}::${e.to}`);
		expect(edgePairs.some((p) => p.includes("a.b") && p.includes("a.c"))).toBe(true);
		expect(edgePairs.some((p) => p.includes("a.c") && p.includes("a.d"))).toBe(true);
	});

	it("returns empty graph when canonical set is empty", () => {
		const result = enrichConceptGraph(null, [], new Set());

		expect(result.nodes).toHaveLength(0);
		expect(result.edges).toHaveLength(0);
	});
});
