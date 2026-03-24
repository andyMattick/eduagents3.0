import { describe, expect, it } from "vitest";

import type { Problem } from "../../../schema/domain";
import type { ProblemTagVector } from "../../../schema/semantic";
import { applyTemplates, elaTemplates, historyTemplates, mathTemplates, scienceTemplates, statsTemplates } from "../templates";

function makeProblem(overrides: Partial<Problem> & { rawText: string }, tags?: Partial<ProblemTagVector>): Problem {
	return {
		problemId: overrides.problemId ?? "p1",
		rawText: overrides.rawText,
		cleanedText: overrides.cleanedText ?? overrides.rawText,
		sourceType: overrides.sourceType ?? "document",
		sourceDocumentId: overrides.sourceDocumentId ?? "doc-1",
		sourcePageNumber: overrides.sourcePageNumber ?? 1,
		...overrides,
		tags: tags
			? ({
				subject: tags.subject ?? "general",
				domain: tags.domain ?? "general",
				concepts: tags.concepts ?? {},
				problemType: tags.problemType ?? {},
				multiStep: tags.multiStep ?? 0,
				steps: tags.steps ?? 1,
				representation: tags.representation ?? "paragraph",
				representationCount: tags.representationCount ?? 1,
				linguisticLoad: tags.linguisticLoad ?? 0.2,
				vocabularyTier: tags.vocabularyTier ?? 1,
				sentenceComplexity: tags.sentenceComplexity ?? 0.2,
				wordProblem: tags.wordProblem ?? 0,
				passiveVoice: tags.passiveVoice ?? 0,
				abstractLanguage: tags.abstractLanguage ?? 0,
				bloom: tags.bloom ?? { remember: 0.2, understand: 0.4, apply: 0.2, analyze: 0.1, evaluate: 0.1, create: 0 },
				difficulty: tags.difficulty ?? 0.3,
				distractorDensity: tags.distractorDensity ?? 0,
				abstractionLevel: tags.abstractionLevel ?? 0.2,
				misconceptionTriggers: tags.misconceptionTriggers ?? {},
				frustrationRisk: tags.frustrationRisk ?? 0.2,
				engagementPotential: tags.engagementPotential ?? 0.4,
				cognitive: tags.cognitive ?? {
					bloom: { remember: 0.2, understand: 0.4, apply: 0.2, analyze: 0.1, evaluate: 0.1, create: 0 },
					difficulty: 0.3,
					linguisticLoad: 0.2,
					abstractionLevel: 0.2,
					multiStep: 0,
					representationComplexity: 0.2,
					misconceptionRisk: 0,
				},
			} as ProblemTagVector)
			: overrides.tags,
	};
}

describe("template matching", () => {
	it("matches math and stats starter templates", () => {
		const mathProblem = makeProblem(
			{ rawText: "Use the model to write an equation and solve the system." },
			{ subject: "math", domain: "algebra", concepts: { "math.algebra": 1 } },
		);
		const statsProblem = makeProblem(
			{ rawText: "Interpret the confidence interval and identify a Type I error." },
			{ subject: "math", domain: "statistics", concepts: { "math.statistics": 1 } },
		);

		expect(applyTemplates(mathProblem, mathTemplates).bloom?.apply ?? 0).toBeGreaterThan(0);
		expect(applyTemplates(statsProblem, statsTemplates).bloom?.analyze ?? 0).toBeGreaterThan(0);
	});

	it("matches ELA starter templates", () => {
		const elaProblem = makeProblem(
			{ rawText: "What is the author's purpose, and which evidence best supports your claim?" },
			{ subject: "reading", domain: "comprehension", concepts: { "reading.comprehension": 1 } },
		);

		expect(applyTemplates(elaProblem, elaTemplates).bloom?.evaluate ?? 0).toBeGreaterThan(0);
	});

	it("matches science starter templates", () => {
		const scienceProblem = makeProblem(
			{ rawText: "Design an experiment, identify the control variable, and interpret the data trend." },
			{ subject: "science", domain: "experiments", concepts: { "science.experimental_design": 1 } },
		);

		expect(applyTemplates(scienceProblem, scienceTemplates).bloom?.create ?? 0).toBeGreaterThan(0);
	});

	it("matches history starter templates", () => {
		const historyProblem = makeProblem(
			{ rawText: "Compare both sources and explain how the author's perspective changes the account." },
			{ subject: "socialstudies", domain: "history", concepts: { "socialstudies.history": 1 } },
		);

		expect(applyTemplates(historyProblem, historyTemplates).bloom?.analyze ?? 0).toBeGreaterThan(0);
	});
});