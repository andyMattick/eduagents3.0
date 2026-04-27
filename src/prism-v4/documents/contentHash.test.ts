import { describe, expect, it } from "vitest";
import { computeContentHashV2 } from "./contentHash";
import type { AnalyzedDocument } from "../schema/semantic";

function buildAnalyzedDocument(): AnalyzedDocument {
	return {
		document: {
			id: "doc-1",
			sourceFileName: "notes.pdf",
			sourceMimeType: "application/pdf",
			surfaces: [{ id: "surface-1", surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [
				{ id: "node-content", documentId: "doc-1", surfaceId: "surface-1", nodeType: "paragraph", orderIndex: 0, text: "Explain equivalent fractions.", normalizedText: "Explain equivalent fractions." },
				{ id: "node-meta", documentId: "doc-1", surfaceId: "surface-1", nodeType: "heading", orderIndex: 1, text: "Chapter 9 Review", normalizedText: "Chapter 9 Review" },
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{ id: "fragment-content", documentId: "doc-1", anchors: [{ documentId: "doc-1", surfaceId: "surface-1", nodeId: "node-content" }], isInstructional: true, instructionalRole: "explanation", contentType: "text", confidence: 0.9, classifierVersion: "test", strategy: "rule-based" },
			{ id: "fragment-meta", documentId: "doc-1", anchors: [{ documentId: "doc-1", surfaceId: "surface-1", nodeId: "node-meta" }], isInstructional: false, instructionalRole: "metadata", contentType: "heading", confidence: 0.9, classifierVersion: "test", strategy: "rule-based" },
		],
		problems: [
			{ id: "p1", documentId: "doc-1", problemGroupId: "g1", anchors: [{ documentId: "doc-1", surfaceId: "surface-1", nodeId: "node-content" }], text: "Explain equivalent fractions.", extractionMode: "authored", sourceSpan: { firstPage: 1, lastPage: 1 }, concepts: ["fractions"], representations: ["text"], difficulty: "medium", misconceptions: [], cognitiveDemand: "conceptual" },
		],
		insights: {
			concepts: ["fractions"],
			scoredConcepts: [{ concept: "fractions", freqProblems: 1, freqPages: 1, freqDocuments: 1, semanticDensity: 0.4, multipartPresence: 0, crossDocumentRecurrence: 1, score: 1.8, isNoise: false }],
			conceptFrequencies: { fractions: 1 },
			representations: ["text"],
			difficultyDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 1,
		},
		contentHash: undefined,
		contentHashV1: undefined,
		contentHashV2: undefined,
		updatedAt: new Date().toISOString(),
	};
}

describe("computeContentHashV2", () => {
	it("changes when semantic content changes", async () => {
		const base = buildAnalyzedDocument();
		const first = await computeContentHashV2(base);

		const modified: AnalyzedDocument = {
			...base,
			document: {
				...base.document,
				nodes: base.document.nodes.map((node) => node.id === "node-content"
					? { ...node, text: "Explain equivalent fractions with a number line.", normalizedText: "Explain equivalent fractions with a number line." }
					: node),
			},
		};

		const second = await computeContentHashV2(modified);
		expect(first).not.toEqual(second);
	});

	it("stays stable when only metadata noise changes", async () => {
		const base = buildAnalyzedDocument();
		const first = await computeContentHashV2(base);

		const modified: AnalyzedDocument = {
			...base,
			document: {
				...base.document,
				nodes: base.document.nodes.map((node) => node.id === "node-meta"
					? { ...node, text: "Chapter 10 Review", normalizedText: "Chapter 10 Review" }
					: node),
			},
		};

		const second = await computeContentHashV2(modified);
		expect(first).toEqual(second);
	});
});