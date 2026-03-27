import { afterEach, describe, expect, it } from "vitest";

import { buildIntentPayload } from "./buildIntentProduct";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../registry";
import { loadPrismSessionContext } from "../registryStore";
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
		expect(extractProblems.totalProblemCount).toBe(2);

		const extractConcepts = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "extract-concepts",
		}, context);
		expect(extractConcepts.kind).toBe("concept-extraction");
		expect(extractConcepts.concepts[0].concept).toBe("fractions");

		const summary = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "summarize",
		}, context);
		expect(summary.kind).toBe("summary");
		expect(summary.documents).toHaveLength(2);

		const review = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "build-review",
		}, context);
		expect(review.kind).toBe("review");
		expect(review.sections.length).toBeGreaterThan(0);

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "build-test",
			options: { itemCount: 2 },
		}, context);
		expect(test.kind).toBe("test");
		expect(test.totalItemCount).toBe(2);

		const compare = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: documentIds.slice(0, 2),
			intentType: "compare-documents",
		}, context);
		expect(compare.kind).toBe("compare-documents");
		expect(compare.documents).toHaveLength(2);
		expect(compare.documentSimilarity.length).toBeGreaterThan(0);

		const merge = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "merge-documents",
		}, context);
		expect(merge.kind).toBe("merge-documents");
		expect(merge.mergedInsights.totalDocuments).toBe(3);
		expect(merge.mergedProblems.length).toBeGreaterThan(0);

		const sequence = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "build-sequence",
		}, context);
		expect(sequence.kind).toBe("sequence");
		expect(sequence.recommendedOrder).toHaveLength(3);

		const lesson = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds: [documentIds[0]!],
			intentType: "build-lesson",
		}, context);
		expect(lesson.kind).toBe("lesson");
		expect(lesson.learningObjectives.some((objective) => objective.toLowerCase().includes("fractions"))).toBe(true);
		expect(lesson.conceptIntroduction.length).toBeGreaterThan(0);
		expect(lesson.sourceAnchors).toHaveLength(1);

		const unit = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "build-unit",
		}, context);
		expect(unit.kind).toBe("unit");
		expect(unit.lessonSequence).toHaveLength(3);
		expect(unit.conceptMap.length).toBeGreaterThan(0);
		expect(unit.misconceptionMap.length).toBeGreaterThan(0);

		const instructionalMap = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "build-instructional-map",
		}, context);
		expect(instructionalMap.kind).toBe("instructional-map");
		expect(instructionalMap.documentConceptAlignment).toHaveLength(3);
		expect(instructionalMap.problemConceptAlignment.length).toBeGreaterThan(0);

		const alignment = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "curriculum-alignment",
		}, context);
		expect(alignment.kind).toBe("curriculum-alignment");
		expect(alignment.standardsCoverage.length).toBeGreaterThan(0);
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
		expect(test.totalItemCount).toBe(1);
		expect(test.sections[0]?.items[0]?.prompt).toContain("area model");
		expect(test.sections[0]?.items[0]?.prompt).not.toContain("RAW PROBLEM TEXT SHOULD NOT BE USED");
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
});