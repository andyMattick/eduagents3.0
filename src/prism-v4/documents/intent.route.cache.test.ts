import { afterEach, describe, expect, it, vi } from "vitest";

import intentHandler from "../../../api/v4/documents/intent";
import {
	createDocumentSessionStore,
	registerDocumentsStore,
	resetPrismSessionContextCache,
	resetPrismSessionSnapshotStore,
	saveAnalyzedDocumentStore,
} from "./registryStore";
import { resetDocumentRegistryState } from "./registry";
import * as registryStore from "./registryStore";
import type { AnalyzedDocument } from "../schema/semantic";

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

describe("intent route preload behavior", () => {
	afterEach(() => {
		resetPrismSessionContextCache();
		resetPrismSessionSnapshotStore();
		resetDocumentRegistryState();
		vi.restoreAllMocks();
	});

	it("calls the cached loader for each request while only hydrating once across repeated requests", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], "session-route-cache");
		await saveAnalyzedDocumentStore(buildAnalyzedDocument(document!.documentId, "notes.pdf", "fractions", "Solve 1/2 + 1/4."), session.sessionId);

		const spyCached = vi.spyOn(registryStore, "loadPrismSessionContextCached");
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

		const req1: any = {
			method: "POST",
			body: { sessionId: session.sessionId, documentIds: [document!.documentId], intentType: "build-lesson" },
		};
		const res1 = createResponse();
		await intentHandler(req1, res1);

		const req2: any = {
			method: "POST",
			body: { sessionId: session.sessionId, documentIds: [document!.documentId], intentType: "build-lesson" },
		};
		const res2 = createResponse();
		await intentHandler(req2, res2);

		expect(res1.statusCode).toBe(200);
		expect(res2.statusCode).toBe(200);
		expect(spyCached).toHaveBeenCalledTimes(2);
		expect(logSpy.mock.calls.filter(([message]) => message === "loadPrismSessionContext")).toHaveLength(1);
	});
});