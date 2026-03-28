import { afterEach, describe, expect, it } from "vitest";

import { buildIntentPayload } from "./buildIntentProduct";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../registry";
import { loadPrismSessionContext } from "../registryStore";
import { buildInstructionalUnitOverrideId, resetTeacherFeedbackState, saveTeacherFeedback } from "../../teacherFeedback";
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