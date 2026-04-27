import { describe, expect, it, vi, beforeEach } from "vitest";
import type { BlueprintModel } from "../../session/InstructionalIntelligenceSession";

// ─── helpers only — no Supabase, no network ──────────────────────────────────
// Import the pure helper directly. The handler tests mock all I/O.
import { blueprintToRequestParams } from "../../../../api/v4/studio/shared";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TEACHER_ID = "00000000-0000-4000-8000-000000000001";

function makeBlueprint(concepts: Array<{ id: string; name: string; included: boolean; quota: number }>): BlueprintModel {
	return {
		concepts: concepts.map((c, i) => ({
			...c,
			order: i,
			isNoise: false,
			score: 1,
			freqProblems: 1,
			freqDocuments: 1,
			groupCount: 1,
			multipartPresence: 0,
			overlapStrength: 0,
			gapScore: 0,
			coverageScore: 0,
			isCrossDocumentAnchor: false,
		})),
		bloomLadder: [],
		difficultyRamp: [],
		modeMix: [],
		scenarioMix: [],
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests: blueprintToRequestParams (pure, no I/O)
// ─────────────────────────────────────────────────────────────────────────────

describe("blueprintToRequestParams", () => {
	it("maps 3 included concepts to correct sectionOrder and itemCountOverrides", () => {
		const blueprint = makeBlueprint([
			{ id: "fractions", name: "Fractions", included: true, quota: 3 },
			{ id: "ratios", name: "Ratios", included: true, quota: 2 },
			{ id: "decimals", name: "Decimals", included: true, quota: 1 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-1",
			teacherId: "teacher-a",
			unitId: "unit-1",
			fallbackItemCount: 10,
		});

		expect(result.sectionOrder).toEqual(["fractions", "ratios", "decimals"]);
		expect(result.itemCountOverrides).toEqual({ fractions: 3, ratios: 2, decimals: 1 });
		expect(result.totalItems).toBe(6); // 3+2+1
	});

	it("preserves concept ordering from BlueprintModel", () => {
		const blueprint = makeBlueprint([
			{ id: "z-concept", name: "Z", included: true, quota: 2 },
			{ id: "a-concept", name: "A", included: true, quota: 2 },
		]);

		const result = blueprintToRequestParams({ blueprint, blueprintId: "bp-order", fallbackItemCount: 5 });

		expect(result.sectionOrder[0]).toBe("z-concept");
		expect(result.sectionOrder[1]).toBe("a-concept");
	});

	it("excludes concepts with included=false or quota=0", () => {
		const blueprint = makeBlueprint([
			{ id: "active", name: "Active", included: true, quota: 4 },
			{ id: "excluded", name: "Excluded", included: false, quota: 4 },
			{ id: "zero-quota", name: "Zero", included: true, quota: 0 },
		]);

		const result = blueprintToRequestParams({ blueprint, blueprintId: "bp-2", fallbackItemCount: 10 });

		expect(result.sectionOrder).toEqual(["active"]);
		expect(result.itemCountOverrides).toEqual({ active: 4 });
		expect(result.totalItems).toBe(4);
	});

	it("returns conceptBlueprintOption with correct shape when concepts exist", () => {
		const blueprint = makeBlueprint([
			{ id: "fractions", name: "Fractions", included: true, quota: 3 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-3",
			teacherId: "t-1",
			unitId: "u-1",
			fallbackItemCount: 5,
		});

		expect(result.conceptBlueprintOption).toBeDefined();
		expect(result.conceptBlueprintOption?.assessmentId).toBe("bp-3");
		expect(result.conceptBlueprintOption?.teacherId).toBe("t-1");
		expect(result.conceptBlueprintOption?.unitId).toBe("u-1");
		expect(result.conceptBlueprintOption?.edits.sectionOrder).toEqual(["fractions"]);
		expect(result.conceptBlueprintOption?.edits.itemCountOverrides).toEqual({ fractions: 3 });
	});

	it("returns conceptBlueprintOption=undefined and falls back to fallbackItemCount when blueprint is empty", () => {
		const blueprint = makeBlueprint([]);

		const result = blueprintToRequestParams({ blueprint, blueprintId: "bp-empty", fallbackItemCount: 7 });

		expect(result.conceptBlueprintOption).toBeUndefined();
		expect(result.totalItems).toBe(7);
	});

	it("uses fallbackItemCount when all concepts have quota=0", () => {
		const blueprint = makeBlueprint([
			{ id: "fractions", name: "Fractions", included: true, quota: 0 },
		]);

		const result = blueprintToRequestParams({ blueprint, blueprintId: "bp-zero", fallbackItemCount: 12 });

		expect(result.conceptBlueprintOption).toBeUndefined();
		expect(result.totalItems).toBe(12);
	});

	it("uses DEFAULT_TEACHER_ID when teacherId is not supplied", () => {
		const blueprint = makeBlueprint([
			{ id: "fractions", name: "Fractions", included: true, quota: 2 },
		]);

		const result = blueprintToRequestParams({ blueprint, blueprintId: "bp-4", fallbackItemCount: 5 });

		expect(result.conceptBlueprintOption?.teacherId).toBe(DEFAULT_TEACHER_ID);
	});

	it("totalItems is always at least 1", () => {
		const blueprint = makeBlueprint([]);

		const result = blueprintToRequestParams({ blueprint, blueprintId: "bp-min", fallbackItemCount: 0 });

		expect(result.totalItems).toBe(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Handler integration tests: handleStudioAssessmentOutput
// Tests the route handler end-to-end with all I/O mocked.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("../../../../src/prism-v4/documents/registryStore", () => ({
	getBlueprintStore: vi.fn(),
	getBlueprintVersionStore: vi.fn(),
	loadPrismSessionContextCached: vi.fn(),
	saveStudioOutputStore: vi.fn(),
	getStudioSessionEnvelopeStore: vi.fn(),
	updateStudioSessionEnvelopeStore: vi.fn(),
	getCollectionAnalysisStore: vi.fn(),
	listBlueprintsForSessionStore: vi.fn(),
	createBlueprintStore: vi.fn(),
	saveBlueprintVersionStore: vi.fn(),
	setActiveBlueprintForSessionStore: vi.fn(),
	listStudioOutputsForSessionStore: vi.fn(),
	getStudioOutputStore: vi.fn(),
}));

vi.mock("../../../../src/prism-v4/documents/intents/buildIntentProduct", () => ({
	buildIntentPayload: vi.fn(),
}));

vi.mock("../../../../src/prism-v4/session", () => ({
	buildInstructionalAnalysis: vi.fn(),
	buildInstructionalBlueprint: vi.fn(),
	mergeBlueprintModel: vi.fn(),
}));

// Static imports so mock instances remain stable across tests
import { handleStudioAssessmentOutput } from "../../../../api/v4/studio/shared";
import {
	getBlueprintStore,
	getBlueprintVersionStore,
	loadPrismSessionContextCached,
	saveStudioOutputStore,
} from "../../../../src/prism-v4/documents/registryStore";
import { buildIntentPayload } from "../../../../src/prism-v4/documents/intents/buildIntentProduct";
import { buildInstructionalAnalysis } from "../../../../src/prism-v4/session";

const _getBlueprintStore = getBlueprintStore as ReturnType<typeof vi.fn>;
const _getBlueprintVersionStore = getBlueprintVersionStore as ReturnType<typeof vi.fn>;
const _loadPrismSessionContextCached = loadPrismSessionContextCached as ReturnType<typeof vi.fn>;
const _saveStudioOutputStore = saveStudioOutputStore as ReturnType<typeof vi.fn>;
const _buildIntentPayload = buildIntentPayload as ReturnType<typeof vi.fn>;
const _buildInstructionalAnalysis = buildInstructionalAnalysis as ReturnType<typeof vi.fn>;

describe("handleStudioAssessmentOutput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeReq(opts: { method?: string; query?: Record<string, string>; body?: unknown } = {}) {
		return {
			method: opts.method ?? "POST",
			query: opts.query ?? { blueprintId: "bp-test" },
			body: opts.body ?? null,
			url: "/api/v4/studio/blueprints/bp-test/outputs/assessment",
		} as unknown as import("@vercel/node").VercelRequest;
	}

	function makeRes() {
		const res = {
			writableEnded: false,
			_status: 0,
			_body: null as unknown,
			status(code: number) { this._status = code; return this; },
			json(body: unknown) { this._body = body; this.writableEnded = true; return this; },
		};
		return res;
	}

	const stubBlueprintRecord = {
		blueprintId: "bp-test",
		sessionId: "session-test",
		teacherId: undefined,
		unitId: undefined,
		activeVersion: 1,
		status: "active" as const,
		analysisSessionId: "session-test",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const stubBlueprint = makeBlueprint([
		{ id: "fractions", name: "Fractions", included: true, quota: 3 },
		{ id: "ratios", name: "Ratios", included: true, quota: 2 },
	]);

	const stubBlueprintVersion = {
		blueprintId: "bp-test",
		version: 1,
		blueprint: stubBlueprint,
		analysisSnapshot: undefined,
		createdAt: new Date().toISOString(),
	};

	const stubContext = {
		session: { sessionId: "session-test", documentIds: ["doc-1"] },
		analyzedDocuments: [],
		registeredDocuments: [],
		collectionAnalysis: {} as unknown,
		sourceFileNames: {},
		groupedUnits: [],
	} as unknown as import("../../../../src/prism-v4/documents/registryStore").PrismSessionContext;

	const stubProduct = {
		kind: "test",
		focus: null,
		title: "Test",
		overview: "",
		estimatedDurationMinutes: 20,
		sections: [
			{ concept: "fractions", sourceDocumentIds: ["doc-1"], items: [{ itemId: "i-1", prompt: "Q1", concept: "fractions", sourceDocumentId: "doc-1", sourceFileName: "doc.pdf", difficulty: "medium" as const, cognitiveDemand: "understand" as const, answerGuidance: "..." }] },
		],
		totalItemCount: 3,
		generatedAt: new Date().toISOString(),
	};

	const stubOutput = {
		outputId: "output-1",
		sessionId: "session-test",
		blueprintId: "bp-test",
		blueprintVersion: 1,
		outputType: "assessment" as const,
		options: {},
		payload: stubProduct,
		renderModel: stubProduct,
		status: "ready" as const,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	it("returns 405 for non-POST requests", async () => {
		const req = makeReq({ method: "GET" });
		const res = makeRes();
		await handleStudioAssessmentOutput(req, res as unknown as import("@vercel/node").VercelResponse);
		expect(res._status).toBe(405);
	});

	it("returns 404 when blueprint record is not found", async () => {
		getBlueprintStore.mockResolvedValue(null);
		const req = makeReq();
		const res = makeRes();
		await handleStudioAssessmentOutput(req, res as unknown as import("@vercel/node").VercelResponse);
		expect(res._status).toBe(404);
		expect((res._body as Record<string, string>).error).toContain("Blueprint not found");
	});

	it("returns 404 when blueprint version is not found", async () => {
		getBlueprintStore.mockResolvedValue(stubBlueprintRecord);
		getBlueprintVersionStore.mockResolvedValue(null);
		const req = makeReq();
		const res = makeRes();
		await handleStudioAssessmentOutput(req, res as unknown as import("@vercel/node").VercelResponse);
		expect(res._status).toBe(404);
		expect((res._body as Record<string, string>).error).toContain("Blueprint version not found");
	});

	it("returns 404 when session context is not found", async () => {
		getBlueprintStore.mockResolvedValue(stubBlueprintRecord);
		getBlueprintVersionStore.mockResolvedValue(stubBlueprintVersion);
		loadPrismSessionContextCached.mockResolvedValue(null);
		buildInstructionalAnalysis.mockReturnValue({ problems: [], concepts: [] });
		const req = makeReq();
		const res = makeRes();
		await handleStudioAssessmentOutput(req, res as unknown as import("@vercel/node").VercelResponse);
		expect(res._status).toBe(404);
		expect((res._body as Record<string, string>).error).toContain("Session not found");
	});

	it("returns 200 with output artifact for a valid blueprint with included concepts", async () => {
		getBlueprintStore.mockResolvedValue(stubBlueprintRecord);
		getBlueprintVersionStore.mockResolvedValue(stubBlueprintVersion);
		loadPrismSessionContextCached.mockResolvedValue(stubContext);
		buildInstructionalAnalysis.mockReturnValue({ problems: [], concepts: [] });
		buildIntentPayload.mockResolvedValue(stubProduct);
		saveStudioOutputStore.mockResolvedValue(stubOutput);

		const req = makeReq();
		const res = makeRes();
		await handleStudioAssessmentOutput(req, res as unknown as import("@vercel/node").VercelResponse);

		expect(res._status).toBe(200);
		expect((res._body as Record<string, unknown>).output).toBeDefined();
	});

	it("calls buildIntentPayload with intentType=build-test and conceptBlueprint from blueprint", async () => {
		getBlueprintStore.mockResolvedValue(stubBlueprintRecord);
		getBlueprintVersionStore.mockResolvedValue(stubBlueprintVersion);
		loadPrismSessionContextCached.mockResolvedValue(stubContext);
		buildInstructionalAnalysis.mockReturnValue({ problems: [], concepts: [] });
		buildIntentPayload.mockResolvedValue(stubProduct);
		saveStudioOutputStore.mockResolvedValue(stubOutput);

		await handleStudioAssessmentOutput(makeReq(), makeRes() as unknown as import("@vercel/node").VercelResponse);

		const [request] = buildIntentPayload.mock.calls[0];
		expect(request.intentType).toBe("build-test");
		expect(request.options?.conceptBlueprint?.edits.sectionOrder).toEqual(["fractions", "ratios"]);
		expect(request.options?.conceptBlueprint?.edits.itemCountOverrides).toEqual({ fractions: 3, ratios: 2 });
	});

	it("returns 200 and does not crash when blueprint has 0 included concepts", async () => {
		const emptyBlueprint = makeBlueprint([]);
		getBlueprintStore.mockResolvedValue(stubBlueprintRecord);
		getBlueprintVersionStore.mockResolvedValue({ ...stubBlueprintVersion, blueprint: emptyBlueprint });
		loadPrismSessionContextCached.mockResolvedValue(stubContext);
		buildInstructionalAnalysis.mockReturnValue({ problems: [{ problemCount: 5 }], concepts: [] });
		buildIntentPayload.mockResolvedValue(stubProduct);
		saveStudioOutputStore.mockResolvedValue(stubOutput);

		const req = makeReq();
		const res = makeRes();
		await handleStudioAssessmentOutput(req, res as unknown as import("@vercel/node").VercelResponse);

		expect(res._status).toBe(200);
		const [request] = buildIntentPayload.mock.calls[0];
		// No conceptBlueprint option when blueprint is empty
		expect(request.options?.conceptBlueprint).toBeUndefined();
	});
});
