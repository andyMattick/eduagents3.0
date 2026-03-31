import { describe, expect, it, beforeEach } from "vitest";
import { buildDocumentCollectionAnalysis } from "./buildCollectionAnalysis";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../registry";
import type { AnalyzedDocument } from "../../schema/semantic";

function buildAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	concepts: Array<{ concept: string; score: number; freqProblems: number; freqPages: number; multipartPresence?: number }>;
}): AnalyzedDocument {
	return {
		document: {
			id: args.documentId,
			sourceFileName: args.sourceFileName,
			sourceMimeType: "application/pdf",
			surfaces: [{ id: `${args.documentId}-surface-1`, surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [{ id: `${args.documentId}-node-1`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "paragraph", orderIndex: 0, text: "Content", normalizedText: "Content" }],
			createdAt: new Date().toISOString(),
		},
		fragments: [],
		problems: args.concepts.map((entry, index) => ({
			id: `${args.documentId}-problem-${index + 1}`,
			documentId: args.documentId,
			problemGroupId: `${args.documentId}-group-${index + 1}`,
			anchors: [],
			text: `Explain ${entry.concept}.`,
			extractionMode: "authored",
			sourceSpan: { firstPage: index + 1, lastPage: index + 1 },
			concepts: [entry.concept],
			representations: ["text"],
			difficulty: "medium",
			misconceptions: [],
			cognitiveDemand: "conceptual",
		})),
		insights: {
			concepts: args.concepts.map((entry) => entry.concept),
			scoredConcepts: args.concepts.map((entry) => ({
				concept: entry.concept,
				freqProblems: entry.freqProblems,
				freqPages: entry.freqPages,
				freqDocuments: 1,
				semanticDensity: 0.4,
				multipartPresence: entry.multipartPresence ?? 0,
				crossDocumentRecurrence: 1,
				score: entry.score,
				isNoise: false,
			})),
			conceptFrequencies: Object.fromEntries(args.concepts.map((entry) => [entry.concept, entry.freqProblems])),
			representations: ["text"],
			difficultyDistribution: { low: 0, medium: args.concepts.length, high: 0 },
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: args.concepts.length,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
}

describe("buildDocumentCollectionAnalysis", () => {
	beforeEach(() => {
		resetDocumentRegistryState();
	});

	it("computes overlap and gap scores from scored concepts", () => {
		const registered = registerDocuments([
			{ sourceFileName: "doc-1.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "doc-2.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((entry) => entry.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "doc-1.pdf",
			concepts: [
				{ concept: "fractions", score: 2.2, freqProblems: 1, freqPages: 1 },
				{ concept: "ratios", score: 0.9, freqProblems: 1, freqPages: 1 },
			],
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "doc-2.pdf",
			concepts: [
				{ concept: "fractions", score: 2.0, freqProblems: 1, freqPages: 1 },
			],
		}));

		const analysis = buildDocumentCollectionAnalysis(session.sessionId);
		expect(analysis).not.toBeNull();
		expect(analysis?.coverageSummary.conceptCoverage?.fractions.overlapStrength).toBeGreaterThan(analysis?.coverageSummary.conceptCoverage?.ratios.overlapStrength ?? 0);
		expect(analysis?.coverageSummary.conceptCoverage?.fractions.crossDocumentAnchor).toBe(true);
		expect(analysis?.coverageSummary.conceptCoverage?.fractions.coverageScore).toBeGreaterThan(0);
		expect(analysis?.coverageSummary.conceptCoverage?.fractions.gapScore).toBeGreaterThan(0);
	});
});