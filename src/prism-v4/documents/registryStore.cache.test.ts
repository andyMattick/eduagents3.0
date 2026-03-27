import { afterEach, describe, expect, it, vi } from "vitest";

import {
	createDocumentSessionStore,
	loadPrismSessionContext,
	loadPrismSessionContextCached,
	registerDocumentsStore,
	resetPrismSessionContextCache,
	resetPrismSessionSnapshotStore,
	saveAnalyzedDocumentStore,
} from "./registryStore";
import { resetDocumentRegistryState } from "./registry";
import * as registryStore from "./registryStore";
import type { AnalyzedDocument } from "../schema/semantic";

function buildAnalyzedDocument(documentId: string, sourceFileName: string, concept: string, problemText: string): AnalyzedDocument {
	return {
		document: {
			id: documentId,
			sourceFileName,
			sourceMimeType: "application/pdf",
			surfaces: [{ id: `${documentId}-surface-1`, surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [
				{
					id: `${documentId}-node-1`,
					documentId,
					surfaceId: `${documentId}-surface-1`,
					nodeType: "paragraph",
					orderIndex: 0,
					text: problemText,
					normalizedText: problemText,
				},
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{
				id: `${documentId}-fragment-1`,
				documentId,
				anchors: [{ documentId, surfaceId: `${documentId}-surface-1`, nodeId: `${documentId}-node-1` }],
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
				id: `${documentId}-problem-1`,
				documentId,
				anchors: [{ documentId, surfaceId: `${documentId}-surface-1`, nodeId: `${documentId}-node-1` }],
				text: problemText,
				extractionMode: "authored",
				concepts: [concept],
				representations: ["text"],
				difficulty: "low",
				misconceptions: [],
				cognitiveDemand: "procedural",
			},
		],
		insights: {
			concepts: [concept],
			conceptFrequencies: { [concept]: 1 },
			representations: ["text"],
			difficultyDistribution: { low: 1, medium: 0, high: 0 },
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
}

describe("registryStore preload cache behavior", () => {
	afterEach(() => {
		resetPrismSessionContextCache();
		resetPrismSessionSnapshotStore();
		resetDocumentRegistryState();
		vi.restoreAllMocks();
	});

	it("cached loader delegates to underlying loader only once for repeated calls", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-cache-spy");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument(document!.documentId, "notes.pdf", "fractions", "Solve 1/2 + 1/4."), session.sessionId);

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

		await loadPrismSessionContextCached(session.sessionId);
		await loadPrismSessionContextCached(session.sessionId);

		expect(logSpy.mock.calls.filter(([message]) => message === "loadPrismSessionContext")).toHaveLength(1);
	});

	it("cached loader is still invoked each time callers request context", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-cache-request");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument(document!.documentId, "notes.pdf", "fractions", "Solve 1/2 + 1/4."), session.sessionId);

		const spyCached = vi.spyOn(registryStore, "loadPrismSessionContextCached");

		await loadPrismSessionContextCached(session.sessionId);
		await loadPrismSessionContextCached(session.sessionId);

		expect(spyCached).toHaveBeenCalledTimes(2);
	});

	it("full cache and snapshot invalidation forces the underlying loader to run again", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-cache-refresh");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument(document!.documentId, "notes.pdf", "fractions", "Solve 1/2 + 1/4."), session.sessionId);

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

		await loadPrismSessionContextCached(session.sessionId);
		resetPrismSessionContextCache();
		resetPrismSessionSnapshotStore();
		await loadPrismSessionContextCached(session.sessionId);

		expect(logSpy.mock.calls.filter(([message]) => message === "loadPrismSessionContext")).toHaveLength(2);
	});

	it("uncached loader remains callable directly for explicit fresh loads", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-uncached-direct");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument(document!.documentId, "notes.pdf", "fractions", "Solve 1/2 + 1/4."), session.sessionId);

		const context = await loadPrismSessionContext(session.sessionId);

		expect(context?.session.sessionId).toBe(session.sessionId);
		expect(context?.analyzedDocuments).toHaveLength(1);
	});
});