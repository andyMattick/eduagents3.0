import { afterEach, describe, expect, it, vi } from "vitest";

import { buildIntentPayload } from "./intents/buildIntentProduct";
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

describe("buildIntentPayload purity", () => {
	afterEach(() => {
		resetPrismSessionContextCache();
		resetPrismSessionSnapshotStore();
		resetDocumentRegistryState();
		vi.restoreAllMocks();
	});

	it("does not trigger hydration once a PrismSessionContext has been preloaded", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-builder-purity");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument(document!.documentId, "notes.pdf", "fractions", "Solve 1/2 + 1/4."), session.sessionId);

		const context = await loadPrismSessionContext(session.sessionId);
		expect(context).not.toBeNull();
		if (!context) {
			throw new Error("Expected PrismSessionContext");
		}

		const spyUncached = vi.spyOn(registryStore, "loadPrismSessionContext");
		const spyCached = vi.spyOn(registryStore, "loadPrismSessionContextCached");

		const payload = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [document!.documentId],
			intentType: "build-lesson",
		}, context);

		expect(payload.kind).toBe("lesson");
		expect(spyUncached).not.toHaveBeenCalled();
		expect(spyCached).not.toHaveBeenCalled();
	});
});