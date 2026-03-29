import { afterEach, describe, expect, it } from "vitest";

import { buildIntentPayload } from "./buildIntentProduct";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../registry";
import { loadPrismSessionContext } from "../registryStore";
import {
	buildAssessmentFingerprint,
	buildInstructionalUnitOverrideId,
	classifyBloomLevel,
	classifyItemModes,
	classifyScenarioTypes,
	getAssessmentFingerprint,
	resetTeacherFeedbackState,
	saveAssessmentFingerprint,
	saveTeacherFeedback,
	updateAssessmentFingerprint,
} from "../../teacherFeedback";
import { resetStudentPerformanceState, saveStudentPerformanceProfile, type StudentPerformanceProfile } from "../../studentPerformance";
import type { AnalyzedDocument } from "../../schema/semantic";

function buildAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	concept: string;
	problemText: string;
	representation?: string;
	difficulty?: "low" | "medium" | "high";
}): AnalyzedDocument {
	const representation = args.representation ?? "text";
	const difficulty = args.difficulty ?? "low";

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
						nodeType: "heading",
						orderIndex: 0,
						text: `Learning target: Explain and apply ${args.concept}.`,
						normalizedText: `Learning target: Explain and apply ${args.concept}.`,
					},
					{
						id: `${args.documentId}-node-2`,
						documentId: args.documentId,
						surfaceId: `${args.documentId}-surface-1`,
					nodeType: "paragraph",
						orderIndex: 1,
					text: args.problemText,
					normalizedText: args.problemText,
				},
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{
				id: `${args.documentId}-fragment-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }],
				isInstructional: true,
				instructionalRole: "objective",
				contentType: "heading",
				learningTarget: `Explain and apply ${args.concept}`,
				prerequisiteConcepts: [args.concept],
				scaffoldLevel: "medium",
				misconceptionTriggers: [`common misconception with ${args.concept}`],
				confidence: 0.97,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
			{
				id: `${args.documentId}-fragment-2`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }],
				isInstructional: true,
				instructionalRole: "example",
				contentType: "question",
				learningTarget: `Explain and apply ${args.concept}`,
				prerequisiteConcepts: [args.concept],
				scaffoldLevel: difficulty === "high" ? "low" : difficulty === "low" ? "high" : "medium",
				misconceptionTriggers: [`common misconception with ${args.concept}`],
				confidence: 0.95,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
		],
		problems: [
			{
				id: `${args.documentId}-problem-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }],
				text: args.problemText,
				extractionMode: "authored",
				concepts: [args.concept],
				representations: [representation],
				difficulty,
				misconceptions: [],
				cognitiveDemand: difficulty === "high" ? "analysis" : "procedural",
			},
		],
		insights: {
			concepts: [args.concept],
			conceptFrequencies: { [args.concept]: 1 },
			representations: [representation],
			difficultyDistribution: {
				low: difficulty === "low" ? 1 : 0,
				medium: difficulty === "medium" ? 1 : 0,
				high: difficulty === "high" ? 1 : 0,
			},
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
}

function buildUnitOnlyAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	concept: string;
	description: string;
}): AnalyzedDocument {
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
					nodeType: "heading",
					orderIndex: 0,
					text: `Learning target: Explain and apply ${args.concept}.`,
					normalizedText: `Learning target: Explain and apply ${args.concept}.`,
				},
				{
					id: `${args.documentId}-node-2`,
					documentId: args.documentId,
					surfaceId: `${args.documentId}-surface-1`,
					nodeType: "paragraph",
					orderIndex: 1,
					text: args.description,
					normalizedText: args.description,
				},
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{
				id: `${args.documentId}-fragment-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }],
				isInstructional: true,
				instructionalRole: "objective",
				contentType: "heading",
				learningTarget: `Explain and apply ${args.concept}`,
				prerequisiteConcepts: [args.concept],
				scaffoldLevel: "medium",
				misconceptionTriggers: [`common misconception with ${args.concept}`],
				confidence: 0.97,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
			{
				id: `${args.documentId}-fragment-2`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }],
				isInstructional: true,
				instructionalRole: "explanation",
				contentType: "text",
				learningTarget: `Explain and apply ${args.concept}`,
				prerequisiteConcepts: [args.concept],
				scaffoldLevel: "medium",
				misconceptionTriggers: [`common misconception with ${args.concept}`],
				confidence: 0.93,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
		],
		problems: [],
		insights: {
			concepts: [args.concept],
			conceptFrequencies: { [args.concept]: 1 },
			representations: ["text"],
			difficultyDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [`common misconception with ${args.concept}`],
			instructionalDensity: 1,
			problemCount: 0,
			exampleCount: 0,
			explanationCount: 1,
		},
		updatedAt: new Date().toISOString(),
	};
}

function buildQuestionUnitWithMismatchedProblem(args: {
	documentId: string;
	sourceFileName: string;
	concept: string;
	questionText: string;
	rawProblemText: string;
}): AnalyzedDocument {
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
					nodeType: "heading",
					orderIndex: 0,
					text: `Learning target: Explain and apply ${args.concept}.`,
					normalizedText: `Learning target: Explain and apply ${args.concept}.`,
				},
				{
					id: `${args.documentId}-node-2`,
					documentId: args.documentId,
					surfaceId: `${args.documentId}-surface-1`,
					nodeType: "paragraph",
					orderIndex: 1,
					text: args.questionText,
					normalizedText: args.questionText,
				},
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{
				id: `${args.documentId}-fragment-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }],
				isInstructional: true,
				instructionalRole: "objective",
				contentType: "heading",
				learningTarget: `Explain and apply ${args.concept}`,
				prerequisiteConcepts: [args.concept],
				scaffoldLevel: "medium",
				misconceptionTriggers: [`common misconception with ${args.concept}`],
				confidence: 0.97,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
			{
				id: `${args.documentId}-fragment-2`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }],
				isInstructional: true,
				instructionalRole: "problem-stem",
				contentType: "question",
				learningTarget: `Explain and apply ${args.concept}`,
				prerequisiteConcepts: [args.concept],
				scaffoldLevel: "medium",
				misconceptionTriggers: [`common misconception with ${args.concept}`],
				confidence: 0.94,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
		],
		problems: [
			{
				id: `${args.documentId}-problem-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }],
				text: args.rawProblemText,
				extractionMode: "authored",
				concepts: [args.concept],
				representations: ["text"],
				difficulty: "high",
				misconceptions: [],
				cognitiveDemand: "analysis",
			},
		],
		insights: {
			concepts: [args.concept],
			conceptFrequencies: { [args.concept]: 1 },
			representations: ["text"],
			difficultyDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [`common misconception with ${args.concept}`],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
}

function buildSparseAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	concept: string;
	minimalText?: string;
}): AnalyzedDocument {
	const minimalText = args.minimalText ?? `${args.concept} matters in this lesson. ${args.concept} matters in this lesson.`;

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
					nodeType: "heading",
					orderIndex: 0,
					text: `Learning target: Explain ${args.concept}.`,
					normalizedText: `Learning target: Explain ${args.concept}.`,
				},
				{
					id: `${args.documentId}-node-2`,
					documentId: args.documentId,
					surfaceId: `${args.documentId}-surface-1`,
					nodeType: "paragraph",
					orderIndex: 1,
					text: minimalText,
					normalizedText: minimalText,
				},
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{
				id: `${args.documentId}-fragment-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }],
				isInstructional: true,
				instructionalRole: "objective",
				contentType: "heading",
				learningTarget: `Explain ${args.concept}`,
				prerequisiteConcepts: [args.concept],
				scaffoldLevel: "medium",
				misconceptionTriggers: [`a common error with ${args.concept}`],
				confidence: 0.88,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
		],
		problems: [],
		insights: {
			concepts: [args.concept],
			conceptFrequencies: { [args.concept]: 1 },
			representations: ["text"],
			difficultyDistribution: { low: 1, medium: 0, high: 0 },
			misconceptionThemes: [`a common error with ${args.concept}`],
			instructionalDensity: 0.15,
			problemCount: 0,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
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
				{
					id: `${args.documentId}-node-1`,
					documentId: args.documentId,
					surfaceId: `${args.documentId}-surface-1`,
					nodeType: "heading",
					orderIndex: 0,
					text: `Learning target: Explain ${args.concepts.join(" and ")}.`,
					normalizedText: `Learning target: Explain ${args.concepts.join(" and ")}.`,
				},
				{
					id: `${args.documentId}-node-2`,
					documentId: args.documentId,
					surfaceId: `${args.documentId}-surface-1`,
					nodeType: "paragraph",
					orderIndex: 1,
					text: args.problemText,
					normalizedText: args.problemText,
				},
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{
				id: `${args.documentId}-fragment-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }],
				isInstructional: true,
				instructionalRole: "objective",
				contentType: "heading",
				learningTarget: `Explain ${args.concepts.join(" and ")}`,
				prerequisiteConcepts: [...args.concepts],
				scaffoldLevel: "medium",
				misconceptionTriggers: [],
				confidence: 0.95,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
			{
				id: `${args.documentId}-fragment-2`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }],
				isInstructional: true,
				instructionalRole: "problem-stem",
				contentType: "question",
				learningTarget: `Explain ${args.concepts.join(" and ")}`,
				prerequisiteConcepts: [...args.concepts],
				scaffoldLevel: "medium",
				misconceptionTriggers: [],
				confidence: 0.95,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
		],
		problems: [
			{
				id: `${args.documentId}-problem-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }],
				text: args.problemText,
				extractionMode: "authored",
				concepts: [...args.concepts],
				representations: ["text"],
				difficulty,
				misconceptions: [],
				cognitiveDemand: difficulty === "high" ? "analysis" : "conceptual",
			},
		],
		insights: {
			concepts: [...args.concepts],
			conceptFrequencies: Object.fromEntries(args.concepts.map((concept) => [concept, 1])),
			representations: ["text"],
			difficultyDistribution: { low: difficulty === "low" ? 1 : 0, medium: difficulty === "medium" ? 1 : 0, high: difficulty === "high" ? 1 : 0 },
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: 1,
			exampleCount: 0,
			explanationCount: 0,
		},
		updatedAt: new Date().toISOString(),
	};
}

function buildScaffoldRichAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	concepts: [string, string];
}): AnalyzedDocument {
	const [conceptA, conceptB] = args.concepts;

	return {
		document: {
			id: args.documentId,
			sourceFileName: args.sourceFileName,
			sourceMimeType: "application/pdf",
			surfaces: [{ id: `${args.documentId}-surface-1`, surfaceType: "page", index: 0, label: "Page 1" }],
			nodes: [
				{ id: `${args.documentId}-node-1`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "heading", orderIndex: 0, text: `Learning target: Explain ${conceptA}.`, normalizedText: `Learning target: Explain ${conceptA}.` },
				{ id: `${args.documentId}-node-2`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "paragraph", orderIndex: 1, text: `${conceptA} can be shown with a visual model.`, normalizedText: `${conceptA} can be shown with a visual model.` },
				{ id: `${args.documentId}-node-3`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "heading", orderIndex: 2, text: `Learning target: Explain ${conceptB}.`, normalizedText: `Learning target: Explain ${conceptB}.` },
				{ id: `${args.documentId}-node-4`, documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeType: "paragraph", orderIndex: 3, text: `${conceptB} requires careful comparison work.`, normalizedText: `${conceptB} requires careful comparison work.` },
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{ id: `${args.documentId}-fragment-1`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }], isInstructional: true, instructionalRole: "objective", contentType: "heading", learningTarget: `Explain ${conceptA}`, prerequisiteConcepts: [conceptA], scaffoldLevel: "medium", misconceptionTriggers: [`common error with ${conceptA}`], confidence: 0.9, classifierVersion: "wave5-test", strategy: "rule-based" },
			{ id: `${args.documentId}-fragment-2`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }], isInstructional: true, instructionalRole: "example", contentType: "text", learningTarget: `Explain ${conceptA}`, prerequisiteConcepts: [conceptA], scaffoldLevel: "medium", misconceptionTriggers: [`common error with ${conceptA}`], confidence: 0.9, classifierVersion: "wave5-test", strategy: "rule-based" },
			{ id: `${args.documentId}-fragment-3`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-3` }], isInstructional: true, instructionalRole: "objective", contentType: "heading", learningTarget: `Explain ${conceptB}`, prerequisiteConcepts: [conceptB], scaffoldLevel: "medium", misconceptionTriggers: [`common error with ${conceptB}`], confidence: 0.9, classifierVersion: "wave5-test", strategy: "rule-based" },
			{ id: `${args.documentId}-fragment-4`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-4` }], isInstructional: true, instructionalRole: "explanation", contentType: "text", learningTarget: `Explain ${conceptB}`, prerequisiteConcepts: [conceptB], scaffoldLevel: "medium", misconceptionTriggers: [`common error with ${conceptB}`], confidence: 0.9, classifierVersion: "wave5-test", strategy: "rule-based" },
		],
		problems: [
			{ id: `${args.documentId}-problem-1`, documentId: args.documentId, anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-2` }], text: `Explain ${conceptA} with a diagram.`, extractionMode: "authored", concepts: [conceptA], representations: ["visual"], difficulty: "medium", misconceptions: [`common error with ${conceptA}`], cognitiveDemand: "conceptual" },
		],
		insights: {
			concepts: [conceptA, conceptB],
			conceptFrequencies: { [conceptA]: 1, [conceptB]: 1 },
			representations: ["visual", "text"],
			difficultyDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [`common error with ${conceptA}`, `common error with ${conceptB}`],
			instructionalDensity: 0.8,
			problemCount: 1,
			exampleCount: 1,
			explanationCount: 1,
		},
		updatedAt: new Date().toISOString(),
	};
}

function buildConceptOnlyAnalyzedDocument(args: {
	documentId: string;
	sourceFileName: string;
	concepts: string[];
	description: string;
}): AnalyzedDocument {
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
					text: args.description,
					normalizedText: args.description,
				},
			],
			createdAt: new Date().toISOString(),
		},
		fragments: [
			{
				id: `${args.documentId}-fragment-1`,
				documentId: args.documentId,
				anchors: [{ documentId: args.documentId, surfaceId: `${args.documentId}-surface-1`, nodeId: `${args.documentId}-node-1` }],
				isInstructional: true,
				instructionalRole: "explanation",
				contentType: "text",
				learningTarget: "Explain the science process.",
				prerequisiteConcepts: [],
				scaffoldLevel: "medium",
				misconceptionTriggers: [],
				confidence: 0.9,
				classifierVersion: "wave5-test",
				strategy: "rule-based",
			},
		],
		problems: [],
		insights: {
			concepts: args.concepts,
			conceptFrequencies: Object.fromEntries(args.concepts.map((concept) => [concept, 1])),
			representations: ["text"],
			difficultyDistribution: { low: 0, medium: 1, high: 0 },
			misconceptionThemes: [],
			instructionalDensity: 1,
			problemCount: 0,
			exampleCount: 0,
			explanationCount: 1,
		},
		updatedAt: new Date().toISOString(),
	};
}

describe("buildIntentPayload", () => {
	afterEach(() => {
		resetDocumentRegistryState();
		resetTeacherFeedbackState();
		resetStudentPerformanceState();
	});

	it("builds the Wave 3, Wave 4, and Wave 5 intent payloads from analyzed documents", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "quiz.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "slides.pdf", sourceMimeType: "application/pdf" },
		]);
		const documentIds = registered.map((document) => document.documentId);
		const session = createDocumentSession(documentIds);

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: documentIds[0]!,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Solve 1/2 + 1/4.",
			representation: "text",
			difficulty: "low",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: documentIds[1]!,
			sourceFileName: "quiz.pdf",
			concept: "fractions",
			problemText: "Explain why 3/4 is greater than 2/3.",
			representation: "diagram",
			difficulty: "high",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: documentIds[2]!,
			sourceFileName: "slides.pdf",
			concept: "equivalent fractions",
			problemText: "Use a number line to compare 2/4 and 1/2.",
			representation: "number-line",
			difficulty: "medium",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		expect(context).not.toBeNull();
		if (!context) {
			throw new Error("Expected Prism session context");
		}
		expect(context.groupedUnits.length).toBeGreaterThan(0);
		expect(context.groupedUnits.some((unit) => unit.fragments.length > 1)).toBe(true);

		const extractProblems = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "extract-problems",
		}, context);
		expect(extractProblems.kind).toBe("problem-extraction");
		expect(extractProblems.domain).toBe("Mathematics");
		expect(extractProblems.totalProblemCount).toBe(2);

		const extractConcepts = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "extract-concepts",
		}, context);
		expect(extractConcepts.kind).toBe("concept-extraction");
		expect(extractConcepts.domain).toBe("Mathematics");
		expect(extractConcepts.concepts[0].concept).toBe("fractions");
		expect(extractConcepts.concepts[0]?.sampleProblemTexts.length).toBeGreaterThan(0);

		const summary = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "summarize",
		}, context);
		expect(summary.kind).toBe("summary");
		expect(summary.domain).toBe("Mathematics");
		expect(summary.documents).toHaveLength(2);
		expect(summary.overallSummary.toLowerCase()).toContain("fractions");
		expect(summary.documents[0]?.keyConcepts).toContain("fractions");

		const review = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "build-review",
		}, context);
		expect(review.kind).toBe("review");
		expect(review.domain).toBe("Mathematics");
		expect(review.sections.length).toBeGreaterThan(0);
		expect(review.sections[0]?.concept).toBe("fractions");

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "build-test",
			options: { itemCount: 2 },
		}, context);
		expect(test.kind).toBe("test");
		expect(test.domain).toBe("Mathematics");
		expect(test.totalItemCount).toBe(2);

		const compare = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "compare-documents",
		}, context);
		expect(compare.kind).toBe("compare-documents");
		expect(compare.domain).toBe("Mathematics");
		expect(compare.documents).toHaveLength(2);
		expect(compare.documentSimilarity.length).toBeGreaterThan(0);
		expect(compare.sharedConcepts).toContain("fractions");

		const merge = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "merge-documents",
		}, context);
		expect(merge.kind).toBe("merge-documents");
		expect(merge.domain).toBe("Mathematics");
		expect(merge.mergedInsights.totalDocuments).toBe(3);
		expect(merge.mergedProblems.length).toBeGreaterThan(0);

		const sequence = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "build-sequence",
		}, context);
		expect(sequence.kind).toBe("sequence");
		expect(sequence.domain).toBe("Mathematics");
		expect(sequence.recommendedOrder).toHaveLength(3);

		const lesson = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [documentIds[0]!],
			intentType: "build-lesson",
		}, context);
		expect(lesson.kind).toBe("lesson");
		expect(lesson.domain).toBe("Mathematics");
		expect(lesson.learningObjectives.some((objective) => objective.toLowerCase().includes("fractions"))).toBe(true);
		expect(lesson.conceptIntroduction.length).toBeGreaterThan(0);
		expect(lesson.sourceAnchors).toHaveLength(1);

		const unit = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "build-unit",
		}, context);
		expect(unit.kind).toBe("unit");
		expect(unit.domain).toBe("Mathematics");
		expect(unit.lessonSequence).toHaveLength(3);
		expect(unit.conceptMap.length).toBeGreaterThan(0);
		expect(unit.misconceptionMap.length).toBeGreaterThan(0);
		expect(unit.conceptMap.some((entry) => entry.concept === "fractions")).toBe(true);

		const instructionalMap = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "build-instructional-map",
		}, context);
		expect(instructionalMap.kind).toBe("instructional-map");
		expect(instructionalMap.domain).toBe("Mathematics");
		expect(instructionalMap.documentConceptAlignment).toHaveLength(3);
		expect(instructionalMap.problemConceptAlignment.length).toBeGreaterThan(0);

		const alignment = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "curriculum-alignment",
		}, context);
		expect(alignment.kind).toBe("curriculum-alignment");
		expect(alignment.domain).toBe("Mathematics");
		expect(alignment.standardsCoverage.length).toBeGreaterThan(0);
		expect(alignment.standardsCoverage.some((entry) => entry.concept === "fractions")).toBe(true);
	});

	it("build-test drafts items from grouped units even when no extracted problems exist", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildUnitOnlyAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			description: "Use visual reasoning to explain why one half and two fourths are equivalent.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 1 },
		}, context);

		expect(test.kind).toBe("test");
		expect(test.domain).toBe("Mathematics");
		expect(test.totalItemCount).toBe(1);
		expect(test.sections[0]?.items[0]?.prompt).toContain("equivalent");
		expect(test.sections[0]?.items[0]?.answerGuidance.toLowerCase()).toContain("explain and apply fractions");
	});

	it("build-test selects prompts from grouped units instead of raw extracted problems", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildQuestionUnitWithMismatchedProblem({
			documentId: registered!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			questionText: "Use the area model to justify why three sixths equals one half.",
			rawProblemText: "RAW PROBLEM TEXT SHOULD NOT BE USED",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 1 },
		}, context);

		expect(test.kind).toBe("test");
		expect(test.domain).toBe("Mathematics");
		expect(test.totalItemCount).toBe(1);
		expect(test.sections[0]?.items[0]?.prompt).toContain("area model");
		expect(test.sections[0]?.items[0]?.prompt).not.toContain("RAW PROBLEM TEXT SHOULD NOT BE USED");
	});

	it("build-test caps requested itemCount at the number of available items", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "single-problem.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "single-problem.pdf",
			concept: "fractions",
			problemText: "Explain why 2/4 is equivalent to 1/2.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 10 },
		}, context);

		expect(test.kind).toBe("test");
		expect(test.domain).toBe("Mathematics");
		expect(test.totalItemCount).toBe(1);
		expect(test.totalItemCount).toBeLessThanOrEqual(10);
	});

	it("build-test returns only non-empty concept sections in deterministic order", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "fractions.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "slope.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "fractions.pdf",
			concept: "fractions",
			problemText: "Use a model to explain equivalent fractions.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "slope.pdf",
			concept: "slope",
			problemText: "Explain how slope changes on a graph.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: { itemCount: 5 },
		}, context);

		const concepts = test.sections.map((section) => section.concept);
		expect(test.kind).toBe("test");
		expect(concepts).toEqual(["fractions", "slope"]);
		expect(test.sections.every((section) => section.items.length > 0)).toBe(true);
	});

	it("build-test dedupes duplicate prompts across multi-document sessions when falling back to raw problems", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "notes-a.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "notes-b.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "notes-a.pdf",
			concept: "fractions",
			problemText: "Use a number line to explain 2/4 and 1/2.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "notes-b.pdf",
			concept: "fractions",
			problemText: "Use a number line to explain 2/4 and 1/2.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const duplicateContext = {
			...context,
			groupedUnits: [],
		};

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: { itemCount: 5 },
		}, duplicateContext);

		expect(test.kind).toBe("test");
		expect(test.totalItemCount).toBe(1);
		expect(test.sections).toHaveLength(1);
		expect(test.sections[0]?.items).toHaveLength(1);
		expect(test.sections[0]?.items[0]?.prompt).toContain("number line");
	});

	it("build-test generates fallback items when the requested focus is missing", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "notes.pdf",
			concept: "fractions",
			problemText: "Explain equivalent fractions with a visual model.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const fallbackContext = {
			...context,
			groupedUnits: [],
		};

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 2, focus: "decimal operations" },
		}, fallbackContext);

		expect(test.kind).toBe("test");
		expect(test.domain).toBe("Mathematics");
		expect(test.totalItemCount).toBe(2);
		expect(test.sections).toHaveLength(1);
		expect(test.sections[0]?.concept).toBe("decimal operations");
		expect(test.sections[0]?.items.every((item) => item.prompt.toLowerCase().includes("decimal operations"))).toBe(true);
	});

	it("build-test generates fallback items when no extracted problems remain", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "sparse-notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildSparseAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "sparse-notes.pdf",
			concept: "fractions",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const fallbackContext = {
			...context,
			groupedUnits: [],
		};

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 2 },
		}, fallbackContext);

		expect(test.kind).toBe("test");
		expect(test.domain).toBe("Mathematics");
		expect(test.totalItemCount).toBe(2);
		expect(test.sections).toHaveLength(1);
		expect(test.sections[0]?.concept).toBe("fractions");
		expect(new Set(test.sections[0]?.items.map((item) => item.prompt)).size).toBe(2);
	});

	it("build-test generates general fallback items for ambiguous-domain sessions", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "directions.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildSparseAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "directions.pdf",
			concept: "warm-up",
			minimalText: "Read the directions carefully before starting the task.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const fallbackContext = {
			...context,
			groupedUnits: [],
		};

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 2 },
		}, fallbackContext);

		expect(test.kind).toBe("test");
		expect(test.domain).toBe("General Instruction");
		expect(test.totalItemCount).toBe(2);
		expect(test.sections).toHaveLength(1);
		expect(test.sections[0]?.concept).toBe("warm-up");
		expect(test.sections[0]?.items.every((item) => item.prompt.toLowerCase().includes("warm-up"))).toBe(true);
	});

	it("build-test slices deterministically across concepts when itemCount is smaller than total coverage", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "fractions.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "decimals.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "slope.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "fractions.pdf",
			concept: "fractions",
			problemText: "Explain equivalent fractions with an area model.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "decimals.pdf",
			concept: "decimal operations",
			problemText: "Compare decimal operations in a shopping example.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[2]!.documentId,
			sourceFileName: "slope.pdf",
			concept: "slope",
			problemText: "Describe the slope of a line on a graph.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: { itemCount: 2 },
		}, {
			...context,
			groupedUnits: [],
		});

		expect(test.kind).toBe("test");
		expect(test.totalItemCount).toBe(2);
		expect(test.sections.map((section) => section.concept)).toEqual(["decimal operations", "fractions"]);
		expect(test.sections.flatMap((section) => section.items).length).toBe(2);
	});

	it("cleans duplicate test prompts before returning the built payload", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "notes-a.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "notes-b.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "notes-a.pdf",
			concept: "fractions",
			problemText: "Use the number line to explain why 2/4 equals 1/2.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "notes-b.pdf",
			concept: "fractions",
			problemText: "Use the number line to explain why 2/4 equals 1/2.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: { itemCount: 2 },
		}, context);

		expect(test.kind).toBe("test");
		expect(test.domain).toBe("Mathematics");
		expect(test.totalItemCount).toBe(1);
		expect(test.sections).toHaveLength(1);
		expect(test.sections[0]?.items).toHaveLength(1);
		expect(new Set(test.sections.flatMap((section) => section.items.map((item) => item.prompt))).size).toBe(test.totalItemCount);
	});

	it("build-test clusters statistics scenarios into teacher-facing sections and suppresses noisy labels", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "stats-1.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "stats-2.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "stats-3.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "stats-1.pdf",
			concepts: ["kissing couples", "decimal operations", "inference"],
			problemText: "A kissing couples simulation uses a sample proportion and a dotplot to interpret the p-value.",
		}));
		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "stats-2.pdf",
			concepts: ["restaurant income", "rights and responsibilities"],
			problemText: "A restaurant income study asks for the null hypothesis, alternative hypothesis, and decision at alpha = 0.05.",
		}));
		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[2]!.documentId,
			sourceFileName: "stats-3.pdf",
			concepts: ["Type I and Type II Errors"],
			problemText: "Explain a Type I error and a Type II error in the construction zone speeds test.",
			difficulty: "high",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: { itemCount: 5 },
		}, {
			...context,
			groupedUnits: [],
		});

		expect(test.kind).toBe("test");
		expect(test.domain).toBe("Mathematics");
		expect(test.sections.map((section) => section.concept)).toEqual([
			"hypothesis testing",
			"one-sample proportion test",
			"one-sample mean test",
			"simulation-based inference",
			"type i and type ii errors",
		]);
		expect(test.sections.map((section) => section.concept)).not.toContain("decimal operations");
		expect(test.sections.map((section) => section.concept)).not.toContain("rights and responsibilities");
		expect(test.sections.flatMap((section) => section.items).every((item) => item.prompt.length > 20)).toBe(true);
	});

	it("build-test keeps hypothesis-testing prompts in teacher cognitive order without semantic duplicates", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "stats-sequence.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "stats-sequence.pdf",
			concepts: ["hypothesis testing", "p-values & decision rules", "parameters & statistics", "Type I and Type II Errors"],
			problemText: "Identify the parameter and statistic, state the null and alternative hypotheses, interpret the p-value, make the decision at alpha = 0.05, and explain a Type I error consequence.",
			difficulty: "high",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 5 },
		}, {
			...context,
			groupedUnits: [],
		});

		expect(test.kind).toBe("test");
		expect(test.sections[0]?.concept).toBe("hypothesis testing");
		const hypothesisItems = test.sections[0]?.items ?? [];
		expect(hypothesisItems.length).toBeGreaterThan(0);
		expect(hypothesisItems[0]?.prompt.toLowerCase()).toContain("parameter");
		expect(hypothesisItems[1]?.prompt.toLowerCase()).toMatch(/null hypothesis|alternative hypothesis/);
		expect(hypothesisItems.some((item) => item.prompt.toLowerCase().includes("p-value"))).toBe(true);
		expect(new Set(hypothesisItems.map((item) => item.prompt)).size).toBe(hypothesisItems.length);
	});

	it("build-test applies persisted teacher fingerprint edits for order, counts, bloom ceilings, and scenarios", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "stats-1.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "stats-2.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "stats-3.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "stats-1.pdf",
			concepts: ["kissing couples", "decimal operations", "inference"],
			problemText: "A kissing couples simulation uses a sample proportion and a dotplot to interpret the p-value.",
		}));
		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "stats-2.pdf",
			concepts: ["restaurant income", "hypothesis testing", "p-values & decision rules"],
			problemText: "A restaurant income study asks for the null hypothesis, alternative hypothesis, and decision at alpha = 0.05.",
			difficulty: "high",
		}));
		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[2]!.documentId,
			sourceFileName: "stats-3.pdf",
			concepts: ["Type I and Type II Errors"],
			problemText: "Explain a Type I error and a Type II error in the construction zone speeds test.",
			difficulty: "high",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const builderContext = {
			...context,
			groupedUnits: [],
		};

		const seeded = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: { itemCount: 5, teacherId: "teacher-1", unitId: "stats-unit-1", assessmentId: "seed-assessment" },
		}, builderContext);

		expect(seeded.kind).toBe("test");
		expect(await getAssessmentFingerprint("seed-assessment")).not.toBeNull();

		await updateAssessmentFingerprint({
			assessmentId: "seed-assessment",
			edits: {
				removeConceptIds: [
					"hypothesis-testing",
					"p-values-decision-rules",
					"one-sample-proportion-test",
					"simulation-based-inference",
				],
				itemCountOverrides: {
					"type-i-and-type-ii-errors": 1,
					"one-sample-mean-test": 1,
				},
				bloomCeilings: {
					"type-i-and-type-ii-errors": "analyze",
				},
				scenarioOverrides: {
					"one-sample-mean-test": ["real-world"],
				},
				sectionOrder: ["type-i-and-type-ii-errors", "one-sample-mean-test"],
				now: "2026-03-29T00:00:00.000Z",
			},
		});

		const fingerprintDriven = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: { itemCount: 2, teacherId: "teacher-1", unitId: "stats-unit-1", assessmentId: "fingerprint-driven-assessment" },
		}, builderContext);

		expect(fingerprintDriven.kind).toBe("test");
		expect(fingerprintDriven.sections.map((section) => section.concept)).toEqual(["type i and type ii errors", "one-sample mean test"]);
		expect(fingerprintDriven.totalItemCount).toBe(2);
		expect(fingerprintDriven.sections[0]?.items).toHaveLength(1);
		expect(fingerprintDriven.sections[1]?.items).toHaveLength(1);
		expect(fingerprintDriven.sections[0]?.items.some((item) => item.prompt.toLowerCase().includes("more serious"))).toBe(false);
		expect(fingerprintDriven.sections[1]?.items.every((item) => classifyScenarioTypes(item.prompt).includes("real-world"))).toBe(true);
	});

	it("build-test approximates stored bloom distributions within tolerance when fingerprint counts are active", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "stats-bloom.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "stats-bloom.pdf",
			concepts: ["hypothesis testing", "p-values & decision rules", "parameters & statistics"],
			problemText: "Identify the parameter and statistic, state the null and alternative hypotheses, interpret the p-value, and make the decision at alpha = 0.05.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 4, teacherId: "teacher-bloom", unitId: "unit-bloom", assessmentId: "seed-bloom" },
		}, {
			...context,
			groupedUnits: [],
		});

		const fingerprintDriven = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 4, teacherId: "teacher-bloom", unitId: "unit-bloom", assessmentId: "generated-bloom" },
		}, {
			...context,
			groupedUnits: [],
		});

		const fingerprint = await getAssessmentFingerprint("seed-bloom");
		const expectedDistribution = Object.entries((fingerprint?.conceptProfiles ?? []).reduce<Record<string, number>>((counts, profile) => {
			for (const [level, weight] of Object.entries(profile.bloomDistribution)) {
				counts[level] = (counts[level] ?? 0) + weight * (profile.absoluteItemHint ?? 0);
			}
			return counts;
		}, {})).reduce<Record<string, number>>((distribution, [level, weightedCount], _, entries) => {
			const total = entries.reduce((sum, [, value]) => sum + value, 0);
			distribution[level] = total > 0 ? weightedCount / total : 0;
			return distribution;
		}, {});
		const generatedItems = fingerprintDriven.sections.flatMap((section) => section.items);
		const demandToBloom = (value: (typeof generatedItems)[number]["cognitiveDemand"]) => {
			if (value === "recall") {
				return "remember";
			}
			if (value === "conceptual") {
				return "understand";
			}
			if (value === "procedural") {
				return "apply";
			}
			return "analyze";
		};
		const generatedCounts = generatedItems.reduce<Record<string, number>>((counts, item) => {
			const promptLevel = classifyBloomLevel(item.prompt);
			const demandLevel = demandToBloom(item.cognitiveDemand);
			const level = ["remember", "understand", "apply", "analyze", "evaluate", "create"].indexOf(promptLevel)
				>= ["remember", "understand", "apply", "analyze", "evaluate", "create"].indexOf(demandLevel)
				? promptLevel
				: demandLevel;
			counts[level] = (counts[level] ?? 0) + 1;
			return counts;
		}, {});

		for (const [level, expectedWeight] of Object.entries(expectedDistribution)) {
			const actualWeight = generatedItems.length > 0 ? (generatedCounts[level] ?? 0) / generatedItems.length : 0;
			expect(Math.abs(actualWeight - expectedWeight)).toBeLessThanOrEqual(0.1);
		}
	});

	it("build-test can keep scenario context while changing numeric literals from stored teacher edits", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "stats-context.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "stats-context.pdf",
			concepts: ["restaurant income", "one-sample mean test"],
			problemText: "A restaurant income study uses alpha = 0.05 to test whether the mean income is 52 dollars.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 4, teacherId: "teacher-context", unitId: "unit-context", assessmentId: "seed-context" },
		}, {
			...context,
			groupedUnits: [],
		});

		await updateAssessmentFingerprint({
			assessmentId: "seed-context",
			edits: {
				removeConceptIds: ["hypothesis-testing", "p-values-decision-rules", "simulation-based-inference", "type-i-and-type-ii-errors"],
				itemCountOverrides: { "one-sample-mean-test": 4 },
				scenarioOverrides: { "one-sample-mean-test": ["real-world"] },
				scenarioDirectives: { "one-sample-mean-test": "keep-context-change-numbers" },
				sectionOrder: ["one-sample-mean-test"],
				now: "2026-03-29T00:00:00.000Z",
			},
		});

		const fingerprintDriven = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-test",
			options: { itemCount: 4, teacherId: "teacher-context", unitId: "unit-context", assessmentId: "generated-context" },
		}, {
			...context,
			groupedUnits: [],
		});

		const prompts = fingerprintDriven.sections.flatMap((section) => section.items.map((item) => item.prompt));
		expect(prompts.every((prompt) => prompt.includes("this one-sample mean study"))).toBe(true);
		expect(prompts.some((prompt) => prompt.includes("0.05"))).toBe(false);
		expect(prompts.some((prompt) => /0\s*\.\s*06|0\s*\.\s*07/.test(prompt))).toBe(true);
	});

	it("build-test applies one-shot conceptBlueprint overrides without requiring persisted fingerprint edits", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "stats-blueprint-1.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "stats-blueprint-2.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "stats-blueprint-3.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "stats-blueprint-1.pdf",
			concepts: ["kissing couples", "decimal operations", "inference"],
			problemText: "A kissing couples simulation uses a sample proportion and a dotplot to interpret the p-value.",
		}));
		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "stats-blueprint-2.pdf",
			concepts: ["restaurant income", "hypothesis testing", "p-values & decision rules"],
			problemText: "A restaurant income study asks for the null hypothesis, alternative hypothesis, and decision at alpha = 0.05.",
			difficulty: "high",
		}));
		saveAnalyzedDocument(buildStatsAnalyzedDocument({
			documentId: registered[2]!.documentId,
			sourceFileName: "stats-blueprint-3.pdf",
			concepts: ["Type I and Type II Errors"],
			problemText: "Explain a Type I error and a Type II error in the construction zone speeds test.",
			difficulty: "high",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const blueprintDriven = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: {
				itemCount: 2,
				conceptBlueprint: {
					edits: {
						removeConceptIds: [
							"hypothesis-testing",
							"p-values-decision-rules",
							"one-sample-proportion-test",
							"simulation-based-inference",
						],
						itemCountOverrides: {
							"type-i-and-type-ii-errors": 1,
							"one-sample-mean-test": 1,
						},
						bloomDistributions: {
							"type-i-and-type-ii-errors": {
								understand: 1,
							},
						},
						scenarioOverrides: {
							"one-sample-mean-test": ["real-world"],
						},
						sectionOrder: ["type-i-and-type-ii-errors", "one-sample-mean-test"],
					},
				},
			},
		}, {
			...context,
			groupedUnits: [],
		});

		expect(blueprintDriven.kind).toBe("test");
		expect(blueprintDriven.sections.map((section) => section.concept)).toEqual(["type i and type ii errors", "one-sample mean test"]);
		expect(blueprintDriven.totalItemCount).toBe(2);
		expect(blueprintDriven.sections[0]?.items).toHaveLength(1);
		expect(blueprintDriven.sections[1]?.items).toHaveLength(1);
		expect(blueprintDriven.sections[0]?.items.every((item) => classifyBloomLevel(item.prompt) === "understand")).toBe(true);
		expect(blueprintDriven.sections[1]?.items.every((item) => classifyScenarioTypes(item.prompt).includes("real-world"))).toBe(true);
	});

	it("build-test adapts the difficulty floor from persisted fingerprints", async () => {
		const previousFlag = process.env.ENABLE_ADAPTIVE_BUILDER;
		process.env.ENABLE_ADAPTIVE_BUILDER = "true";

		try {
			const registered = registerDocuments([
				{ sourceFileName: "adaptive-type-errors.pdf", sourceMimeType: "application/pdf" },
				{ sourceFileName: "adaptive-mean-test.pdf", sourceMimeType: "application/pdf" },
			]);
			const session = createDocumentSession(registered.map((document) => document.documentId));

			saveAnalyzedDocument(buildStatsAnalyzedDocument({
				documentId: registered[0]!.documentId,
				sourceFileName: "adaptive-type-errors.pdf",
				concepts: ["Type I and Type II Errors"],
				problemText: "Explain a Type I error and a Type II error in the construction zone speeds test.",
				difficulty: "high",
			}));
			saveAnalyzedDocument(buildStatsAnalyzedDocument({
				documentId: registered[1]!.documentId,
				sourceFileName: "adaptive-mean-test.pdf",
				concepts: ["one-sample mean test"],
				problemText: "A restaurant income study asks for the null hypothesis, alternative hypothesis, and decision at alpha = 0.05.",
				difficulty: "medium",
			}));

			const context = await loadPrismSessionContext(session.sessionId);
			if (!context) {
				throw new Error("Expected Prism session context");
			}

			await buildIntentPayload({
				sessionId: session.sessionId,
				documentIds: registered.map((document) => document.documentId),
				intentType: "build-test",
				options: { itemCount: 5, teacherId: "teacher-adaptive", unitId: "unit-adaptive", assessmentId: "adaptive-seed" },
			}, {
				...context,
				groupedUnits: [],
			});

			await updateAssessmentFingerprint({
				assessmentId: "adaptive-seed",
				edits: {
					removeConceptIds: [
						"hypothesis-testing",
						"p-values-decision-rules",
						"simulation-based-inference",
					],
					itemCountOverrides: {
						"type-i-and-type-ii-errors": 3,
						"one-sample-mean-test": 3,
					},
					bloomCeilings: {
						"type-i-and-type-ii-errors": "analyze",
						"one-sample-mean-test": "apply",
					},
					sectionOrder: ["type-i-and-type-ii-errors", "one-sample-mean-test"],
					now: "2026-03-29T00:00:00.000Z",
				},
			});

			const studentProfile: StudentPerformanceProfile = {
				studentId: "student-adaptive",
				unitId: "unit-adaptive",
				lastUpdated: "2026-03-29T00:00:00.000Z",
				totalEvents: 12,
				totalAssessments: 3,
				assessmentIds: ["a-1", "a-2", "a-3"],
				overallMastery: 0.46,
				overallConfidence: 0.52,
				averageResponseTimeSeconds: 44,
				conceptMastery: {
					"type-i-and-type-ii-errors": 0.18,
					"one-sample-mean-test": 0.84,
				},
				conceptExposure: {
					"type-i-and-type-ii-errors": 1.1,
					"one-sample-mean-test": 0.9,
				},
				bloomMastery: { understand: 0.72, apply: 0.51, analyze: 0.2 },
				modeMastery: { explain: 0.22, analyze: 0.3, state: 0.88 },
				scenarioMastery: { "real-world": 0.82 },
				conceptBloomMastery: {
					"type-i-and-type-ii-errors": { understand: 0.35, analyze: 0.12 },
					"one-sample-mean-test": { apply: 0.84 },
				},
				conceptModeMastery: {
					"type-i-and-type-ii-errors": { explain: 0.2, analyze: 0.26 },
					"one-sample-mean-test": { state: 0.88, apply: 0.79 },
				},
				conceptScenarioMastery: {
					"one-sample-mean-test": { "real-world": 0.82 },
				},
				conceptAverageResponseTimeSeconds: {
					"type-i-and-type-ii-errors": 58,
					"one-sample-mean-test": 29,
				},
				conceptConfidence: {
					"type-i-and-type-ii-errors": 0.35,
					"one-sample-mean-test": 0.78,
				},
				misconceptions: {
					"type-i-and-type-ii-errors": [{
						misconceptionKey: "common error with type i and type ii errors",
						occurrences: 3,
						lastSeenAt: "2026-03-29T00:00:00.000Z",
						examples: ["Confused false positive and false negative"],
						relatedBloomLevels: ["analyze"],
						relatedModes: ["explain"],
					}],
				},
			};
			await saveStudentPerformanceProfile(studentProfile);

			const adaptive = await buildIntentPayload({
				sessionId: session.sessionId,
				documentIds: registered.map((document) => document.documentId),
				intentType: "build-test",
				studentId: "student-adaptive",
				enableAdaptiveConditioning: true,
				options: { itemCount: 5, teacherId: "teacher-adaptive", unitId: "unit-adaptive", assessmentId: "adaptive-generated" },
			}, {
				...context,
				groupedUnits: [],
			});

			const typeErrorSection = adaptive.sections.find((section) => section.concept === "type i and type ii errors");
			const meanSection = adaptive.sections.find((section) => section.concept === "one-sample mean test");
			expect(typeErrorSection).toBeTruthy();
			expect(meanSection).toBeTruthy();
			expect((typeErrorSection?.items.length ?? 0)).toBeGreaterThanOrEqual(meanSection?.items.length ?? 0);
			expect(typeErrorSection?.items[0]?.difficulty).toBe("low");
		} finally {
			if (previousFlag === undefined) {
				delete process.env.ENABLE_ADAPTIVE_BUILDER;
			} else {
				process.env.ENABLE_ADAPTIVE_BUILDER = previousFlag;
			}
		}
	});

	it("build-test adapts item mode and scenario selection for weak simulation interpretation", async () => {
		const previousFlag = process.env.ENABLE_ADAPTIVE_BUILDER;
		process.env.ENABLE_ADAPTIVE_BUILDER = "true";

		try {
			const [registered] = registerDocuments([
				{ sourceFileName: "adaptive-simulation.pdf", sourceMimeType: "application/pdf" },
			]);
			const session = createDocumentSession([registered!.documentId]);

			saveAnalyzedDocument(buildStatsAnalyzedDocument({
				documentId: registered!.documentId,
				sourceFileName: "adaptive-simulation.pdf",
				concepts: ["simulation-based inference"],
				problemText: "A kissing couples simulation uses a sample proportion and a dotplot to interpret the p-value.",
				difficulty: "medium",
			}));

			const context = await loadPrismSessionContext(session.sessionId);
			if (!context) {
				throw new Error("Expected Prism session context");
			}

			await buildIntentPayload({
				sessionId: session.sessionId,
				documentIds: [registered!.documentId],
				intentType: "build-test",
				options: { itemCount: 1, teacherId: "teacher-sim", unitId: "unit-sim", assessmentId: "simulation-seed" },
			}, {
				...context,
				groupedUnits: [],
			});

			await updateAssessmentFingerprint({
				assessmentId: "simulation-seed",
				edits: {
					removeConceptIds: ["hypothesis-testing", "p-values-decision-rules", "one-sample-proportion-test", "one-sample-mean-test", "type-i-and-type-ii-errors"],
					itemCountOverrides: { "simulation-based-inference": 1 },
					bloomCeilings: { "simulation-based-inference": "apply" },
					sectionOrder: ["simulation-based-inference"],
					now: "2026-03-29T00:00:00.000Z",
				},
			});

			await saveStudentPerformanceProfile({
				studentId: "student-sim",
				unitId: "unit-sim",
				lastUpdated: "2026-03-29T00:00:00.000Z",
				totalEvents: 5,
				totalAssessments: 1,
				assessmentIds: ["simulation-a"],
				overallMastery: 0.51,
				overallConfidence: 0.48,
				averageResponseTimeSeconds: 39,
				conceptMastery: { "simulation-based-inference": 0.32 },
				conceptExposure: { "simulation-based-inference": 1 },
				bloomMastery: { understand: 0.8, apply: 0.25 },
				modeMastery: { interpret: 0.15, explain: 0.9 },
				scenarioMastery: { graphical: 0.1, simulation: 0.7 },
				conceptBloomMastery: { "simulation-based-inference": { apply: 0.22 } },
				conceptModeMastery: { "simulation-based-inference": { interpret: 0.1, explain: 0.85 } },
				conceptScenarioMastery: { "simulation-based-inference": { graphical: 0.1, simulation: 0.75 } },
				conceptAverageResponseTimeSeconds: { "simulation-based-inference": 39 },
				conceptConfidence: { "simulation-based-inference": 0.48 },
				misconceptions: {},
			});

			const adaptive = await buildIntentPayload({
				sessionId: session.sessionId,
				documentIds: [registered!.documentId],
				intentType: "build-test",
				studentId: "student-sim",
				enableAdaptiveConditioning: true,
				options: { itemCount: 1, teacherId: "teacher-sim", unitId: "unit-sim", assessmentId: "simulation-generated" },
			}, {
				...context,
				groupedUnits: [],
			});

			const prompt = adaptive.sections[0]?.items[0]?.prompt ?? "";
			expect(prompt.toLowerCase()).toContain("dotplot");
			expect(classifyItemModes(prompt)).toContain("interpret");
			expect(classifyScenarioTypes(prompt)).toContain("graphical");
		} finally {
			if (previousFlag === undefined) {
				delete process.env.ENABLE_ADAPTIVE_BUILDER;
			} else {
				process.env.ENABLE_ADAPTIVE_BUILDER = previousFlag;
			}
		}
	});

	it("build-test prefers learned item modes when multiple prompts share the same bloom level", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "mode-1.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "mode-2.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "mode-3.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "mode-1.pdf",
			concept: "decimal operations",
			problemText: "State the decimal relationship between 0.4 and 0.35.",
			difficulty: "medium",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "mode-2.pdf",
			concept: "decimal operations",
			problemText: "Explain decimal operations using place value reasoning.",
			difficulty: "medium",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[2]!.documentId,
			sourceFileName: "mode-3.pdf",
			concept: "decimal operations",
			problemText: "Identify the greater decimal in the list.",
			difficulty: "low",
		}));

		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId: "teacher-item-modes",
			assessmentId: "seed-item-modes",
			product: {
				kind: "test",
				focus: null,
				title: "Preferred Modes",
				overview: "Preferred mode seed.",
				estimatedDurationMinutes: 5,
				sections: [{
					concept: "decimal operations",
					sourceDocumentIds: [registered[1]!.documentId],
					items: [{
						itemId: "seed-1",
						prompt: "Explain decimal operations using place value reasoning.",
						concept: "decimal operations",
						sourceDocumentId: registered[1]!.documentId,
						sourceFileName: "mode-2.pdf",
						difficulty: "medium",
						cognitiveDemand: "conceptual",
						answerGuidance: "Look for place value reasoning.",
					}],
				}],
				totalItemCount: 1,
				generatedAt: "2026-03-28T00:00:00.000Z",
			},
			sourceType: "generated",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const generated = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-test",
			options: { itemCount: 1, teacherId: "teacher-item-modes", assessmentId: "generated-item-modes" },
		}, {
			...context,
			groupedUnits: [],
		});

		expect(generated.kind).toBe("test");
		expect(generated.sections).toHaveLength(1);
		expect(generated.sections[0]?.items).toHaveLength(1);
		expect(generated.sections[0]?.items[0]?.prompt).toContain("Explain decimal operations using place value reasoning");
	});

		it("build-test distributes preferred item modes across repeated bloom targets within a section", async () => {
			const registered = registerDocuments([
				{ sourceFileName: "mode-sequence-1.pdf", sourceMimeType: "application/pdf" },
				{ sourceFileName: "mode-sequence-2.pdf", sourceMimeType: "application/pdf" },
				{ sourceFileName: "mode-sequence-3.pdf", sourceMimeType: "application/pdf" },
				{ sourceFileName: "mode-sequence-4.pdf", sourceMimeType: "application/pdf" },
			]);
			const session = createDocumentSession(registered.map((document) => document.documentId));

			saveAnalyzedDocument(buildAnalyzedDocument({
				documentId: registered[0]!.documentId,
				sourceFileName: "mode-sequence-1.pdf",
				concept: "decimal operations",
				problemText: "Identify the greater decimal in the list.",
				difficulty: "low",
			}));
			saveAnalyzedDocument(buildAnalyzedDocument({
				documentId: registered[1]!.documentId,
				sourceFileName: "mode-sequence-2.pdf",
				concept: "decimal operations",
				problemText: "Explain decimal operations using place value reasoning.",
				difficulty: "medium",
			}));
			saveAnalyzedDocument(buildAnalyzedDocument({
				documentId: registered[2]!.documentId,
				sourceFileName: "mode-sequence-3.pdf",
				concept: "decimal operations",
				problemText: "State the decimal relationship between 0.4 and 0.35.",
				difficulty: "medium",
			}));
			saveAnalyzedDocument(buildAnalyzedDocument({
				documentId: registered[3]!.documentId,
				sourceFileName: "mode-sequence-4.pdf",
				concept: "decimal operations",
				problemText: "Explain how place value supports decimal comparison.",
				difficulty: "medium",
			}));

			await saveAssessmentFingerprint(buildAssessmentFingerprint({
				teacherId: "teacher-mode-sequence",
				assessmentId: "seed-mode-sequence",
				product: {
					kind: "test",
					focus: null,
					title: "Mode Sequence Seed",
					overview: "Seed preferred item modes.",
					estimatedDurationMinutes: 10,
					sections: [{
						concept: "decimal operations",
						sourceDocumentIds: [registered[0]!.documentId],
						items: [
							{
								itemId: "seed-explain-1",
								prompt: "Explain decimal operations using place value reasoning.",
								concept: "decimal operations",
								sourceDocumentId: registered[1]!.documentId,
								sourceFileName: "mode-sequence-2.pdf",
								difficulty: "medium",
								cognitiveDemand: "conceptual",
								answerGuidance: "Look for place value reasoning.",
							},
							{
								itemId: "seed-explain-2",
								prompt: "Explain how place value supports decimal comparison.",
								concept: "decimal operations",
								sourceDocumentId: registered[3]!.documentId,
								sourceFileName: "mode-sequence-4.pdf",
								difficulty: "medium",
								cognitiveDemand: "conceptual",
								answerGuidance: "Look for place value reasoning.",
							},
							{
								itemId: "seed-explain-3",
								prompt: "Explain why decimal operations depend on place value.",
								concept: "decimal operations",
								sourceDocumentId: registered[1]!.documentId,
								sourceFileName: "mode-sequence-2.pdf",
								difficulty: "medium",
								cognitiveDemand: "conceptual",
								answerGuidance: "Look for place value reasoning.",
							},
							{
								itemId: "seed-state-1",
								prompt: "State the decimal relationship between 0.4 and 0.35.",
								concept: "decimal operations",
								sourceDocumentId: registered[2]!.documentId,
								sourceFileName: "mode-sequence-3.pdf",
								difficulty: "medium",
								cognitiveDemand: "conceptual",
								answerGuidance: "Look for an accurate comparison statement.",
							},
							{
								itemId: "seed-state-2",
								prompt: "State whether 0.4 or 0.35 is greater.",
								concept: "decimal operations",
								sourceDocumentId: registered[2]!.documentId,
								sourceFileName: "mode-sequence-3.pdf",
								difficulty: "medium",
								cognitiveDemand: "conceptual",
								answerGuidance: "Look for an accurate comparison statement.",
							},
							{
								itemId: "seed-identify-1",
								prompt: "Identify the greater decimal in the list.",
								concept: "decimal operations",
								sourceDocumentId: registered[0]!.documentId,
								sourceFileName: "mode-sequence-1.pdf",
								difficulty: "low",
								cognitiveDemand: "recall",
								answerGuidance: "Look for the correct decimal.",
							},
						],
					}],
					totalItemCount: 6,
					generatedAt: "2026-03-28T00:00:00.000Z",
				},
				sourceType: "generated",
			}));

			await updateAssessmentFingerprint({
				assessmentId: "seed-mode-sequence",
				edits: {
					itemCountOverrides: { "decimal-operations": 4 },
					bloomDistributions: {
						"decimal-operations": {
							remember: 1,
							understand: 3,
						},
					},
					sectionOrder: ["decimal-operations"],
					now: "2026-03-28T00:00:00.000Z",
				},
			});

			const context = await loadPrismSessionContext(session.sessionId);
			if (!context) {
				throw new Error("Expected Prism session context");
			}

			const generated = await buildIntentPayload({
				sessionId: session.sessionId,
				documentIds: registered.map((document) => document.documentId),
				intentType: "build-test",
				options: { itemCount: 4, teacherId: "teacher-mode-sequence", assessmentId: "generated-mode-sequence" },
			}, {
				...context,
				groupedUnits: [],
			});

			expect(generated.kind).toBe("test");
			expect(generated.sections).toHaveLength(1);
			expect(generated.sections[0]?.items).toHaveLength(4);
			const generatedModes = generated.sections[0]!.items.map((item) => classifyItemModes(item.prompt));
			expect(generatedModes[0]).toContain("explain");
			expect(generatedModes[1]).toContain("explain");
			expect(generatedModes[2]).toContain("state");
			expect(generatedModes[3]).toContain("identify");
		});

		it("build-test enforces explicit bloom ladder and difficulty progression within a fingerprinted section", async () => {
			const registered = registerDocuments([
				{ sourceFileName: "ladder-1.pdf", sourceMimeType: "application/pdf" },
				{ sourceFileName: "ladder-2.pdf", sourceMimeType: "application/pdf" },
				{ sourceFileName: "ladder-3.pdf", sourceMimeType: "application/pdf" },
				{ sourceFileName: "ladder-4.pdf", sourceMimeType: "application/pdf" },
			]);
			const session = createDocumentSession(registered.map((document) => document.documentId));

			saveAnalyzedDocument(buildAnalyzedDocument({
				documentId: registered[0]!.documentId,
				sourceFileName: "ladder-1.pdf",
				concept: "decimal operations",
				problemText: "Identify the greater decimal in the list.",
				difficulty: "high",
			}));
			saveAnalyzedDocument(buildAnalyzedDocument({
				documentId: registered[1]!.documentId,
				sourceFileName: "ladder-2.pdf",
				concept: "decimal operations",
				problemText: "Explain how place value supports decimal comparison.",
				difficulty: "high",
			}));
			saveAnalyzedDocument(buildAnalyzedDocument({
				documentId: registered[2]!.documentId,
				sourceFileName: "ladder-3.pdf",
				concept: "decimal operations",
				problemText: "Apply decimal operations to solve 0.4 + 0.35.",
				difficulty: "low",
			}));
			saveAnalyzedDocument(buildAnalyzedDocument({
				documentId: registered[3]!.documentId,
				sourceFileName: "ladder-4.pdf",
				concept: "decimal operations",
				problemText: "Analyze why the decimal strategy works.",
				difficulty: "low",
			}));

			await saveAssessmentFingerprint(buildAssessmentFingerprint({
				teacherId: "teacher-ladder-sequence",
				assessmentId: "seed-ladder-sequence",
				product: {
					kind: "test",
					focus: null,
					title: "Ladder Seed",
					overview: "Seed bloom ladder.",
					estimatedDurationMinutes: 10,
					sections: [{
						concept: "decimal operations",
						sourceDocumentIds: registered.map((document) => document.documentId),
						items: [
							{
								itemId: "ladder-seed-1",
								prompt: "Identify the greater decimal in the list.",
								concept: "decimal operations",
								sourceDocumentId: registered[0]!.documentId,
								sourceFileName: "ladder-1.pdf",
								difficulty: "low",
								cognitiveDemand: "recall",
								answerGuidance: "Look for the correct decimal.",
							},
							{
								itemId: "ladder-seed-2",
								prompt: "Explain how place value supports decimal comparison.",
								concept: "decimal operations",
								sourceDocumentId: registered[1]!.documentId,
								sourceFileName: "ladder-2.pdf",
								difficulty: "medium",
								cognitiveDemand: "conceptual",
								answerGuidance: "Look for place value reasoning.",
							},
							{
								itemId: "ladder-seed-3",
								prompt: "Apply decimal operations to solve 0.4 + 0.35.",
								concept: "decimal operations",
								sourceDocumentId: registered[2]!.documentId,
								sourceFileName: "ladder-3.pdf",
								difficulty: "medium",
								cognitiveDemand: "procedural",
								answerGuidance: "Look for accurate decimal computation.",
							},
							{
								itemId: "ladder-seed-4",
								prompt: "Analyze why the decimal strategy works.",
								concept: "decimal operations",
								sourceDocumentId: registered[3]!.documentId,
								sourceFileName: "ladder-4.pdf",
								difficulty: "high",
								cognitiveDemand: "analysis",
								answerGuidance: "Look for analysis of the strategy.",
							},
						],
					}],
					totalItemCount: 4,
					generatedAt: "2026-03-28T00:00:00.000Z",
				},
				sourceType: "generated",
			}));

			await updateAssessmentFingerprint({
				assessmentId: "seed-ladder-sequence",
				edits: {
					itemCountOverrides: { "decimal-operations": 4 },
					bloomDistributions: {
						"decimal-operations": {
							remember: 1,
							understand: 1,
							apply: 1,
							analyze: 1,
						},
					},
					sectionOrder: ["decimal-operations"],
					now: "2026-03-28T00:00:00.000Z",
				},
			});

			const context = await loadPrismSessionContext(session.sessionId);
			if (!context) {
				throw new Error("Expected Prism session context");
			}

			const generated = await buildIntentPayload({
				sessionId: session.sessionId,
				documentIds: registered.map((document) => document.documentId),
				intentType: "build-test",
				options: { itemCount: 4, teacherId: "teacher-ladder-sequence", assessmentId: "generated-ladder-sequence" },
			}, {
				...context,
				groupedUnits: [],
			});

			expect(generated.kind).toBe("test");
			expect(generated.sections).toHaveLength(1);
			expect(generated.sections[0]?.items).toHaveLength(4);
			expect(generated.sections[0]!.items.map((item) => classifyBloomLevel(item.prompt))).toEqual(["remember", "understand", "apply", "analyze"]);
			expect(generated.sections[0]!.items.map((item) => item.difficulty)).toEqual(["low", "low", "medium", "high"]);
		});

	it("build-lesson uses intentional minimal-content fallbacks for sparse sources", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "sparse-notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildSparseAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "sparse-notes.pdf",
			concept: "fractions",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const lesson = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-lesson",
		}, context);

		expect(lesson.kind).toBe("lesson");
		expect(lesson.domain).toBe("Mathematics");
		expect(lesson.warmUp[0]?.title).toBe("Quick Check");
		expect(lesson.conceptIntroduction.map((entry) => entry.title)).toEqual(["Key Idea 1", "Key Idea 2"]);
		expect(lesson.guidedPractice[0]?.title).toBe("Worked Example 1");
		expect(lesson.independentPractice.length).toBeGreaterThanOrEqual(2);
		expect(lesson.independentPractice.length).toBeLessThanOrEqual(3);
		expect(lesson.exitTicket[0]?.title).toBe("Exit Prompt");
		expect(JSON.stringify(lesson)).not.toContain("Section 1");
	});

	it("build-lesson rewrites concept introductions into short teacher-ready key ideas", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "concept-notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildUnitOnlyAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "concept-notes.pdf",
			concept: "photosynthesis",
			description: "Photosynthesis happens in chloroplasts. Photosynthesis happens in chloroplasts. Plants use light energy to make glucose. Oxygen is released as a byproduct. Teachers often connect this to plant structure.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const lesson = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-lesson",
		}, context);

		expect(lesson.kind).toBe("lesson");
		expect(lesson.conceptIntroduction.every((entry) => /^Key Idea \d+$/.test(entry.title))).toBe(true);
		expect(lesson.conceptIntroduction[0]?.description).toContain("Photosynthesis happens in chloroplasts.");
		expect(lesson.conceptIntroduction[0]?.description.match(/Photosynthesis happens in chloroplasts\./g)?.length ?? 0).toBe(1);
		for (const entry of lesson.conceptIntroduction) {
			const sentenceCount = entry.description.match(/[^.!?]+[.!?]/g)?.length ?? 0;
			expect(sentenceCount).toBeGreaterThanOrEqual(2);
			expect(sentenceCount).toBeLessThanOrEqual(4);
		}
	});

	it("build-lesson creates distinct independent practice prompts and a clean exit ticket", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "practice-notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildSparseAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "practice-notes.pdf",
			concept: "equivalent fractions",
			minimalText: "Equivalent fractions name the same amount. Equivalent fractions name the same amount.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const lesson = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-lesson",
		}, context);

		expect(lesson.kind).toBe("lesson");
		expect(new Set(lesson.independentPractice.map((entry) => entry.description)).size).toBe(lesson.independentPractice.length);
		expect(lesson.independentPractice.length).toBeGreaterThanOrEqual(2);
		expect(lesson.independentPractice.length).toBeLessThanOrEqual(3);
		expect(lesson.exitTicket).toHaveLength(1);
		expect(lesson.exitTicket[0]?.description).toContain("In 2-3 sentences");
	});

	it("build-lesson groups scaffold bullets by concept and removes duplicates", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "scaffold-notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildScaffoldRichAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "scaffold-notes.pdf",
			concepts: ["fractions", "equivalent fractions"],
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const lesson = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-lesson",
		}, context);

		expect(lesson.kind).toBe("lesson");
		expect(new Set(lesson.scaffolds.map((entry) => `${entry.concept}::${entry.strategy}`)).size).toBe(lesson.scaffolds.length);
		expect(new Set(lesson.scaffolds.map((entry) => entry.concept))).toEqual(new Set(["Equivalent Fractions", "Fractions"]));
	});

	it("build-lesson limits teacher notes to actionable prerequisite and misconception guidance", async () => {
		const [registered] = registerDocuments([
			{ sourceFileName: "teacher-notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession([registered!.documentId]);

		saveAnalyzedDocument(buildScaffoldRichAnalyzedDocument({
			documentId: registered!.documentId,
			sourceFileName: "teacher-notes.pdf",
			concepts: ["fractions", "equivalent fractions"],
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const lesson = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [registered!.documentId],
			intentType: "build-lesson",
		}, context);

		expect(lesson.kind).toBe("lesson");
		expect(lesson.teacherNotes.length).toBeGreaterThanOrEqual(2);
		expect(lesson.teacherNotes.length).toBeLessThanOrEqual(3);
		expect(lesson.teacherNotes.some((entry) => entry.includes("Check prerequisite understanding"))).toBe(true);
		expect(lesson.teacherNotes.some((entry) => entry.includes("Watch for"))).toBe(true);
		expect(lesson.teacherNotes.every((entry) => !entry.includes("Use teacher-notes.pdf as the core source"))).toBe(true);
	});

	it("build-instructional-map falls back to analyzed concepts when grouped units have no concept tags", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "science-notes.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "lab-notes.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildConceptOnlyAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "science-notes.pdf",
			concepts: ["photosynthesis", "chloroplast"],
			description: "Plants use photosynthesis in the chloroplast to convert light into stored energy.",
		}));
		saveAnalyzedDocument(buildConceptOnlyAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "lab-notes.pdf",
			concepts: ["glucose", "calvin cycle"],
			description: "The Calvin cycle produces glucose after plants capture light energy.",
		}));

		const context = await loadPrismSessionContext(session.sessionId);
		if (!context) {
			throw new Error("Expected Prism session context");
		}

		const instructionalMap = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-instructional-map",
		}, context);

		expect(instructionalMap.kind).toBe("instructional-map");
		expect(instructionalMap.conceptGraph.nodes).toEqual(expect.arrayContaining(["photosynthesis", "chloroplast", "glucose", "calvin cycle"]));
		expect(instructionalMap.documentConceptAlignment[0]?.concepts).toEqual(expect.arrayContaining(["photosynthesis", "chloroplast"]));
		expect(instructionalMap.unitConceptAlignment).toEqual(expect.arrayContaining([
			expect.objectContaining({
				unitId: expect.stringMatching(/^unit-/),
				concepts: expect.arrayContaining(["photosynthesis", "chloroplast"]),
			}),
		]));
	});

	it("build-instructional-map uses hydrated unit concept overrides instead of regrouped fragment concepts", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "notes-a.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "notes-b.pdf", sourceMimeType: "application/pdf" },
		]);
		const session = createDocumentSession(registered.map((document) => document.documentId));

		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[0]!.documentId,
			sourceFileName: "notes-a.pdf",
			concept: "fractions",
			problemText: "Use fractions to compare shaded parts.",
		}));
		saveAnalyzedDocument(buildAnalyzedDocument({
			documentId: registered[1]!.documentId,
			sourceFileName: "notes-b.pdf",
			concept: "fractions",
			problemText: "Explain why the fractions are equivalent.",
		}));

		const initialContext = await loadPrismSessionContext(session.sessionId);
		if (!initialContext) {
			throw new Error("Expected Prism session context");
		}
		const unitId = initialContext.groupedUnits[0]?.unitId;
		if (!unitId) {
			throw new Error("Expected grouped instructional unit");
		}

		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: session.sessionId,
			canonicalProblemId: buildInstructionalUnitOverrideId(session.sessionId, unitId),
			target: "concepts",
			aiValue: { fractions: 1 },
			teacherValue: { photosynthesis: 1, chloroplast: 0.8 },
		});

		const overriddenContext = await loadPrismSessionContext(session.sessionId);
		if (!overriddenContext) {
			throw new Error("Expected overridden Prism session context");
		}

		const instructionalMap = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: registered.map((document) => document.documentId),
			intentType: "build-instructional-map",
		}, overriddenContext);

		expect(instructionalMap.kind).toBe("instructional-map");
		expect(instructionalMap.conceptGraph.nodes).toEqual(expect.arrayContaining(["photosynthesis", "chloroplast"]));
		expect(instructionalMap.conceptGraph.nodes).not.toContain("fractions");
		expect(instructionalMap.unitConceptAlignment).toEqual(expect.arrayContaining([
			expect.objectContaining({
				unitId,
				concepts: ["photosynthesis", "chloroplast"],
			}),
		]));
	});
});