import { describe, expect, it } from "vitest";

import type { Problem } from "../../../schema/domain";
import type { ProblemTagVector } from "../../../schema/semantic";
import { detectMultipart } from "../../structure/detectMultipart";
import { buildInternalProblemReasoning, inferStructuralCognition } from "../index";
import { applyTemplates, genericTemplates, getTemplateMatches } from "../templates";

function makeProblem(overrides: Partial<Problem> & { rawText: string }, tags?: Partial<ProblemTagVector>): Problem {
	return {
		problemId: overrides.problemId ?? "p1",
		rawText: overrides.rawText,
		cleanedText: overrides.cleanedText ?? overrides.rawText,
		sourceType: overrides.sourceType ?? "document",
		sourceDocumentId: overrides.sourceDocumentId ?? "doc-1",
		sourcePageNumber: overrides.sourcePageNumber ?? 1,
		...overrides,
		tags: {
			subject: tags?.subject ?? "general",
			domain: tags?.domain ?? "general",
			concepts: tags?.concepts ?? {},
			problemType: tags?.problemType ?? { shortAnswer: 1, constructedResponse: 1 },
			multiStep: tags?.multiStep ?? 0.2,
			steps: tags?.steps ?? 1,
			representation: tags?.representation ?? "paragraph",
			representationCount: tags?.representationCount ?? 1,
			linguisticLoad: tags?.linguisticLoad ?? 0.2,
			vocabularyTier: tags?.vocabularyTier ?? 1,
			sentenceComplexity: tags?.sentenceComplexity ?? 0.2,
			wordProblem: tags?.wordProblem ?? 0,
			passiveVoice: tags?.passiveVoice ?? 0,
			abstractLanguage: tags?.abstractLanguage ?? 0,
			bloom: tags?.bloom ?? { remember: 0.2, understand: 0.3, apply: 0.2, analyze: 0.1, evaluate: 0.1, create: 0 },
			difficulty: tags?.difficulty ?? 0.3,
			distractorDensity: tags?.distractorDensity ?? 0,
			abstractionLevel: tags?.abstractionLevel ?? 0.2,
			misconceptionTriggers: tags?.misconceptionTriggers ?? {},
			frustrationRisk: tags?.frustrationRisk ?? 0.2,
			engagementPotential: tags?.engagementPotential ?? 0.4,
			cognitive: tags?.cognitive ?? {
				bloom: { remember: 0.2, understand: 0.3, apply: 0.2, analyze: 0.1, evaluate: 0.1, create: 0 },
				difficulty: 0.3,
				linguisticLoad: 0.2,
				abstractionLevel: 0.2,
				multiStep: 0.2,
				representationComplexity: 0.2,
				misconceptionRisk: 0,
			},
		},
	};
}

function buildTemplateInput(problem: Problem) {
	const matches = getTemplateMatches(problem, genericTemplates);
	const selected = matches.find((match) => match.template.stepHints);

	return {
		template: {
			...applyTemplates(problem, genericTemplates),
			reasoning: selected?.template.stepHints
				? {
					templateExpectedSteps: selected.template.stepHints.expectedSteps,
					templateConfidence: selected.confidence,
					templateIsBestGuess: selected.isBestGuess,
					stepType: selected.template.stepHints.stepType,
					templateId: selected.template.id,
					templateSource: "subject" as const,
				}
				: undefined,
		},
		selected,
	};
}

describe("expected steps fusion", () => {
	it("returns one expected step for a definition prompt", () => {
		const problem = makeProblem({ rawText: "Define osmosis." });
		const structural = inferStructuralCognition(problem);
		const { template } = buildTemplateInput(problem);
		const reasoning = buildInternalProblemReasoning(structural, template);

		expect(reasoning.expectedSteps).toBe(1);
		expect(reasoning.stepType).toBe("definition");
	});

	it("returns two expected steps for a code reasoning prompt", () => {
		const problem = makeProblem({ rawText: "Predict the output of this code: for(let i = 0; i < 2; i++) { console.log(i); }" });
		const structural = inferStructuralCognition(problem);
		const { template } = buildTemplateInput(problem);
		const reasoning = buildInternalProblemReasoning(structural, template);

		expect(reasoning.expectedSteps).toBe(2);
		expect(reasoning.stepType).toBe("code-interpretation");
	});

	it("gives multipart parents more expected steps than children while preserving hierarchy", () => {
		const [parent, child] = detectMultipart([
			makeProblem({ problemId: "p2", teacherLabel: "2.", rawText: "Use the graph to answer the questions." }, { representation: "graph", representationCount: 1, steps: 1 }),
			makeProblem({ problemId: "p2a", teacherLabel: "2a)", rawText: "State the trend." }, { representation: "paragraph", representationCount: 1, steps: 1 }),
		]);

		const parentStructural = inferStructuralCognition(parent!, { isMultipartParent: true });
		const childStructural = inferStructuralCognition(child!);
		const parentReasoning = buildInternalProblemReasoning(parentStructural, { reasoning: undefined });
		const childReasoning = buildInternalProblemReasoning(childStructural, { reasoning: undefined });

		expect(child?.parentProblemId).toBe("p2");
		expect(child?.rootProblemId).toBe("p2");
		expect(child?.partIndex).toBe(1);
		expect(parentReasoning.expectedSteps).toBeGreaterThan(childReasoning.expectedSteps);
	});

	it("blends template and structural signals for graph interpretation", () => {
		const problem = makeProblem(
			{ rawText: "Interpret the graph, explain the trend, and justify your answer." },
			{ representation: "graph", representationCount: 1, steps: 3 },
		);
		const structural = inferStructuralCognition(problem);
		const { template, selected } = buildTemplateInput(problem);
		const reasoning = buildInternalProblemReasoning(structural, template);

		expect(selected?.template.id).toBe("interpretation");
		expect(reasoning.stepSource).toBe("blended");
		expect(reasoning.expectedSteps).toBeGreaterThanOrEqual(2);
		expect(reasoning.expectedSteps).toBeLessThanOrEqual(3);
	});

	it("falls back to structural steps when no template matches", () => {
		const problem = makeProblem(
			{ rawText: "List the color shown." },
			{ representation: "paragraph", representationCount: 1, steps: 1, problemType: { shortAnswer: 1 } },
		);
		const structural = inferStructuralCognition(problem);
		const reasoning = buildInternalProblemReasoning(structural, { reasoning: undefined });

		expect(reasoning.templateExpectedSteps).toBeUndefined();
		expect(reasoning.stepSource).toBe("fallback");
		expect(reasoning.expectedSteps).toBe(Math.round(reasoning.structuralStepEstimate ?? 0));
	});
});