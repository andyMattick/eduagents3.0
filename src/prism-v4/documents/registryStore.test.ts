import { afterEach, describe, expect, it } from "vitest";

import {
	createDocumentSessionStore,
	ensureSessionDocumentsStore,
	loadPrismSessionContextCached,
	registerDocumentsStore,
	resetPrismSessionContextCache,
	resetPrismSessionSnapshotStore,
	saveAnalyzedDocumentStore,
	saveCollectionAnalysisStore,
} from "./registryStore";
import { resetDocumentRegistryState } from "./registry";
import { buildInstructionalUnitOverrideId, resetTeacherFeedbackState, saveTeacherFeedback } from "../teacherFeedback";
import type { AnalyzedDocument, DocumentCollectionAnalysis } from "../schema/semantic";

function buildAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	concept: string;
	problemText: string;
	representation?: string;
	difficulty?: "low" | "medium" | "high";
	updatedAt?: string;
}): AnalyzedDocument {
	const representation = args.representation ?? "text";
	const difficulty = args.difficulty ?? "low";
	const updatedAt = args.updatedAt ?? new Date().toISOString();

	return {
		document: {
			id: args.documentId,
			sourceFileName: args.sourceFileName,
			sourceMimeType: "application/pdf",
			surfaces: [{ id: `${args.documentId}-surface-1`, surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [
				{
					id: `${args.documentId}-node-1`,
					documentId: args.documentId,
					surfaceId: `${args.documentId}-surface-1`,
					nodeType: "paragraph",
					orderIndex: 0,
					text: args.problemText,
					normalizedText: args.problemText,
				},
			],
			createdAt: updatedAt,
		},
		fragments: [
			{
				id: `${args.documentId}-fragment-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }],
				isInstructional: true,
				instructionalRole: "problem-stem",
				contentType: "question",
				confidence: 0.95,
				classifierVersion: "wave3-test",
				prerequisiteConcepts: [args.concept],
				strategy: "rule-based",
			},
		],
		problems: [
			{
				id: `${args.documentId}-problem-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }],
				text: args.problemText,
				extractionMode: "authored",
				concepts: [args.concept],
				representations: [representation],
				difficulty,
				misconceptions: [],
				cognitiveDemand: difficulty === "high" ? "analysis" : "procedural",
			},
		],
		insights: {
			concepts: [args.concept],
			conceptFrequencies: { [args.concept]: 1 },
			representations: [representation],
			difficultyDistribution: {
				low: difficulty === "low" ? 1 : 0,
				medium: difficulty === "medium" ? 1 : 0,
				high: difficulty === "high" ? 1 : 0,
			},
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt,
	};
}

describe("loadPrismSessionContextCached invalidation", () => {
	afterEach(() => {
		resetPrismSessionContextCache();
		resetPrismSessionSnapshotStore();
		resetDocumentRegistryState();
		resetTeacherFeedbackState();
	});

	it("returns fresh session context when a document is uploaded into the session", async () => {
		const [firstDocument] = await registerDocumentsStore([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = await createDocumentSessionStore([firstDocument!.documentId], "session-upload-cache");

		const firstContextPromise = loadPrismSessionContextCached(session.sessionId);
		const firstContext = await firstContextPromise;
		expect(firstContext).not.toBeNull();
		expect(firstContext?.registeredDocuments).toHaveLength(1);
		expect(firstContext?.collectionAnalysis.documentIds).toEqual([firstDocument!.documentId]);

		const [uploadedDocument] = await registerDocumentsStore([
			{ sourceFileName: "quiz.pdf", sourceMimeType: "application/pdf" },
		], session.sessionId);
		await ensureSessionDocumentsStore(session.sessionId, [uploadedDocument!.documentId]);

		const secondContextPromise = loadPrismSessionContextCached(session.sessionId);
		expect(secondContextPromise).not.toBe(firstContextPromise);

		const secondContext = await secondContextPromise;
		expect(secondContext).not.toBeNull();
		expect(secondContext?.registeredDocuments).toHaveLength(2);
		expect(secondContext?.registeredDocuments.map((document) => document.documentId)).toContain(uploadedDocument!.documentId);
		expect(secondContext?.collectionAnalysis.documentIds).toHaveLength(2);
		expect(secondContext?.collectionAnalysis.documentIds).toContain(uploadedDocument!.documentId);
	});

	it("rebuilds cached session context when a document is re-analyzed", async () => {
		const [document] = await registerDocumentsStore([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = await createDocumentSessionStore([document!.documentId], "session-reanalyze-cache");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Solve 1/2 + 1/4.",
			updatedAt: "2026-03-27T00:00:00.000Z",
		}), session.sessionId);

		const firstContextPromise = loadPrismSessionContextCached(session.sessionId);
		const firstContext = await firstContextPromise;
		expect(firstContext?.analyzedDocuments[0]?.insights.concepts).toEqual(["fractions"]);
		expect(firstContext?.collectionAnalysis.conceptToDocumentMap.fractions).toEqual([document!.documentId]);

		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "decimals",
			problemText: "Explain why 0.5 is equal to 1/2.",
			updatedAt: "2026-03-27T00:00:10.000Z",
		}), session.sessionId);

		const secondContextPromise = loadPrismSessionContextCached(session.sessionId);
		expect(secondContextPromise).not.toBe(firstContextPromise);

		const secondContext = await secondContextPromise;
		expect(secondContext?.analyzedDocuments[0]?.insights.concepts).toEqual(["decimals"]);
		expect(secondContext?.collectionAnalysis.conceptToDocumentMap.decimals).toEqual([document!.documentId]);
		expect(secondContext?.collectionAnalysis.conceptToDocumentMap.fractions).toBeUndefined();
	});

	it("returns rebuilt collection analysis after the analysis record is replaced", async () => {
		const [document] = await registerDocumentsStore([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = await createDocumentSessionStore([document!.documentId], "session-analysis-cache");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Solve 1/2 + 1/4.",
			updatedAt: "2026-03-27T00:00:00.000Z",
		}), session.sessionId);

		const firstContextPromise = loadPrismSessionContextCached(session.sessionId);
		const firstContext = await firstContextPromise;
		expect(firstContext).not.toBeNull();

		const rebuiltAnalysis: DocumentCollectionAnalysis = {
			...firstContext!.collectionAnalysis,
			conceptGaps: ["custom gap"],
			updatedAt: "2026-03-27T00:10:00.000Z",
		};
		await saveCollectionAnalysisStore(rebuiltAnalysis);

		const secondContextPromise = loadPrismSessionContextCached(session.sessionId);
		expect(secondContextPromise).not.toBe(firstContextPromise);

		const secondContext = await secondContextPromise;
		expect(secondContext?.collectionAnalysis.conceptGaps).toEqual(["custom gap"]);
		expect(secondContext?.collectionAnalysis.updatedAt).toBe("2026-03-27T00:10:00.000Z");
	});

	it("applies unit concept overrides without invalidating the cached base context", async () => {
		const [document] = await registerDocumentsStore([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = await createDocumentSessionStore([document!.documentId], "session-unit-override-cache");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Solve 1/2 + 1/4.",
		}), session.sessionId);

		const firstContext = await loadPrismSessionContextCached(session.sessionId);
		const unit = firstContext?.groupedUnits[0];
		expect(unit?.concepts).toEqual(["fractions"]);

		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: session.sessionId,
			canonicalProblemId: buildInstructionalUnitOverrideId(session.sessionId, unit!.unitId),
			target: "concepts",
			aiValue: { fractions: 1 },
			teacherValue: { decimals: 1, equivalence: 0.7 },
		});

		const secondContext = await loadPrismSessionContextCached(session.sessionId);
		expect(secondContext?.groupedUnits[0]?.concepts).toEqual(["decimals", "equivalence"]);
		expect(secondContext?.groupedUnits[0]?.unitId).toBe(unit?.unitId);
	});
});