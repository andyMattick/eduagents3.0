import { afterEach, describe, expect, it, vi } from "vitest";

import intentHandler from "../../../api/v4/documents/intent";
import * as supabaseModule from "../../../lib/supabase";
import {
	createDocumentSessionStore,
	invalidatePrismSessionSnapshot,
	loadPrismSessionContextCached,
	loadPrismSessionSnapshot,
	registerDocumentsStore,
	resetPrismSessionContextCache,
	resetPrismSessionSnapshotStore,
	savePrismSessionSnapshot,
	saveAnalyzedDocumentStore,
	saveCollectionAnalysisStore,
} from "./registryStore";
import { resetDocumentRegistryState } from "./registry";
import { buildInstructionalUnitOverrideId, resetTeacherFeedbackState, saveTeacherFeedback } from "../teacherFeedback";
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
	// Unique suffix per test run prevents Supabase document accumulation across runs.
	const runId = Date.now().toString(36);
	const SESSION_LOAD = `session-snapshot-load-${runId}`;
	const SESSION_INVALIDATE = `session-snapshot-invalidate-${runId}`;
	const SESSION_UNIT_OVERRIDE = `session-snapshot-unit-override-${runId}`;
	const SESSION_ROUTE = `session-snapshot-route-${runId}`;

	afterEach(async () => {
		await Promise.all(
			[SESSION_LOAD, SESSION_INVALIDATE, SESSION_UNIT_OVERRIDE, SESSION_ROUTE]
				.map((id) => invalidatePrismSessionSnapshot(id)),
		);
		resetPrismSessionContextCache();
		resetPrismSessionSnapshotStore();
		resetDocumentRegistryState();
		resetTeacherFeedbackState();
		vi.restoreAllMocks();
	});

	it("reuses a persisted snapshot after the in-memory cache is cleared", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], SESSION_LOAD);
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
		const session = await createDocumentSessionStore([document!.documentId], SESSION_INVALIDATE);
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

	it("rehydrates snapshot-backed grouped units with live concept overrides", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], SESSION_UNIT_OVERRIDE);
		await saveAnalyzedDocumentStore(buildAnalyzedDocument({
			documentId: document!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Solve 1/2 + 1/4.",
		}), session.sessionId);

		const firstContext = await loadPrismSessionContextCached(session.sessionId);
		const unit = firstContext?.groupedUnits[0];
		expect(await loadPrismSessionSnapshot(session.sessionId)).not.toBeNull();

		resetPrismSessionContextCache();
		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: session.sessionId,
			canonicalProblemId: buildInstructionalUnitOverrideId(session.sessionId, unit!.unitId),
			target: "concepts",
			aiValue: { fractions: 1 },
			teacherValue: { ratios: 1 },
		});

		const secondContext = await loadPrismSessionContextCached(session.sessionId);
		expect(secondContext?.groupedUnits[0]?.concepts).toEqual(["ratios"]);
	});

	it("lets the intent route reuse a persisted snapshot on the second request after cache reset", async () => {
		const [document] = await registerDocumentsStore([{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" }]);
		const session = await createDocumentSessionStore([document!.documentId], SESSION_ROUTE);
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

	it("falls back to in-memory snapshots when the Supabase snapshot table is missing", async () => {
		const previousUrl = process.env.SUPABASE_URL;
		const previousAnonKey = process.env.SUPABASE_ANON_KEY;
		process.env.SUPABASE_URL = "https://example.supabase.co";
		process.env.SUPABASE_ANON_KEY = "test-anon-key";

		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const restSpy = vi.spyOn(supabaseModule, "supabaseRest").mockRejectedValue(
			new Error(`Supabase REST DELETE prism_v4_session_snapshots failed (404): {"code":"PGRST205","message":"Could not find the table 'public.prism_v4_session_snapshots' in the schema cache"}`),
		);

		const sessionId = "session-snapshot-missing-table";
		const context = {
			session: {
				sessionId,
				documentIds: ["doc-1"],
				documentRoles: { "doc-1": ["unknown"] },
				sessionRoles: { "doc-1": ["source-material"] },
				createdAt: "2026-03-27T00:00:00.000Z",
				updatedAt: "2026-03-27T00:00:00.000Z",
			},
			registeredDocuments: [],
			analyzedDocuments: [],
			collectionAnalysis: {
				sessionId,
				documentIds: ["doc-1"],
				conceptOverlap: {},
				conceptGaps: [],
				difficultyProgression: {},
				representationProgression: {},
				redundancy: { "doc-1": [] },
				coverageSummary: {
					totalConcepts: 0,
					docsPerConcept: {},
					perDocument: {
						"doc-1": {
							documentId: "doc-1",
							conceptCount: 0,
							problemCount: 0,
							instructionalDensity: 0,
							representations: [],
							dominantDifficulty: "low",
						},
					},
				},
				documentSimilarity: [],
				conceptToDocumentMap: {},
				updatedAt: "2026-03-27T00:00:00.000Z",
			},
			sourceFileNames: {},
			groupedUnits: [],
		} as const;

		await expect(savePrismSessionSnapshot(sessionId, context)).resolves.toBeTruthy();
		await expect(loadPrismSessionSnapshot(sessionId)).resolves.toMatchObject({ sessionId });
		await expect(invalidatePrismSessionSnapshot(sessionId)).resolves.toBeUndefined();
		expect(await loadPrismSessionSnapshot(sessionId)).toBeNull();
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("falling back to in-memory snapshots"));

		restSpy.mockRestore();
		warnSpy.mockRestore();
		if (previousUrl === undefined) {
			delete process.env.SUPABASE_URL;
		} else {
			process.env.SUPABASE_URL = previousUrl;
		}
		if (previousAnonKey === undefined) {
			delete process.env.SUPABASE_ANON_KEY;
		} else {
			process.env.SUPABASE_ANON_KEY = previousAnonKey;
		}
	});
});