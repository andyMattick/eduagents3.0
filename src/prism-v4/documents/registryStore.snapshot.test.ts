import { afterEach, describe, expect, it, vi } from "vitest";

import intentHandler from "../../../api/v4/documents/intent";
import {
	createDocumentSessionStore,
	loadPrismSessionContextCached,
	loadPrismSessionSnapshot,
	registerDocumentsStore,
	resetPrismSessionContextCache,
	resetPrismSessionSnapshotStore,
	saveAnalyzedDocumentStore,
	saveCollectionAnalysisStore,
} from "./registryStore";
import { resetDocumentRegistryState } from "./registry";
import type { AnalyzedDocument, DocumentCollectionAnalysis } from "../schema/semantic";

function createResponse() {
	const res: any = {};
	res.status = (code: number) => {
		res.statusCode = code;
		return res;
	};
	res.json = (body: unknown) => {
		res.body = body;
		return res;
	};
	res.setHeader = () => res;
	return res;
}

function buildAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	concept: string;
	problemText: string;
	updatedAt?: string;
}): AnalyzedDocument {
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
				representations: ["text"],
				difficulty: "low",
				misconceptions: [],
				cognitiveDemand: "procedural",
			},
		],
		insights: {
			concepts: [args.concept],
			conceptFrequencies: { [args.concept]: 1 },
			representations: ["text"],
			difficultyDistribution: { low: 1, medium: 0, high: 0 },
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt,
	};
}

describe("Prism session snapshots", () => {
	afterEach(() => {
		resetPrismSessionContextCache();
		resetPrismSessionSnapshotStore();
		resetDocumentRegistryState();
		vi.restoreAllMocks();
	});

	it("reuses a persisted snapshot after the in-memory cache is cleared", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-snapshot-load");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Solve 1/2 + 1/4.",
		}), session.sessionId);

		const firstContext = await loadPrismSessionContextCached(session.sessionId);
		expect(firstContext).not.toBeNull();
		const snapshot = await loadPrismSessionSnapshot(session.sessionId);
		expect(snapshot).not.toBeNull();
		expect(snapshot?.context.analyzedDocuments).toHaveLength(1);

		resetPrismSessionContextCache();
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const secondContext = await loadPrismSessionContextCached(session.sessionId);

		expect(secondContext?.sourceFileNames[document!.documentId]).toBe("notes.pdf");
		expect(secondContext?.analyzedDocuments[0]?.insights.concepts).toEqual(["fractions"]);
		expect(logSpy.mock.calls.filter(([message]) => message === "loadPrismSessionContext")).toHaveLength(0);
	});

	it("invalidates persisted snapshots after document and analysis mutations", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-snapshot-invalidate");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Solve 1/2 + 1/4.",
		}), session.sessionId);
		await loadPrismSessionContextCached(session.sessionId);
		expect(await loadPrismSessionSnapshot(session.sessionId)).not.toBeNull();

		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "decimals",
			problemText: "Explain why 0.5 is equal to 1/2.",
		}), session.sessionId);
		expect(await loadPrismSessionSnapshot(session.sessionId)).toBeNull();

		await loadPrismSessionContextCached(session.sessionId);
		const rebuiltSnapshot = await loadPrismSessionSnapshot(session.sessionId);
		expect(rebuiltSnapshot?.context.analyzedDocuments[0]?.insights.concepts).toEqual(["decimals"]);

		const nextAnalysis: DocumentCollectionAnalysis = {
			...rebuiltSnapshot!.context.collectionAnalysis,
			conceptGaps: ["custom gap"],
			updatedAt: "2026-03-27T01:00:00.000Z",
		};
		await saveCollectionAnalysisStore(nextAnalysis);
		expect(await loadPrismSessionSnapshot(session.sessionId)).toBeNull();
	});

	it("lets the intent route reuse a persisted snapshot on the second request after cache reset", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-snapshot-route");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Solve 1/2 + 1/4.",
		}), session.sessionId);

		const firstRes = createResponse();
		await intentHandler({
			method: "POST",
			body: { sessionId: session.sessionId, documentIds: [document!.documentId], intentType: "build-lesson" },
		} as any, firstRes as any);
		expect(firstRes.statusCode).toBe(200);

		resetPrismSessionContextCache();
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

		const secondRes = createResponse();
		await intentHandler({
			method: "POST",
			body: { sessionId: session.sessionId, documentIds: [document!.documentId], intentType: "build-lesson" },
		} as any, secondRes as any);

		expect(secondRes.statusCode).toBe(200);
		expect(logSpy.mock.calls.filter(([message]) => message === "loadPrismSessionContext")).toHaveLength(0);
	});
});