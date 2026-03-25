import { afterEach, describe, expect, it } from "vitest";

import { buildIntentPayload } from "./buildIntentProduct";
import { createDocumentSession, registerDocuments, resetDocumentRegistryState, saveAnalyzedDocument } from "../registry";
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
					nodeType: "paragraph",
					orderIndex: 0,
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
				instructionalRole: "problem-stem",
				contentType: "question",
				confidence: 0.95,
				classifierVersion: "wave3-test",
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

describe("buildIntentPayload", () => {
	afterEach(() => {
		resetDocumentRegistryState();
	});

	it("builds the first five Wave 3 intent payloads from analyzed documents", async () => {
		const registered = registerDocuments([
			{ sourceFileName: "notes.pdf", sourceMimeType: "application/pdf" },
			{ sourceFileName: "quiz.pdf", sourceMimeType: "application/pdf" },
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

		const extractProblems = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "extract-problems",
		});
		expect(extractProblems.kind).toBe("problem-extraction");
		expect(extractProblems.totalProblemCount).toBe(2);

		const extractConcepts = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "extract-concepts",
		});
		expect(extractConcepts.kind).toBe("concept-extraction");
		expect(extractConcepts.concepts[0].concept).toBe("fractions");

		const summary = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "summarize",
		});
		expect(summary.kind).toBe("summary");
		expect(summary.documents).toHaveLength(2);

		const review = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "build-review",
		});
		expect(review.kind).toBe("review");
		expect(review.sections.length).toBeGreaterThan(0);

		const test = await buildIntentPayload({
			sessionId: session.sessionId,
			documentIds,
			intentType: "build-test",
			options: { itemCount: 2 },
		});
		expect(test.kind).toBe("test");
		expect(test.totalItemCount).toBe(2);
	});
});