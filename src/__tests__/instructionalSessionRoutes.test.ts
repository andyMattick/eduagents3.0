import { afterEach, describe, expect, it } from "vitest";

import buildIntentHandler from "../../api/v4/documents/intent";
import assessmentPreviewHandler from "../../api/v4/sessions/[sessionId]/assessment-preview";
import builderPlanHandler from "../../api/v4/sessions/[sessionId]/builder-plan";
import blueprintHandler from "../../api/v4/sessions/[sessionId]/blueprint";
import teacherFingerprintHandler from "../../api/v4/teachers/[teacherId]/fingerprint";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../prism-v4/documents/registry";
import { resetTeacherFeedbackState } from "../prism-v4/teacherFeedback";
import type { AnalyzedDocument } from "../prism-v4/schema/semantic";

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
	difficulty?: "low" | "medium" | "high";
}): AnalyzedDocument {
	const difficulty = args.difficulty ?? "medium";
	return {
		document: {
			id: args.documentId,
			sourceFileName: args.sourceFileName,
			sourceMimeType: "application/pdf",
			surfaces: [{ id: `${args.documentId}-surface-1`, surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [
				{ id: `${args.documentId}-node-1`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "heading", orderIndex: 0, text: `Learning target: ${args.concepts.join(", ")}`, normalizedText: `Learning target: ${args.concepts.join(", ")}` },
				{ id: `${args.documentId}-node-2`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "paragraph", orderIndex: 1, text: args.problemText, normalizedText: args.problemText },
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{ id: `${args.documentId}-fragment-1`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }], isInstructional: true, instructionalRole: "objective", contentType: "heading", learningTarget: args.concepts.join(", "), prerequisiteConcepts: [...args.concepts], scaffoldLevel: "medium", misconceptionTriggers: [], confidence: 0.95, classifierVersion: "wave5-test", strategy: "rule-based" },
		],
		problems: [
			{ id: `${args.documentId}-problem-1`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }], text: args.problemText, extractionMode: "authored", concepts: [...args.concepts], representations: ["text"], difficulty, misconceptions: [`common error with ${args.concepts[0]!.toLowerCase()}`], cognitiveDemand: difficulty === "high" ? "analysis" : "conceptual" },
		],
		insights: {
			concepts: [...args.concepts],
			conceptFrequencies: Object.fromEntries(args.concepts.map((concept) => [concept, 1])),
			representations: ["text"],
			difficultyDistribution: { low: difficulty === "low" ? 1 : 0, medium: difficulty === "medium" ? 1 : 0, high: difficulty === "high" ? 1 : 0 },
			misconceptionThemes: [`common error with ${args.concepts[0]!.toLowerCase()}`],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
}

describe("instructional session routes", () => {
	afterEach(() => {
		resetDocumentRegistryState();
		resetTeacherFeedbackState();
	});

	it("serves and updates a session-scoped blueprint plus teacher fingerprint payloads", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "decimals.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "percents.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "decimals.pdf",
			concepts: ["decimal operations"],
			problemText: "Compare the decimals 0.4 and 0.35.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "percents.pdf",
			concepts: ["percent increase"],
			problemText: "Explain the percent increase from 40 to 50.",
			difficulty: "high",
		}));

		const buildRes = createResponse();
		await buildIntentHandler({
			method: "POST",
			body: {
				sessionId: session.sessionId,
				documentIds: registered.map((document) => document.documentId),
				intentType: "build-test",
				options: { itemCount: 2 },
			},
		} as any, buildRes as any);

		expect(buildRes.statusCode).toBe(200);

		const blueprintGetRes = createResponse();
		await blueprintHandler({ method: "GET", query: { sessionId: session.sessionId } } as any, blueprintGetRes as any);

		expect(blueprintGetRes.statusCode).toBe(200);
		expect(blueprintGetRes.body.sessionId).toBe(session.sessionId);
		expect(blueprintGetRes.body.assessmentId).toBe(buildRes.body.productId);
		expect(blueprintGetRes.body.blueprint.concepts.length).toBeGreaterThan(0);
		expect(blueprintGetRes.body.conceptMap.nodes.length).toBeGreaterThan(0);

		const blueprintPatchRes = createResponse();
		await blueprintHandler({
			method: "PATCH",
			query: { sessionId: session.sessionId },
			body: {
				concepts: [{ id: "decimal-operations", name: "decimal operations", order: 0, included: true, quota: 3 }],
				bloomLadder: [{ level: "apply", count: 2 }],
			},
		} as any, blueprintPatchRes as any);

		expect(blueprintPatchRes.statusCode).toBe(200);
		expect(blueprintPatchRes.body.blueprint.concepts[0].quota).toBe(3);
		expect(blueprintPatchRes.body.blueprint.bloomLadder[0].level).toBe("apply");

		const teacherGetRes = createResponse();
		await teacherFingerprintHandler({ method: "GET", query: { teacherId: "00000000-0000-4000-8000-000000000001" } } as any, teacherGetRes as any);

		expect(teacherGetRes.statusCode).toBe(200);
		expect(teacherGetRes.body.teacherId).toBe("00000000-0000-4000-8000-000000000001");

		const teacherPatchRes = createResponse();
		await teacherFingerprintHandler({
			method: "PATCH",
			query: { teacherId: "00000000-0000-4000-8000-000000000001" },
			body: {
				bloomPreferences: [{ level: "analyze", count: 3 }],
				modePreferences: [{ mode: "compare", count: 2 }],
				scenarioPreferences: [{ scenario: "real-world", count: 2 }],
				difficultyPreferences: [],
			},
		} as any, teacherPatchRes as any);

		expect(teacherPatchRes.statusCode).toBe(200);
		expect(teacherPatchRes.body.fingerprint.bloomPreferences[0].level).toBe("analyze");
		expect(teacherPatchRes.body.fingerprint.modePreferences[0].mode).toBe("compare");
		expect(teacherPatchRes.body.fingerprint.scenarioPreferences[0].scenario).toBe("real-world");
	});

	it("serves builder plan and assessment preview session facades", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "decimals.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "percents.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "decimals.pdf",
			concepts: ["decimal operations"],
			problemText: "Compare the decimals 0.4 and 0.35.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "percents.pdf",
			concepts: ["percent increase"],
			problemText: "Explain the percent increase from 40 to 50.",
			difficulty: "high",
		}));

		const buildRes = createResponse();
		await buildIntentHandler({
			method: "POST",
			body: {
				sessionId: session.sessionId,
				documentIds: registered.map((document) => document.documentId),
				intentType: "build-test",
				options: { itemCount: 2 },
			},
		} as any, buildRes as any);

		expect(buildRes.statusCode).toBe(200);

		const builderPlanRes = createResponse();
		await builderPlanHandler({ method: "GET", query: { sessionId: session.sessionId } } as any, builderPlanRes as any);

		expect(builderPlanRes.statusCode).toBe(200);
		expect(builderPlanRes.body.sessionId).toBe(session.sessionId);
		expect(builderPlanRes.body.builderPlan.sections.length).toBeGreaterThan(0);
		expect(builderPlanRes.body.builderPlan.sections[0]).toMatchObject({
			conceptId: expect.any(String),
			conceptName: expect.any(String),
			itemCount: expect.any(Number),
		});

		const previewRes = createResponse();
		await assessmentPreviewHandler({ method: "GET", query: { sessionId: session.sessionId } } as any, previewRes as any);

		expect(previewRes.statusCode).toBe(200);
		expect(previewRes.body.sessionId).toBe(session.sessionId);
		expect(previewRes.body.assessmentPreview.items.length).toBeGreaterThan(0);
		expect(previewRes.body.assessmentPreview.items[0]).toMatchObject({
			itemId: expect.any(String),
			stem: expect.any(String),
			conceptId: expect.any(String),
			teacherReasons: expect.any(Array),
		});
	});
});