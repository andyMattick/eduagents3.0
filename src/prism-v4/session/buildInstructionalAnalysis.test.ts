import { describe, expect, it } from "vitest";
import { buildInstructionalAnalysis } from "./buildInstructionalAnalysis";
import type { PrismSessionContext } from "../documents/registryStore";
import type { AnalyzedDocument, DocumentCollectionAnalysis, InstructionalUnit } from "../schema/semantic";

function buildContext(): PrismSessionContext {
	const analyzedDocuments: AnalyzedDocument[] = [{
		document: { id: "doc-1", sourceFileName: "doc-1.pdf", sourceMimeType: "application/pdf", surfaces: [], nodes: [], createdAt: new Date().toISOString() },
		fragments: [],
		problems: [{ id: "p1", documentId: "doc-1", problemGroupId: "g1", anchors: [], text: "Explain fractions.", extractionMode: "authored", concepts: ["fractions"], representations: ["text"], difficulty: "medium", misconceptions: [], cognitiveDemand: "conceptual" }],
		insights: { concepts: ["fractions"], scoredConcepts: [{ concept: "fractions", freqProblems: 1, freqPages: 1, freqDocuments: 1, semanticDensity: 0.4, multipartPresence: 0, crossDocumentRecurrence: 1, score: 2.1, isNoise: false }], conceptFrequencies: { fractions: 1 }, representations: ["text"], difficultyDistribution: { low: 0, medium: 1, high: 0 }, misconceptionThemes: [], instructionalDensity: 1, problemCount: 1, exampleCount: 0, explanationCount: 0 },
		updatedAt: new Date().toISOString(),
	}];
	const collectionAnalysis: DocumentCollectionAnalysis = {
		sessionId: "session-1",
		documentIds: ["doc-1", "doc-2"],
		conceptOverlap: { fractions: ["doc-1", "doc-2"] },
		conceptGaps: ["fractions"],
		difficultyProgression: {},
		representationProgression: {},
		redundancy: { "doc-1": [], "doc-2": [] },
		coverageSummary: {
			totalConcepts: 1,
			docsPerConcept: { fractions: 2 },
			perDocument: { "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 1, representations: ["text"], dominantDifficulty: "medium" }, "doc-2": { documentId: "doc-2", conceptCount: 1, problemCount: 0, instructionalDensity: 0, representations: [], dominantDifficulty: "low" } },
			conceptCoverage: {
				fractions: { concept: "fractions", documentIds: ["doc-1", "doc-2"], averageScore: 2.1, totalScore: 4.2, coverageScore: 2.1, gapScore: 1.75, freqProblems: 1, freqPages: 1, freqDocuments: 2, groupCount: 1, multipartPresence: 0, crossDocumentAnchor: true, gap: true, noiseCandidate: false, stability: 2.2, overlapStrength: 2.3, redundancy: 0.8 },
			},
		},
		documentSimilarity: [],
		conceptToDocumentMap: { fractions: ["doc-1", "doc-2"] },
		updatedAt: new Date().toISOString(),
	};
	return {
		session: { sessionId: "session-1", documentIds: ["doc-1", "doc-2"], documentRoles: {}, sessionRoles: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
		registeredDocuments: [],
		analyzedDocuments,
		collectionAnalysis,
		sourceFileNames: { "doc-1": "doc-1.pdf", "doc-2": "doc-2.pdf" },
		groupedUnits: [] as InstructionalUnit[],
	};
}

describe("buildInstructionalAnalysis", () => {
	it("projects overlap and gap metadata onto instructional concepts", () => {
		const analysis = buildInstructionalAnalysis(buildContext());
		expect(analysis.concepts[0]?.concept).toBe("fractions");
		expect(analysis.concepts[0]?.overlapStrength).toBeGreaterThan(0);
		expect(analysis.concepts[0]?.gapScore).toBeGreaterThan(0);
		expect(analysis.concepts[0]?.isCrossDocumentAnchor).toBe(true);
	});
});