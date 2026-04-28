import { afterEach, describe, expect, it, vi } from "vitest";

import differentiatedBuildHandler from "../../api/v4/classes/[classId]/differentiated-build";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../prism-v4/documents/registry";
import type { AnalyzedDocument } from "../prism-v4/schema/semantic";
import { resetStudentPerformanceState, saveClassRoster, saveStudentPerformanceProfile } from "../prism-v4/studentPerformance";
import type { StudentPerformanceProfile } from "../prism-v4/studentPerformance";
import { resetTeacherFeedbackState } from "../prism-v4/teacherFeedback";

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
			{ id: `${args.documentId}-fragment-1`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }], isInstructional: true, instructionalRole: "objective", contentType: "heading", learningTarget: args.concepts.join(", "), prerequisiteConcepts: [...args.concepts], scaffoldLevel: "medium", misconceptionTriggers: [], confidence: 0.95, classifierVersion: "wave6-test", strategy: "rule-based" },
		],
		problems: [
			{ id: `${args.documentId}-problem-1`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }], text: args.problemText, extractionMode: "authored", concepts: [...args.concepts], representations: ["text"], difficulty, misconceptions: [`common error with ${args.concepts[0]!.toLowerCase()}`], cognitiveDemand: difficulty === "high" ? "analysis" : "conceptual" },
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

function buildStudentProfile(args: {
	studentId: string;
	overallMastery: number;
	conceptMastery: Record<string, number>;
}): StudentPerformanceProfile {
	return {
		studentId: args.studentId,
		lastUpdated: "2026-03-29T00:00:00.000Z",
		totalEvents: 3,
		totalAssessments: 1,
		assessmentIds: ["assessment-1"],
		overallMastery: args.overallMastery,
		overallConfidence: 0.5,
		averageResponseTimeSeconds: 30,
		conceptMastery: args.conceptMastery,
		conceptExposure: Object.fromEntries(Object.keys(args.conceptMastery).map((conceptId) => [conceptId, 1])),
		bloomMastery: {},
		modeMastery: {},
		scenarioMastery: {},
		conceptBloomMastery: {},
		conceptModeMastery: {},
		conceptScenarioMastery: {},
		conceptAverageResponseTimeSeconds: {},
		conceptConfidence: {},
		misconceptions: {},
	};
}

describe("class differentiated build routes", () => {
	afterEach(() => {
		resetDocumentRegistryState();
		resetStudentPerformanceState();
		resetTeacherFeedbackState();
		vi.restoreAllMocks();
	});

	it("returns differentiated versions with plan preview and explanation for each mastery band", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "fractions.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "ratios.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "fractions.pdf",
			concepts: ["fractions"],
			problemText: "Compare the fractions 2/3 and 3/4.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "ratios.pdf",
			concepts: ["ratios"],
			problemText: "Explain the ratio 3:5 using a diagram.",
			difficulty: "high",
		}));

		await saveClassRoster(session.sessionId, ["student-low", "student-mid", "student-high"]);
		await saveStudentPerformanceProfile(buildStudentProfile({ studentId: "student-low", overallMastery: 0.22, conceptMastery: { fractions: 0.2, ratios: 0.35 } }));
		await saveStudentPerformanceProfile(buildStudentProfile({ studentId: "student-mid", overallMastery: 0.58, conceptMastery: { fractions: 0.55, ratios: 0.62 } }));
		await saveStudentPerformanceProfile(buildStudentProfile({ studentId: "student-high", overallMastery: 0.87, conceptMastery: { fractions: 0.88, ratios: 0.9 } }));

		const res = createResponse();
		await differentiatedBuildHandler({ method: "GET", query: { classId: session.sessionId } } as any, res as any);

		expect(res.statusCode).toBe(200);
		expect(res.body.differentiatedBuild.versions).toHaveLength(3);
		expect(res.body.differentiatedBuild.versions).toMatchObject([
			{ masteryBand: "low", label: "Support Version", explanation: expect.any(String) },
			{ masteryBand: "mid", label: "Core Version", explanation: expect.any(String) },
			{ masteryBand: "high", label: "Extension Version", explanation: expect.any(String) },
		]);

		for (const version of res.body.differentiatedBuild.versions) {
			expect(version.builderPlan.sections.length).toBeGreaterThan(0);
			expect(version.assessmentPreview.items.length).toBeGreaterThan(0);
			expect(version.explanation).toContain(version.representativeStudentId);
		}
	});
});