import { describe, expect, it } from "vitest";

import type { DocumentSemanticInsights, ProblemTagVector } from "../../../schema/semantic";
import { generateNarrative } from "../generateNarrative";
import { NarrativeTheme } from "../themes";

function buildProblemVector(): ProblemTagVector {
	return {
		subject: "math",
		domain: "algebra.linear",
		concepts: { "algebra.linear": 1, "graph.interpretation": 0.8 },
		problemType: { constructedResponse: 1 },
		multiStep: 0.7,
		steps: 3,
		representation: "graph",
		representationCount: 2,
		linguisticLoad: 0.4,
		vocabularyTier: 2,
		sentenceComplexity: 0.3,
		wordProblem: 1,
		passiveVoice: 0,
		abstractLanguage: 0.1,
		bloom: { remember: 0, understand: 0.1, apply: 0.4, analyze: 0.5, evaluate: 0, create: 0 },
		difficulty: 0.6,
		distractorDensity: 0,
		abstractionLevel: 0.4,
		misconceptionTriggers: { "graph-misread": 0.9 },
		frustrationRisk: 0.3,
		engagementPotential: 0.6,
		standards: { "ccss.math.content": 1 },
		reasoning: {
			azureBloom: { remember: 0, understand: 0.2, apply: 0.5, analyze: 0.3, evaluate: 0, create: 0 },
			structuralBloom: { analyze: 0.4 },
			templateIds: ["teacher-should-not-appear"],
			teacherTemplateIds: ["teacher-template-hidden"],
			overridesApplied: false,
			structuralMultiStep: 0.7,
		},
		cognitive: {
			bloom: { remember: 0, understand: 0.1, apply: 0.4, analyze: 0.5, evaluate: 0, create: 0 },
			difficulty: 0.6,
			linguisticLoad: 0.4,
			abstractionLevel: 0.4,
			multiStep: 0.7,
			representationComplexity: 0.5,
			misconceptionRisk: 0.5,
		},
	};
}

function buildDocumentSummary(): DocumentSemanticInsights {
	return {
		documentId: "doc-1",
		title: "Linear reasoning",
		rawText: "Interpret the graph and explain the relationship.",
		sections: [],
		problems: [],
		documentConcepts: { "algebra.linear": 1, "graph.interpretation": 0.9 },
		documentStandards: { "ccss.math.content": 1 },
		semantics: { concepts: ["algebra.linear", "graph.interpretation"] },
	};
}

describe("generateNarrative", () => {
	it("returns plain-language teacher-facing narrative without ids or metrics", () => {
		const narrative = generateNarrative(NarrativeTheme.WhyThisInterpretation, buildProblemVector(), buildDocumentSummary());

		expect(narrative).toContain("The system interpreted this problem");
		expect(narrative).not.toMatch(/teacher-should-not-appear|teacher-template-hidden/);
		expect(narrative).not.toMatch(/\b0\.?\d*\b|\b1\.?\d*\b|\b2\.?\d*\b|\b3\.?\d*\b/);
	});
});