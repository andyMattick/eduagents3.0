import { afterEach, describe, expect, it, vi } from "vitest";

const { callGeminiMock } = vi.hoisted(() => ({
	callGeminiMock: vi.fn(),
}));

vi.mock("../../lib/llm", () => ({
	callLLM: callGeminiMock,
}));

import narrateProblemHandler from "../../api/v4/narrate-problem";

function createResponse() {
	const res: any = {};
	res.headers = {};
	res.setHeader = vi.fn().mockImplementation((key: string, value: string) => {
		res.headers[key] = value;
	});
	res.status = vi.fn().mockImplementation((code: number) => {
		res.statusCode = code;
		return res;
	});
	res.json = vi.fn().mockImplementation((body: unknown) => {
		res.body = body;
		return res;
	});
	return res;
}

function buildSemanticFingerprint() {
	return {
		subject: "math",
		domain: "proportional_reasoning",
		concepts: { unit_rate: 1 },
		problemType: {},
		multiStep: 0.4,
		steps: 2,
		representation: "paragraph",
		representationCount: 1,
		linguisticLoad: 0.2,
		vocabularyTier: 1,
		sentenceComplexity: 0.2,
		wordProblem: 1,
		passiveVoice: 0,
		abstractLanguage: 0.1,
		bloom: { remember: 0.1, understand: 0.2, apply: 0.7, analyze: 0, evaluate: 0, create: 0 },
		difficulty: 0.35,
		distractorDensity: 0,
		abstractionLevel: 0.2,
		misconceptionTriggers: { additive_reasoning: 0.8 },
		frustrationRisk: 0.2,
		engagementPotential: 0.5,
		cognitive: {
			bloom: { remember: 0.1, understand: 0.2, apply: 0.7, analyze: 0, evaluate: 0, create: 0 },
			difficulty: 0.35,
			linguisticLoad: 0.2,
			abstractionLevel: 0.2,
			multiStep: 0.4,
			representationComplexity: 0.2,
			misconceptionRisk: 0.5,
		},
		reasoning: {
			azureBloom: { remember: 0.1, understand: 0.2, apply: 0.7, analyze: 0, evaluate: 0, create: 0 },
			structuralBloom: { apply: 0.5 },
			templateIds: ["rate-problem"],
			teacherTemplateIds: [],
			overridesApplied: false,
			expectedSteps: 2,
		},
	};
}

describe("narrate problem route", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns lens-filtered blocks and narrative", async () => {
		callGeminiMock.mockResolvedValue(JSON.stringify({
			taskEssence: {
				summary: "determine the unit rate from a proportional relationship and extend it to a new quantity",
				evidence: "Sarah buys 3 notebooks for $7.50. How much would 5 notebooks cost at the same rate?",
			},
			likelyMisconceptions: [
				{
					misconception: "distinguishing between additive and multiplicative reasoning",
					trigger: "students scale from 3 to 5 by adding instead of using the unit rate",
					howToNotice: "they add a flat amount instead of finding the cost of one notebook",
				},
			],
			teacherVoiceNarrative: "Students often struggle with distinguishing between additive and multiplicative reasoning, especially when they scale from 3 to 5 by adding instead of using the unit rate.",
		}));

		const req: any = {
			method: "POST",
			body: {
				problemId: "doc-1::p1",
				problemText: "Sarah buys 3 notebooks for $7.50. How much would 5 notebooks cost at the same rate?",
				semanticFingerprint: buildSemanticFingerprint(),
				lens: "where-students-struggle",
				subject: "math",
				gradeLevel: "6",
			},
		};
		const res = createResponse();

		await narrateProblemHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.body.lens).toBe("where-students-struggle");
		expect(Array.isArray(res.body.blocks?.likelyMisconceptions)).toBe(true);
		expect(res.body.blocks.likelyMisconceptions).toHaveLength(1);
		expect(res.body.blocks.likelyMisconceptions[0]).toHaveProperty("misconception");
		expect(res.body.blocks.likelyMisconceptions[0]).toHaveProperty("trigger");
		expect(res.body.blocks.likelyMisconceptions[0]).toHaveProperty("howToNotice");
		expect(res.body.narrative).toContain("Students often struggle");
	});

	it("falls back to semantic composition when the LLM output is malformed", async () => {
		callGeminiMock.mockResolvedValue("not-json");

		const req: any = {
			method: "POST",
			body: {
				problemText: "Sarah buys 3 notebooks for $7.50. How much would 5 notebooks cost at the same rate?",
				semanticFingerprint: buildSemanticFingerprint(),
				lens: "how-to-scaffold",
				subject: "math",
			},
		};
		const res = createResponse();

		await narrateProblemHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.body.blocks.instructionalLevers).toHaveLength(1);
		expect(res.body.narrative).toContain("A helpful move is to");
	});
});