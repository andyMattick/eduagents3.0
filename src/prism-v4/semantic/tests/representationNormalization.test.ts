import { describe, expect, it } from "vitest";

import type { ProblemWithMetadata } from "../extract/extractProblemMetadata";
import { buildProblemTagVector } from "../tag/buildProblemTagVector";
import { detectRepresentationSignals } from "../utils/representationCues";

function makeProblem(overrides: Partial<ProblemWithMetadata> & Pick<ProblemWithMetadata, "problemId" | "rawText" | "representation" | "problemType" | "multiStep" | "steps" | "abstractionLevel" | "answerChoices">): ProblemWithMetadata {
	return {
		problemId: overrides.problemId,
		rawText: overrides.rawText,
		cleanedText: overrides.cleanedText ?? overrides.rawText,
		sourceType: overrides.sourceType ?? "document",
		sourceDocumentId: overrides.sourceDocumentId ?? "doc-1",
		sourcePageNumber: overrides.sourcePageNumber ?? 1,
		problemType: overrides.problemType,
		representation: overrides.representation,
		multiStep: overrides.multiStep,
		steps: overrides.steps,
		abstractionLevel: overrides.abstractionLevel,
		answerChoices: overrides.answerChoices,
		...overrides,
	};
}

describe("representation normalization", () => {
	it("detects an equation-only problem", () => {
		const signals = detectRepresentationSignals({ text: "Solve for x: 2x + 3 = 11." });

		expect(signals.representation).toBe("equation");
		expect(signals.representationCount).toBe(1);
	});

	it("uses stable precedence for graph and table cues", () => {
		const signals = detectRepresentationSignals({ text: "Use the graph and table to answer the question.", hasExtractedTable: true });

		expect(signals.representation).toBe("table");
		expect(signals.representationCount).toBe(2);
	});

	it("detects primary-source style excerpts", () => {
		const signals = detectRepresentationSignals({ text: "Read the passage excerpt and identify the author's purpose." });

		expect(signals.representation).toBe("primarySource");
		expect(signals.representationCount).toBe(1);
	});

	it("detects experiment descriptions", () => {
		const signals = detectRepresentationSignals({ text: "Design an experiment, identify the variable, and write the procedure." });

		expect(signals.representation).toBe("experiment");
		expect(signals.representationCount).toBe(1);
	});

	it("keeps code-like content internal while preserving a public paragraph representation", () => {
		const signals = detectRepresentationSignals({ text: "function add(a, b) { return a + b; } What does console.log(add(1, 2)); output?" });

		expect(signals.cues.codeLike).toBe(true);
		expect(signals.representation).toBe("paragraph");
		expect(signals.representationCount).toBe(1);
	});

	it("does not change subject or domain inference for known concept fixtures", () => {
		const vectors = buildProblemTagVector({
			problems: [
				makeProblem({
					problemId: "p1",
					rawText: "Use the table and equation to solve for x.",
					representation: "table",
					problemType: "constructedResponse",
					multiStep: 0.5,
					steps: 2,
					abstractionLevel: 0.3,
					answerChoices: [],
				}),
				makeProblem({
					problemId: "p2",
					rawText: "Read the passage excerpt and explain the author's point of view.",
					representation: "primarySource",
					problemType: "constructedResponse",
					multiStep: 0.4,
					steps: 2,
					abstractionLevel: 0.25,
					answerChoices: [],
				}),
			],
			concepts: {
				p1: { "math.algebra": 1 },
				p2: { "reading.comprehension": 1 },
			},
			linguistic: {
				linguisticLoad: { p1: 0.2, p2: 0.4 },
				vocabularyTier: { p1: 1, p2: 2 },
				sentenceComplexity: { p1: 0.2, p2: 0.3 },
				wordProblem: { p1: 0, p2: 0 },
				passiveVoice: { p1: 0, p2: 0.1 },
				abstractLanguage: { p1: 0.1, p2: 0.2 },
			},
			bloom: {
				p1: { remember: 0.1, understand: 0.2, apply: 0.6, analyze: 0.2, evaluate: 0, create: 0 },
				p2: { remember: 0.1, understand: 0.5, apply: 0.1, analyze: 0.2, evaluate: 0.1, create: 0 },
			},
			representation: { p1: "table", p2: "primarySource" },
			misconceptions: { p1: {}, p2: {} },
			standards: { p1: {}, p2: {} },
		});

		expect(vectors[0]?.subject).toBe("math");
		expect(vectors[0]?.domain).toBe("algebra");
		expect(vectors[1]?.subject).toBe("reading");
		expect(vectors[1]?.domain).toBe("comprehension");
	});
});