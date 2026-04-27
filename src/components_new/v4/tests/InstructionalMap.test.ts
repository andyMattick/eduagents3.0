import { describe, expect, it } from "vitest";

import { buildInstructionalMap } from "../../../prism-v4/intelligence/buildInstructionalMap";
import type { ViewerProblemGroup, ViewerScoredConcept } from "../../../prism-v4/viewer";
import type { ConceptMapModel } from "../../../prism-v4/session/InstructionalIntelligenceSession";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeGroup(overrides: Partial<ViewerProblemGroup> & { groupId: string }): ViewerProblemGroup {
	return {
		documentId: "doc-1",
		sourceFileName: "test.pdf",
		title: `Group ${overrides.groupId}`,
		problemCount: 2,
		concepts: overrides.concepts ?? ["fractions"],
		primaryConcepts: overrides.primaryConcepts ?? ["fractions"],
		representations: ["text"],
		misconceptions: overrides.misconceptions ?? [],
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
		conceptFrequencies: {},
		...overrides,
	};
}

function makeScoredConcept(overrides: Partial<ViewerScoredConcept> & { concept: string }): ViewerScoredConcept {
	return {
		documentIds: ["doc-1"],
		sourceFileNames: ["test.pdf"],
		averageScore: 0.5,
		totalScore: 0.5,
		coverageScore: overrides.coverageScore ?? 0.5,
		gapScore: overrides.gapScore ?? 0,
		freqProblems: 1,
		freqPages: 1,
		freqDocuments: 1,
		groupCount: 1,
		multipartPresence: 0,
		crossDocumentAnchor: false,
		gap: overrides.gap ?? false,
		noiseCandidate: false,
		stability: 0.8,
		overlapStrength: 0.2,
		redundancy: 0,
		problemGroupIds: [],
		previewItemIds: [],
		previewCount: 0,
		previewDocumentIds: [],
		previewGroups: [],
		previewPageSpans: [],
		groupIds: ["group-1"],
		problemCount: 1,
		previewItems: [],
		linkedPreviewFallbackCount: 0,
		previewCoverage: 0,
		...overrides,
	};
}

function makeConceptGraph(nodeIds: string[], edges: Array<{ from: string; to: string }>): ConceptMapModel {
	return {
		nodes: nodeIds.map((id) => ({ id, label: id, weight: 1 })),
		edges: edges.map((e) => ({ ...e, weight: 1 })),
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildInstructionalMap", () => {
	it("maps each group to its concepts", () => {
		const groups = [
			makeGroup({ groupId: "g1", concepts: ["fractions", "decimals"] }),
			makeGroup({ groupId: "g2", concepts: ["algebra"] }),
		];
		const scored = [
			makeScoredConcept({ concept: "fractions" }),
			makeScoredConcept({ concept: "decimals" }),
			makeScoredConcept({ concept: "algebra" }),
		];
		const result = buildInstructionalMap(groups, scored, null, null);

		const g1 = result.entries.find((e) => e.groupId === "g1")!;
		expect(g1.concepts).toContain("fractions");
		expect(g1.concepts).toContain("decimals");

		const g2 = result.entries.find((e) => e.groupId === "g2")!;
		expect(g2.concepts).toContain("algebra");
	});

	it("maps concepts to skills via concept graph edges", () => {
		const groups = [makeGroup({ groupId: "g1", concepts: ["fractions"] })];
		const scored = [makeScoredConcept({ concept: "fractions" })];
		const graph = makeConceptGraph(["fractions", "decimals", "ratios"], [
			{ from: "fractions", to: "decimals" },
			{ from: "ratios", to: "fractions" },
		]);
		const result = buildInstructionalMap(groups, scored, graph, null);

		const g1 = result.entries.find((e) => e.groupId === "g1")!;
		// Should include connected nodes from the graph
		expect(g1.skills).toContain("decimals");
		expect(g1.skills).toContain("ratios");
	});

	it("recommends reteach for gap concepts", () => {
		const groups = [makeGroup({ groupId: "g1", concepts: ["algebra"] })];
		const scored = [makeScoredConcept({ concept: "algebra", gap: true, gapScore: 0.8, coverageScore: 0.1 })];
		const result = buildInstructionalMap(groups, scored, null, null);

		const g1 = result.entries.find((e) => e.groupId === "g1")!;
		expect(g1.recommendedActions).toContain("reteach");
	});

	it("recommends extend for high-coverage non-noise concepts", () => {
		const groups = [makeGroup({ groupId: "g1", concepts: ["fractions"] })];
		const scored = [makeScoredConcept({ concept: "fractions", coverageScore: 0.9, gapScore: 0 })];
		const result = buildInstructionalMap(groups, scored, null, null);

		const g1 = result.entries.find((e) => e.groupId === "g1")!;
		expect(g1.recommendedActions).toContain("extend");
	});

	it("recommends differentiate when group has misconceptions", () => {
		const groups = [makeGroup({ groupId: "g1", concepts: ["fractions"], misconceptions: ["denominator-swap"] })];
		const scored = [makeScoredConcept({ concept: "fractions", coverageScore: 0.5 })];
		const result = buildInstructionalMap(groups, scored, null, null);

		const g1 = result.entries.find((e) => e.groupId === "g1")!;
		expect(g1.recommendedActions).toContain("differentiate");
	});

	it("produces one entry per problem group with stable ordering", () => {
		const groups = [
			makeGroup({ groupId: "g1", concepts: ["fractions"] }),
			makeGroup({ groupId: "g2", concepts: ["algebra"] }),
			makeGroup({ groupId: "g3", concepts: ["geometry"] }),
		];
		const scored = groups.map((g) => makeScoredConcept({ concept: g.concepts[0]! }));
		const result = buildInstructionalMap(groups, scored, null, null);

		expect(result.entries).toHaveLength(3);
		expect(result.entries.map((e) => e.groupId)).toEqual(["g1", "g2", "g3"]);
	});

	it("always includes at least one recommended action per entry", () => {
		const groups = [makeGroup({ groupId: "g1", concepts: ["fractions"] })];
		const scored = [makeScoredConcept({ concept: "fractions", coverageScore: 0.5 })];
		const result = buildInstructionalMap(groups, scored, null, null);
		for (const entry of result.entries) {
			expect(entry.recommendedActions.length).toBeGreaterThan(0);
		}
	});
});
