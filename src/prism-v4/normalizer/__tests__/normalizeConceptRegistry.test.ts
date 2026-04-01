import { describe, expect, it } from "vitest";

import type { AnalyzedDocument } from "../../schema/semantic";
import type { AssessmentPreviewItemModel, ConceptMapModel } from "../../session/InstructionalIntelligenceSession";
import { buildConceptRegistry } from "../normalizeConceptRegistry";

// ─── Minimal factories ────────────────────────────────────────────────────────

function makeAnalyzedDocument(problemConcepts: string[], scoredConcepts: Array<{ concept: string; isNoise: boolean }> = []): AnalyzedDocument {
	return {
		document: {
			id: "doc-1",
			sourceFileName: "test.pdf",
			sourceMimeType: "application/pdf",
			surfaces: [],
			nodes: [],
			createdAt: "2026-01-01T00:00:00.000Z",
		},
		fragments: [],
		problems: [
			{
				id: "p-1",
				documentId: "doc-1",
				anchors: [],
				text: "Test problem",
				extractionMode: "authored",
				sourceSpan: { firstPage: 1, lastPage: 1 },
				concepts: problemConcepts,
				representations: [],
				difficulty: "medium",
				misconceptions: [],
				cognitiveDemand: "conceptual",
			},
		],
		insights: {
			concepts: problemConcepts,
			scoredConcepts: scoredConcepts.map((sc) => ({
				concept: sc.concept,
				freqProblems: 1,
				freqPages: 1,
				freqDocuments: 1,
				semanticDensity: 0.5,
				multipartPresence: 0,
				crossDocumentRecurrence: 0,
				score: 0.5,
				isNoise: sc.isNoise,
			})),
			conceptFrequencies: Object.fromEntries(problemConcepts.map((c) => [c, 1])),
			representations: [],
			difficultyDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [],
			instructionalDensity: 0.5,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		contentHash: "hash",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

function makePreviewItem(concepts: string[]): AssessmentPreviewItemModel {
	return {
		itemId: `item-${concepts[0]}`,
		stem: "Test item",
		conceptId: concepts[0],
		primaryConcepts: concepts,
		bloom: "Understand",
		difficulty: "medium",
		mode: "free-response",
		scenario: "abstract-symbolic",
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildConceptRegistry", () => {
	it("includes concepts from problem.concepts in canonical set", () => {
		const doc = makeAnalyzedDocument(["math.statistics.hypothesis-testing", "math.statistics.mean-test"]);
		const registry = buildConceptRegistry([doc], [], null);

		expect(registry.canonical.has("math.statistics.hypothesis-testing")).toBe(true);
		expect(registry.canonical.has("math.statistics.mean-test")).toBe(true);
		expect(registry.noise.size).toBe(0);
	});

	it("includes non-noise scored concepts in canonical set", () => {
		const doc = makeAnalyzedDocument([], [
			{ concept: "science.inquiry", isNoise: false },
			{ concept: "noise-label", isNoise: true },
		]);
		const registry = buildConceptRegistry([doc], [], null);

		expect(registry.canonical.has("science.inquiry")).toBe(true);
		expect(registry.canonical.has("noise-label")).toBe(false);
	});

	it("puts preview-only concepts in noise set", () => {
		const doc = makeAnalyzedDocument(["math.statistics.hypothesis-testing"]);
		const preview = makePreviewItem(["hypothesis testing"]);
		const registry = buildConceptRegistry([doc], [preview], null);

		expect(registry.canonical.has("hypothesis testing")).toBe(false);
		expect(registry.noise.has("hypothesis testing")).toBe(true);
	});

	it("puts graph-only nodes in noise set", () => {
		const doc = makeAnalyzedDocument(["math.statistics.hypothesis-testing"]);
		const graph: ConceptMapModel = {
			nodes: [{ id: "chapter 9 review", label: "Chapter 9 Review", weight: 1 }],
			edges: [],
		};
		const registry = buildConceptRegistry([doc], [], graph);

		expect(registry.canonical.has("chapter 9 review")).toBe(false);
		expect(registry.noise.has("chapter 9 review")).toBe(true);
	});

	it("does not double-count a concept that is both in problems and preview", () => {
		const doc = makeAnalyzedDocument(["fractions"]);
		const preview = makePreviewItem(["fractions"]);
		const registry = buildConceptRegistry([doc], [preview], null);

		expect(registry.canonical.has("fractions")).toBe(true);
		expect(registry.noise.has("fractions")).toBe(false);
		expect(registry.mapToCanonical.has("fractions")).toBe(false);
	});

	it("maps noise concept to canonical via tail-segment match", () => {
		const doc = makeAnalyzedDocument(["math.statistics.hypothesis-testing"]);
		const preview = makePreviewItem(["hypothesis testing"]);
		const registry = buildConceptRegistry([doc], [preview], null);

		expect(registry.mapToCanonical.get("hypothesis testing")).toBe("math.statistics.hypothesis-testing");
	});

	it("returns null mapping for document-title patterns", () => {
		const doc = makeAnalyzedDocument(["math.statistics.hypothesis-testing"]);
		const graph: ConceptMapModel = {
			nodes: [{ id: "Chapter 9 Review", label: "Chapter 9 Review", weight: 1 }],
			edges: [],
		};
		const registry = buildConceptRegistry([doc], [], graph);

		expect(registry.mapToCanonical.get("Chapter 9 Review")).toBeNull();
	});

	it("returns empty registry for empty workspace", () => {
		const registry = buildConceptRegistry([], [], null);

		expect(registry.canonical.size).toBe(0);
		expect(registry.noise.size).toBe(0);
		expect(registry.mapToCanonical.size).toBe(0);
	});
});
