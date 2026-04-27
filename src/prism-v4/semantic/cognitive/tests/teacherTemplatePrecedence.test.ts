import { describe, expect, it } from "vitest";

import type { Problem } from "../../../schema/domain";
import type { ProblemTagVector } from "../../../schema/semantic";
import { getPrioritizedTemplateMatches, genericTemplates, type CognitiveTemplate } from "../templates";

function makeProblem(rawText: string, tags?: Partial<ProblemTagVector>): Problem {
	return {
		problemId: "p1",
		rawText,
		cleanedText: rawText,
		sourceType: "document",
		sourceDocumentId: "doc-1",
		sourcePageNumber: 1,
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

function makeTeacherTemplate(overrides: Partial<CognitiveTemplate> = {}): CognitiveTemplate {
	return {
		id: overrides.id ?? "teacher-derived-precedence",
		patternConfig: overrides.patternConfig ?? {
			textPatterns: ["interpret the graph"],
			structuralPatterns: [],
			regexPatterns: [],
			minConfidence: 0.9,
		},
		bloom: overrides.bloom ?? { analyze: 0.9 },
		stepHints: overrides.stepHints,
		multiStepBoost: overrides.multiStepBoost,
	};
}

describe("teacher template precedence", () => {
	it("prefers strong teacher matches over strong system matches", () => {
		const problem = makeProblem("Interpret the graph and explain the result.", { representation: "graph", representationCount: 1, steps: 2 });
		const matches = getPrioritizedTemplateMatches(problem, genericTemplates, [makeTeacherTemplate()]);

		expect(matches[0]?.source).toBe("teacher");
	});

	it("prefers strong system matches over teacher best guesses", () => {
		const problem = makeProblem("Interpret the graph and explain the result.", { representation: "graph", representationCount: 1, steps: 2 });
		const matches = getPrioritizedTemplateMatches(problem, genericTemplates, [makeTeacherTemplate({
			patternConfig: {
				textPatterns: ["loosely related phrase"],
				structuralPatterns: [],
				regexPatterns: [],
				minConfidence: 0.95,
			},
		})]);

		expect(matches[0]?.source).toBe("system");
		expect(matches[0]?.template.id).toBe("interpretation");
	});
});