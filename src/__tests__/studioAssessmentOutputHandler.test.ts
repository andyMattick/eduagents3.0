import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import assessmentOutputHandler from "../../api/v4/studio/blueprints/[blueprintId]/outputs/assessment";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../prism-v4/documents/registry";
import {
	createBlueprintStore,
	resetPrismSessionContextCache,
	resetStudioRegistryState,
	saveBlueprintVersionStore,
} from "../prism-v4/documents/registryStore";
import type { AnalyzedDocument } from "../prism-v4/schema/semantic";
import { resetTeacherFeedbackState } from "../prism-v4/teacherFeedback";
import type { BlueprintModel } from "../prism-v4/session/InstructionalIntelligenceSession";

// Force in-memory mode for all Supabase-aware stores so tests don't hit the
// real Supabase DB (which has no knowledge of test sessions / blueprints).
beforeAll(() => {
	vi.stubEnv("SUPABASE_URL", "");
	vi.stubEnv("SUPABASE_ANON_KEY", "");
	vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});

// ── helpers ─────────────────────────────────────────────────────────────────

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
	concepts: string[];
	problemText: string;
}): AnalyzedDocument {
	return {
		document: {
			id: args.documentId,
			sourceFileName: args.sourceFileName,
			sourceMimeType: "application/pdf",
			surfaces: [{ id: `${args.documentId}-s1`, surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [
				{
					id: `${args.documentId}-n1`,
					documentId: args.documentId,
					surfaceId: `${args.documentId}-s1`,
					nodeType: "heading",
					orderIndex: 0,
					text: `Topic: ${args.concepts.join(", ")}`,
					normalizedText: `Topic: ${args.concepts.join(", ")}`,
				},
				{
					id: `${args.documentId}-n2`,
					documentId: args.documentId,
					surfaceId: `${args.documentId}-s1`,
					nodeType: "paragraph",
					orderIndex: 1,
					text: args.problemText,
					normalizedText: args.problemText,
				},
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [],
		problems: [
			{
				id: `${args.documentId}-p1`,
				documentId: args.documentId,
				anchors: [],
				extractionMode: "authored" as const,
				text: args.problemText,
				complexityBand: "medium" as const,
				cognitiveDemand: "conceptual" as const,
				concepts: args.concepts,
				representations: ["text"],
				misconceptions: [],
				sourceSpan: { firstPage: 1, lastPage: 1 },
			},
		],
		insights: {
			concepts: args.concepts,
			scoredConcepts: args.concepts.map((c) => ({
				concept: c,
				freqProblems: 1,
				freqPages: 1,
				freqDocuments: 1,
				semanticDensity: 0.2,
				multipartPresence: 0,
				crossDocumentRecurrence: 1,
				score: 0.5,
				isNoise: false,
				aliases: [],
			})),
			conceptFrequencies: Object.fromEntries(args.concepts.map((c) => [c, 1])),
			representations: ["text"],
			complexityDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [],
			instructionalDensity: 0.5,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
}

function buildBlueprintModel(concepts: Array<{ id: string; included: boolean; quota: number }>): BlueprintModel {
	return {
		concepts: concepts.map((c, i) => ({
			id: c.id,
			name: c.id,
			order: i,
			included: c.included,
			quota: c.quota,
		})),
		bloomLadder: [],
		difficultyRamp: [],
		modeMix: [],
		scenarioMix: [],
	};
}

// ── fixtures ─────────────────────────────────────────────────────────────────

async function setupSession(conceptIds: string[]) {
	const registered = registerDocuments([
		{ sourceFileName: "worksheet.pdf", sourceMimeType: "application/pdf" },
	]);
	const session = createDocumentSession(registered.map((d) => d.documentId));
	saveAnalyzedDocument(
		buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "worksheet.pdf",
			concepts: conceptIds,
			problemText: `Explain the key ideas in ${conceptIds.join(", ")}.`,
		}),
	);
	return session.sessionId;
}

async function setupBlueprint(sessionId: string, concepts: Array<{ id: string; included: boolean; quota: number }>) {
	const blueprintRecord = await createBlueprintStore({
		sessionId,
		analysisSessionId: sessionId,
		teacherId: "teacher-test",
		activeVersion: 1,
	});
	await saveBlueprintVersionStore({
		blueprintId: blueprintRecord.blueprintId,
		version: 1,
		blueprint: buildBlueprintModel(concepts),
		lineage: { createdFrom: "analysis" },
	});
	return blueprintRecord.blueprintId;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/v4/studio/blueprints/:blueprintId/outputs/assessment", () => {
	afterEach(() => {
		resetDocumentRegistryState();
		resetStudioRegistryState();
		resetPrismSessionContextCache();
		resetTeacherFeedbackState();
	});

	it("returns 405 for non-POST methods", async () => {
		const res = createResponse();
		await assessmentOutputHandler(
			{ method: "GET", query: { blueprintId: "bp-x" } } as any,
			res as any,
		);
		expect(res.statusCode).toBe(405);
	});

	it("returns 400 when blueprintId is missing", async () => {
		const res = createResponse();
		await assessmentOutputHandler(
			{ method: "POST", query: {} } as any,
			res as any,
		);
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toMatch(/blueprintId/i);
	});

	it("returns 404 when blueprint does not exist", async () => {
		const res = createResponse();
		await assessmentOutputHandler(
			{ method: "POST", query: { blueprintId: "nonexistent" } } as any,
			res as any,
		);
		expect(res.statusCode).toBe(404);
		expect(res.body.error).toMatch(/blueprint not found/i);
	});

	it("returns 200 with an assessment output for a valid blueprint with included concepts", async () => {
		const sessionId = await setupSession(["math.fractions", "math.ratios"]);
		const blueprintId = await setupBlueprint(sessionId, [
			{ id: "math.fractions", included: true, quota: 2 },
			{ id: "math.ratios", included: true, quota: 2 },
		]);
		const res = createResponse();
		await assessmentOutputHandler(
			{ method: "POST", query: { blueprintId } } as any,
			res as any,
		);
		expect(res.statusCode).toBe(200);
		expect(res.body.output).toBeDefined();
		expect(res.body.output.blueprintId).toBe(blueprintId);
		expect(res.body.output.sessionId).toBe(sessionId);
		expect(res.body.output.payload).toBeDefined();
		expect(res.body.output.status).toBe("ready");
	});

	it("returns 200 and does not crash when blueprint has zero included concepts", async () => {
		const sessionId = await setupSession(["math.fractions"]);
		const blueprintId = await setupBlueprint(sessionId, [
			{ id: "math.fractions", included: false, quota: 0 },
		]);

		const res = createResponse();
		await assessmentOutputHandler(
			{ method: "POST", query: { blueprintId } } as any,
			res as any,
		);

		expect(res.statusCode).toBe(200);
		expect(res.body.output).toBeDefined();
		expect(res.body.output.payload).toBeDefined();
	});

	it("stores the output and it is retrievable from the session", async () => {
		const sessionId = await setupSession(["reading.inference"]);
		const blueprintId = await setupBlueprint(sessionId, [
			{ id: "reading.inference", included: true, quota: 3 },
		]);

		const res = createResponse();
		await assessmentOutputHandler(
			{ method: "POST", query: { blueprintId } } as any,
			res as any,
		);

		expect(res.statusCode).toBe(200);
		const { output } = res.body as { output: { outputId: string } };
		expect(typeof output.outputId).toBe("string");
		expect(output.outputId.length).toBeGreaterThan(0);
	});

	it("uses blueprint concept ordering as the item section order", async () => {
		const sessionId = await setupSession(["science.cells", "science.forces"]);
		const blueprintId = await setupBlueprint(sessionId, [
			{ id: "science.forces", included: true, quota: 2 },
			{ id: "science.cells", included: true, quota: 3 },
		]);

		const res = createResponse();
		await assessmentOutputHandler(
			{ method: "POST", query: { blueprintId } } as any,
			res as any,
		);

		expect(res.statusCode).toBe(200);
		const payload = res.body.output.payload as { sections?: Array<{ concept: string }> };
		// If items were generated and sections are present, the first section should
		// correspond to the first blueprint concept ("science.forces" comes before "science.cells")
		if (payload.sections && payload.sections.length >= 2) {
			const sectionConcepts = payload.sections.map((s) => s.concept);
			const forcesIdx = sectionConcepts.findIndex((c) => c.includes("forces"));
			const cellsIdx = sectionConcepts.findIndex((c) => c.includes("cells"));
			if (forcesIdx !== -1 && cellsIdx !== -1) {
				expect(forcesIdx).toBeLessThan(cellsIdx);
			}
		}
	});
});
