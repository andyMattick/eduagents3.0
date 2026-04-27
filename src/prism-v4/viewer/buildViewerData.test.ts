import { describe, expect, it } from "vitest";

import type { IntentProduct } from "../schema/integration";
import type { AnalyzedDocument, DocumentCollectionAnalysis } from "../schema/semantic";
import type { BlueprintModel, ConceptMapModel, InstructionalSessionWorkspace } from "../session";
import { buildViewerData } from "./buildViewerData";

function makeAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	problemSeed: string;
	concepts: string[];
	groupId: string;
	pages: { firstPage: number; lastPage: number };
	contentHash?: string;
	contentHashV2?: string;
}): AnalyzedDocument {
	return {
		document: {
			id: args.documentId,
			sourceFileName: args.sourceFileName,
			sourceMimeType: "application/pdf",
			surfaces: [],
			nodes: [],
			createdAt: "2026-03-31T00:00:00.000Z",
		},
		fragments: [],
		problems: [
			{
				id: `${args.problemSeed}-1`,
				documentId: args.documentId,
				problemGroupId: args.groupId,
				anchors: [{ documentId: args.documentId, surfaceId: "surface-1", nodeId: "node-1" }],
				text: `Explain ${args.concepts[0]}.`,
				extractionMode: "authored",
				sourceSpan: args.pages,
				concepts: args.concepts,
				representations: ["text"],
				difficulty: "medium",
				misconceptions: ["common-error"],
				cognitiveDemand: "conceptual",
			},
			{
				id: `${args.problemSeed}-2`,
				documentId: args.documentId,
				problemGroupId: args.groupId,
				anchors: [{ documentId: args.documentId, surfaceId: "surface-1", nodeId: "node-2" }],
				text: `Apply ${args.concepts[0]} to a new case.`,
				extractionMode: "authored",
				sourceSpan: args.pages,
				concepts: args.concepts,
				representations: ["visual", "text"],
				difficulty: "medium",
				misconceptions: [],
				cognitiveDemand: "conceptual",
			},
		],
		insights: {
			concepts: args.concepts,
			scoredConcepts: args.concepts.map((concept, index) => ({
				concept,
				freqProblems: 2,
				freqPages: args.pages.lastPage - args.pages.firstPage + 1,
				freqDocuments: 1,
				semanticDensity: 0.8,
				multipartPresence: 1,
				crossDocumentRecurrence: index === 0 ? 1 : 0,
				score: index === 0 ? 0.92 : 0.74,
				isNoise: false,
			})),
			conceptFrequencies: Object.fromEntries(args.concepts.map((concept) => [concept, 2])),
			representations: ["text", "visual"],
			difficultyDistribution: { low: 0, medium: 2, high: 0 },
			misconceptionThemes: ["common-error"],
			instructionalDensity: 0.65,
			problemCount: 2,
			exampleCount: 1,
			explanationCount: 1,
		},
		contentHash: args.contentHash,
		contentHashV1: "hash-v1",
		contentHashV2: args.contentHashV2,
		updatedAt: "2026-03-31T00:00:00.000Z",
	};
}

