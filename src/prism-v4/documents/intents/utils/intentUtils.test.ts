import { describe, expect, it } from "vitest";

import { inferDomainMerged } from "./inferDomain";
import { mergeAnalyzedDocuments, mergeCollectionAnalysis, mergeInstructionalUnits } from "./mergeSessionData";
import type { AnalyzedDocument, DocumentCollectionAnalysis, InstructionalUnit } from "../../../schema/semantic";

function buildAnalyzedDocument(args: {
	documentId: string;
	concepts: string[];
	problemText: string;
	fragmentIdSuffix: string;
	problemIdSuffix: string;
}): AnalyzedDocument {
	const surfaceId = `${args.documentId}-surface-1`;
	const nodeId = `${args.documentId}-node-${args.fragmentIdSuffix}`;

	return {
		document: {
			id: args.documentId,
			sourceFileName: `${args.documentId}.pdf`,
			sourceMimeType: "application/pdf",
			surfaces: [{ id: surfaceId, surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [{
				id: nodeId,
				documentId: args.documentId,
				surfaceId,
				nodeType: "paragraph",
				orderIndex: 0,
				text: args.problemText,
				normalizedText: args.problemText,
			}],
			createdAt: "2026-03-28T00:00:00.000Z",
		},
		fragments: [{
			id: `${args.documentId}-fragment-${args.fragmentIdSuffix}`,
			documentId: args.documentId,
			anchors: [{ documentId: args.documentId, surfaceId, nodeId }],
			isInstructional: true,
			instructionalRole: "example",
			contentType: "text",
			learningTarget: `Explain ${args.concepts[0]}`,
			prerequisiteConcepts: [...args.concepts],
			scaffoldLevel: "medium",
			misconceptionTriggers: [],
			confidence: 0.9,
			classifierVersion: "test",
			strategy: "rule-based",
		}],
		problems: [{
			id: `${args.documentId}-problem-${args.problemIdSuffix}`,
			documentId: args.documentId,
			anchors: [{ documentId: args.documentId, surfaceId, nodeId }],
			text: args.problemText,
			extractionMode: "authored",
			concepts: [...args.concepts],
			representations: ["text"],
			difficulty: "medium",
			misconceptions: [],
			cognitiveDemand: "conceptual",
		}],
		insights: {
			concepts: [...args.concepts],
			conceptFrequencies: Object.fromEntries(args.concepts.map((concept) => [concept, 1])),
			representations: ["text"],
			difficultyDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 1,
			explanationCount: 0,
		},
		updatedAt: "2026-03-28T00:00:00.000Z",
	};
}

function buildInstructionalUnit(args: {
	unitId: string;
	documentId: string;
	concepts: string[];
	fragmentIdSuffix: string;
}): InstructionalUnit {
	return {
		unitId: args.unitId,
		fragments: [{
			id: `${args.documentId}-fragment-${args.fragmentIdSuffix}`,
			documentId: args.documentId,
			anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-${args.fragmentIdSuffix}` }],
			isInstructional: true,
			instructionalRole: "example",
			contentType: "text",
			confidence: 0.9,
			classifierVersion: "test",
			strategy: "rule-based",
		}],
		concepts: [...args.concepts],
		skills: [],
		learningTargets: [`Explain ${args.concepts[0]}`],
		misconceptions: [],
		difficulty: 0.5,
		linguisticLoad: 0.4,
		sourceSections: [],
		confidence: 0.9,
		title: `Unit ${args.unitId}`,
	};
}

function buildCollectionAnalysis(): DocumentCollectionAnalysis {
	return {
		sessionId: "session-1",
		documentIds: ["doc-1", "doc-2"],
		conceptOverlap: { fractions: ["doc-1", "doc-2"] },
		conceptGaps: [],
		difficultyProgression: {},
		representationProgression: {},
		redundancy: { "doc-1": [], "doc-2": [] },
		coverageSummary: {
			totalConcepts: 1,
			docsPerConcept: { fractions: 2 },
			perDocument: {
				"doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 1, representations: ["text"], dominantDifficulty: "medium" },
				"doc-2": { documentId: "doc-2", conceptCount: 1, problemCount: 1, instructionalDensity: 1, representations: ["text"], dominantDifficulty: "medium" },
			},
		},
		documentSimilarity: [{ leftDocumentId: "doc-1", rightDocumentId: "doc-2", score: 0.9, sharedConcepts: ["fractions"] }],
		conceptToDocumentMap: { fractions: ["doc-1", "doc-2"] },
		updatedAt: "2026-03-28T00:00:00.000Z",
	};
}

describe("intent utils", () => {
	it("mergeAnalyzedDocuments merges duplicate documents and deduplicates insight concepts", () => {
		const first = buildAnalyzedDocument({
			documentId: "doc-1",
			concepts: ["fractions"],
			problemText: "Explain equivalent fractions.",
			fragmentIdSuffix: "a",
			problemIdSuffix: "a",
		});
		const second = buildAnalyzedDocument({
			documentId: "doc-1",
			concepts: ["fractions", "ratios"],
			problemText: "Compare ratios and fractions.",
			fragmentIdSuffix: "b",
			problemIdSuffix: "b",
		});

		const merged = mergeAnalyzedDocuments([first, second]);

		expect(merged).toHaveLength(1);
		expect(merged[0]?.problems).toHaveLength(2);
		expect(merged[0]?.fragments).toHaveLength(2);
		expect(merged[0]?.insights.concepts).toEqual(["fractions", "ratios"]);
	});

	it("mergeInstructionalUnits merges fragments for matching unit ids", () => {
		const first = buildInstructionalUnit({ unitId: "unit-1", documentId: "doc-1", concepts: ["fractions"], fragmentIdSuffix: "a" });
		const second = buildInstructionalUnit({ unitId: "unit-1", documentId: "doc-2", concepts: ["fractions"], fragmentIdSuffix: "b" });

		const merged = mergeInstructionalUnits([first, second]);

		expect(merged).toHaveLength(1);
		expect(merged[0]?.fragments).toHaveLength(2);
	});

	it("mergeCollectionAnalysis returns the base analysis unchanged when no analyzed docs are provided", () => {
		const base = buildCollectionAnalysis();

		expect(mergeCollectionAnalysis(base)).toBe(base);
	});

	it("mergeCollectionAnalysis merges concept maps from analyzed docs", () => {
		const base = buildCollectionAnalysis();
		const analyzed = [
			buildAnalyzedDocument({
				documentId: "doc-3",
				concepts: ["ratios"],
				problemText: "Explain how ratios compare quantities.",
				fragmentIdSuffix: "c",
				problemIdSuffix: "c",
			}),
		];

		const merged = mergeCollectionAnalysis(base, analyzed);

		expect(merged).not.toBe(base);
		expect(merged.conceptToDocumentMap).toEqual({
			fractions: ["doc-1", "doc-2"],
			ratios: ["doc-3"],
		});
	});


	it("dedupes problems by problem.id", () => {
		const first = buildAnalyzedDocument({
			documentId: "doc-1",
			concepts: ["fractions"],
			problemText: "Explain equivalent fractions.",
			fragmentIdSuffix: "a",
			problemIdSuffix: "x",
		});

		const second = buildAnalyzedDocument({
			documentId: "doc-1",
			concepts: ["fractions"],
			problemText: "Explain equivalent fractions.",
			fragmentIdSuffix: "b",
			problemIdSuffix: "x", // duplicate ID
		});

		const merged = mergeAnalyzedDocuments([first, second]);
		expect(merged[0].problems).toHaveLength(1);
		});
	
	it("dedupes fragments by fragment.id", () => {
		const first = buildAnalyzedDocument({
			documentId: "doc-1",
			concepts: ["fractions"],
			problemText: "Explain equivalent fractions.",
			fragmentIdSuffix: "x",
			problemIdSuffix: "a",
		});

		const second = buildAnalyzedDocument({
			documentId: "doc-1",
			concepts: ["fractions"],
			problemText: "Explain equivalent fractions.",
			fragmentIdSuffix: "x", // duplicate ID
			problemIdSuffix: "b",
		});

		const merged = mergeAnalyzedDocuments([first, second]);
		expect(merged[0].fragments).toHaveLength(1);
		});

	it("dedupes instructional unit fragments by fragment.id", () => {
		const first = buildInstructionalUnit({
			unitId: "unit-1",
			documentId: "doc-1",
			concepts: ["fractions"],
			fragmentIdSuffix: "x",
		});

		const second = buildInstructionalUnit({
			unitId: "unit-1",
			documentId: "doc-1",
			concepts: ["fractions"],
			fragmentIdSuffix: "x", // duplicate
		});

		const merged = mergeInstructionalUnits([first, second]);
		expect(merged[0]?.fragments).toHaveLength(1);
	});
	

	it("inferDomainMerged infers mathematics from merged concept sources", () => {
		const domain = inferDomainMerged(
			{ fractions: ["doc-1"], slope: ["doc-2"] },
			[
				buildAnalyzedDocument({
					documentId: "doc-1",
					concepts: ["fractions"],
					problemText: "Explain equivalent fractions.",
					fragmentIdSuffix: "a",
					problemIdSuffix: "a",
				}),
			],
			[
				buildInstructionalUnit({ unitId: "unit-1", documentId: "doc-2", concepts: ["slope"], fragmentIdSuffix: "b" }),
			],
		);

		expect(domain).toBe("Mathematics");
	});
});