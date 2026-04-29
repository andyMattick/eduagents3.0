import { afterEach, describe, expect, it } from "vitest";

import buildIntentHandler from "../../api/v4/documents/intent";
import ingestAssessmentHandler from "../../api/v4/student-performance/ingestAssessment";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../prism-v4/documents/registry";
import { resetTeacherFeedbackState, updateAssessmentFingerprint } from "../prism-v4/teacherFeedback";
import { getStudentPerformanceProfile, resetStudentPerformanceState } from "../prism-v4/studentPerformance";
import type { AnalyzedDocument } from "../prism-v4/schema/semantic";

function createResponse() {
	const res: any = {};
	res.headers = {};
	res.setHeader = (key: string, value: string) => {
		res.headers[key] = value;
	};
	res.status = (code: number) => {
		res.statusCode = code;
		return res;
	};
	res.json = (body: unknown) => {
		res.body = body;
		return res;
	};
	return res;
}

function buildStatsAnalyzedDocument(args: {
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
				{ id: `${args.documentId}-node-1`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "heading", orderIndex: 0, text: `Learning target: Explain ${args.concepts.join(" and ")}.`, normalizedText: `Learning target: Explain ${args.concepts.join(" and ")}.` },
				{ id: `${args.documentId}-node-2`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "paragraph", orderIndex: 1, text: args.problemText, normalizedText: args.problemText },
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{ id: `${args.documentId}-fragment-1`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }], isInstructional: true, instructionalRole: "objective", contentType: "heading", learningTarget: `Explain ${args.concepts.join(" and ")}`, prerequisiteConcepts: [...args.concepts], scaffoldLevel: "medium", misconceptionTriggers: [], confidence: 0.95, classifierVersion: "wave5-test", strategy: "rule-based" },
			{ id: `${args.documentId}-fragment-2`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }], isInstructional: true, instructionalRole: "problem-stem", contentType: "question", learningTarget: `Explain ${args.concepts.join(" and ")}`, prerequisiteConcepts: [...args.concepts], scaffoldLevel: "medium", misconceptionTriggers: [`common error with ${args.concepts[0]!.toLowerCase()}`], confidence: 0.95, classifierVersion: "wave5-test", strategy: "rule-based" },
		],
		problems: [
			{ id: `${args.documentId}-problem-1`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }], text: args.problemText, extractionMode: "authored", concepts: [...args.concepts], representations: ["text"], complexityBand: difficulty, misconceptions: [`common error with ${args.concepts[0]!.toLowerCase()}`], cognitiveDemand: difficulty === "high" ? "analysis" : "conceptual" },
		],
		insights: {
			concepts: [...args.concepts],
			conceptFrequencies: Object.fromEntries(args.concepts.map((concept) => [concept, 1])),
			representations: ["text"],
			complexityDistribution: { low: difficulty === "low" ? 1 : 0, medium: difficulty === "medium" ? 1 : 0, high: difficulty === "high" ? 1 : 0 },
			misconceptionThemes: [`common error with ${args.concepts[0]!.toLowerCase()}`],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
}

describe("adaptive builder routes", () => {
	afterEach(() => {
		resetDocumentRegistryState();
		resetTeacherFeedbackState();
		resetStudentPerformanceState();
		delete process.env.ENABLE_ADAPTIVE_BUILDER;
	});

	it("ingests student assessment events and uses the stored profile in build-test route output", async () => {
		process.env.ENABLE_ADAPTIVE_BUILDER = "true";

		const registered = registerDocuments([
			{ sourceFileName: "route-type-errors.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "route-mean-test.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "route-type-errors.pdf",
			concepts: ["Type I and Type II Errors"],
			problemText: "Explain a Type I error and a Type II error in the construction zone speeds test.",
			difficulty: "high",
		}));
		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "route-mean-test.pdf",
			concepts: ["one-sample mean test"],
			problemText: "A restaurant income study asks for the null hypothesis, alternative hypothesis, and decision at alpha = 0.05.",
			difficulty: "medium",
		}));

		const seedRes = createResponse();
		await buildIntentHandler({
			method: "POST",
			body: {
				sessionId: session.sessionId,
				documentIds: registered.map((document) => document.documentId),
				intentType: "build-test",
				options: { itemCount: 5, teacherId: "teacher-route", unitId: "unit-route", assessmentId: "route-seed" },
			},
		} as any, seedRes as any);

		expect(seedRes.statusCode).toBe(200);

		await updateAssessmentFingerprint({
			assessmentId: "route-seed",
			edits: {
				removeConceptIds: ["hypothesis-testing", "p-values-decision-rules", "simulation-based-inference"],
				itemCountOverrides: {
					"type-i-and-type-ii-errors": 3,
					"one-sample-mean-test": 3,
				},
				sectionOrder: ["type-i-and-type-ii-errors", "one-sample-mean-test"],
				now: "2026-03-29T00:00:00.000Z",
			},
		});

		const ingestRes = createResponse();
		await ingestAssessmentHandler({
			method: "POST",
			body: {
				studentId: "route-student",
				unitId: "unit-route",
				assessmentId: "student-work-1",
				items: [
					{ concept: "Type I and Type II Errors", correct: false, bloom: "analyze", mode: "explain", responseTimeSeconds: 61, confidence: 0.25, misconceptionKey: "common error with type i and type ii errors", incorrectResponse: "Mixed up false positives and false negatives" },
					{ concept: "Type I and Type II Errors", correct: false, bloom: "analyze", mode: "explain", responseTimeSeconds: 57, confidence: 0.3, misconceptionKey: "common error with type i and type ii errors", incorrectResponse: "Mixed up false positives and false negatives again" },
					{ concept: "one-sample mean test", correct: true, bloom: "apply", mode: "state", responseTimeSeconds: 24, confidence: 0.82 },
				],
			},
		} as any, ingestRes as any);

		expect(ingestRes.statusCode).toBe(200);
		expect(ingestRes.body.profile.totalEvents).toBe(3);

		const storedProfile = await getStudentPerformanceProfile("route-student", "unit-route");
		expect(storedProfile?.conceptMastery["type-i-and-type-ii-errors"]).toBeLessThan(storedProfile?.conceptMastery["one-sample-mean-test"] ?? 1);

		const buildRes = createResponse();
		await buildIntentHandler({
			method: "POST",
			body: {
				sessionId: session.sessionId,
				documentIds: registered.map((document) => document.documentId),
				intentType: "build-test",
				studentId: "route-student",
				enableAdaptiveConditioning: true,
				options: { itemCount: 5, teacherId: "teacher-route", unitId: "unit-route", assessmentId: "route-generated" },
			},
		} as any, buildRes as any);

		expect(buildRes.statusCode).toBe(200);
		expect(buildRes.body.payload.kind).toBe("test");
		const sections = buildRes.body.payload.sections as Array<{ concept: string; items: Array<{ difficulty: string }> }>;
		const typeErrorSection = sections.find((section) => section.concept === "type i and type ii errors");
		const meanSection = sections.find((section) => section.concept === "one-sample mean test");
		expect(typeErrorSection).toBeTruthy();
		expect(meanSection).toBeTruthy();
		expect((typeErrorSection?.items.length ?? 0)).toBeGreaterThanOrEqual(meanSection?.items.length ?? 0);
		expect(typeErrorSection?.items[0]?.difficulty).toBe("low");
	});
});