describe("buildViewerData", () => {
	it("builds viewer data from a workspace and falls back to test-product preview data", () => {
		const analyzedDocuments: AnalyzedDocument[] = [
			makeAnalyzedDocument({
				documentId: "doc-1",
				sourceFileName: "fractions.pdf",
				problemSeed: "fractions",
				concepts: ["fractions", "number sense"],
				groupId: "group-fractions",
				pages: { firstPage: 2, lastPage: 3 },
				contentHash: "preferred-v2",
				contentHashV2: "preferred-v2",
			}),
		];

		const rawAnalysis: DocumentCollectionAnalysis = {
			sessionId: "session-1",
			documentIds: ["doc-1"],
			conceptOverlap: { fractions: ["doc-1"] },
			conceptGaps: [],
			difficultyProgression: {},
			representationProgression: {},
			redundancy: {},
			coverageSummary: {
				totalConcepts: 2,
				docsPerConcept: { fractions: 1, "number sense": 1 },
				perDocument: {
					"doc-1": {
						documentId: "doc-1",
						conceptCount: 2,
						problemCount: 2,
						instructionalDensity: 0.65,
						representations: ["text", "visual"],
						dominantDifficulty: "medium",
						averageConceptScore: 0.83,
						uniqueConcepts: ["fractions", "number sense"],
						anchorConcepts: ["fractions"],
					},
				},
				conceptCoverage: {
					fractions: {
						concept: "fractions",
						documentIds: ["doc-1"],
						averageScore: 0.92,
						totalScore: 0.92,
						coverageScore: 0.92,
						gapScore: 0,
						freqProblems: 2,
						freqPages: 2,
						freqDocuments: 1,
						groupCount: 1,
						multipartPresence: 1,
						crossDocumentAnchor: false,
						gap: false,
						noiseCandidate: false,
						stability: 1,
						overlapStrength: 0,
						redundancy: 0,
					},
				},
			},
			documentSimilarity: [],
			conceptToDocumentMap: { fractions: ["doc-1"], "number sense": ["doc-1"] },
			updatedAt: "2026-03-31T00:00:00.000Z",
		};

		const blueprint: BlueprintModel = {
			concepts: [{ id: "fractions", name: "fractions", order: 1, included: true, quota: 2 }],
			bloomLadder: [],
			difficultyRamp: [],
			modeMix: [],
			scenarioMix: [],
		};

		const conceptMap: ConceptMapModel = {
			nodes: [{ id: "fractions", label: "fractions", weight: 1.4 }],
			edges: [],
		};

		const testProduct: IntentProduct<"build-test"> = {
			sessionId: "session-1",
			intentType: "build-test",
			documentIds: ["doc-1"],
			productId: "product-test-1",
			productType: "build-test",
			schemaVersion: "1",
			createdAt: "2026-03-31T00:00:00.000Z",
			payload: {
				kind: "test",
				focus: null,
				title: "Assessment",
				overview: "Preview",
				estimatedDurationMinutes: 15,
				totalItemCount: 1,
				generatedAt: "2026-03-31T00:00:00.000Z",
				sections: [
					{
						concept: "fractions",
						sourceDocumentIds: ["doc-1"],
						items: [
							{
								itemId: "item-1",
								prompt: "Explain equivalent fractions.",
								concept: "fractions",
								primaryConcepts: ["fractions"],
								groupId: "group-fractions",
								sourceDocumentId: "doc-1",
								sourceFileName: "fractions.pdf",
								sourceSpan: { firstPage: 2, lastPage: 3 },
								difficulty: "medium",
								cognitiveDemand: "conceptual",
								answerGuidance: "Look for equivalence reasoning.",
							},
						],
					},
				],
			},
		};

		const workspace: InstructionalSessionWorkspace = {
			sessionId: "session-1",
			documents: [
				{
					documentId: "doc-1",
					sourceFileName: "fractions.pdf",
					sourceMimeType: "application/pdf",
					createdAt: "2026-03-31T00:00:00.000Z",
				},
			],
			analyzedDocuments,
			rawAnalysis,
			instructionalSession: {
				sessionId: "session-1",
				documentIds: ["doc-1"],
				analysis: {
					concepts: [],
					problems: [],
					misconceptions: [],
					bloomSummary: { Remember: 0, Understand: 0, Apply: 0, Analyze: 0, Evaluate: 0, Create: 0 },
					modeSummary: {},
					scenarioSummary: {},
					difficultySummary: { low: 0, medium: 0, high: 0, averageInstructionalDensity: 0 },
					domain: "Mathematics",
				},
				blueprint,
				conceptMap,
			},
			products: [testProduct],
			selectedIntent: "build-test",
		};

		const viewerData = buildViewerData(workspace);

		expect(viewerData.previewSource).toBe("product");
		expect(viewerData.previewItems[0]).toMatchObject({
			itemId: "item-1",
			groupId: "group-fractions",
			primaryConcepts: ["fractions"],
			sourceSpan: { firstPage: 2, lastPage: 3 },
		});
		expect(viewerData.problemGroups).toHaveLength(1);
		expect(viewerData.problemGroups[0]).toMatchObject({
			groupId: "group-fractions",
			documentId: "doc-1",
			problemCount: 2,
			linkedBy: "groupId",
			linkedPreviewCount: 1,
			previewItemIds: ["item-1"],
		});
		expect(viewerData.scoredConcepts[0]).toMatchObject({
			concept: "fractions",
			coverageScore: 0.92,
			previewCount: 1,
			groupIds: ["group-fractions"],
		});
		expect(viewerData.documents[0]).toMatchObject({
			documentId: "doc-1",
			contentHash: "preferred-v2",
			contentHashV2: "preferred-v2",
			problemCount: 2,
			groupCount: 1,
		});
		expect(viewerData.availableSurfaces).toEqual(["documents", "analysis", "blueprint", "concept-graph", "preview"]);
	});
});