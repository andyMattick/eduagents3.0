import { describe, expect, it } from "vitest";

import type { CognitiveProfile } from "../../../schema/semantic";
import { fuseCognition, fuseExpectedSteps, type AzureTags } from "../fuseCognition";
import type { FusionWeights } from "../fusionConfig";

describe("fuseCognition", () => {
	it("lets structural and template signals override a flat Azure bloom", () => {
		const azure: AzureTags = {
			bloom: { remember: 0.8, understand: 0.2, apply: 0, analyze: 0, evaluate: 0, create: 0 },
			difficulty: 0.2,
			linguisticLoad: 0.3,
			abstractionLevel: 0.2,
			multiStep: 0.1,
		};
		const structural: Partial<CognitiveProfile> = {
			bloom: { apply: 0.5, analyze: 0.4 },
			multiStep: 0.5,
			representationComplexity: 0.6,
		};
		const template: Partial<CognitiveProfile> = {
			bloom: { analyze: 0.6, evaluate: 0.2 },
			difficulty: 0.4,
			misconceptionRisk: 0.3,
		};

		const fused = fuseCognition(azure, structural, template);

		expect(fused.bloom.analyze).toBeGreaterThan(fused.bloom.remember);
	});

	it("preserves structural multi-step influence on apply and analyze", () => {
		const azure: AzureTags = {
			bloom: { remember: 0.2, understand: 0.2, apply: 0.2, analyze: 0.1, evaluate: 0, create: 0 },
			difficulty: 0.3,
			linguisticLoad: 0.2,
			abstractionLevel: 0.2,
			multiStep: 0.2,
		};
		const fused = fuseCognition(
			azure,
			{
				bloom: { apply: 0.6, analyze: 0.4 },
				multiStep: 0.7,
				representationComplexity: 0.2,
			},
			{},
		);

		expect(fused.multiStep).toBeGreaterThan(0.35);
		expect(fused.bloom.apply).toBeGreaterThanOrEqual(fused.bloom.understand);
	});

	it("carries template misconception risk boosts into the fused profile", () => {
		const azure: AzureTags = {
			bloom: { remember: 0.1, understand: 0.4, apply: 0.2, analyze: 0.1, evaluate: 0, create: 0 },
			difficulty: 0.3,
			linguisticLoad: 0.2,
			abstractionLevel: 0.2,
			multiStep: 0.1,
		};

		const fused = fuseCognition(
			azure,
			{ multiStep: 0.1, representationComplexity: 0.2 },
			{ misconceptionRisk: 0.45 },
		);

		expect(fused.misconceptionRisk).toBeCloseTo(0.45, 5);
	});

	it("blends extracted and structural multistep instead of using structural only", () => {
		const azure: AzureTags = {
			bloom: { remember: 0.1, understand: 0.3, apply: 0.2, analyze: 0.1, evaluate: 0, create: 0 },
			difficulty: 0.25,
			linguisticLoad: 0.2,
			abstractionLevel: 0.2,
			multiStep: 0.7,
		};

		const fused = fuseCognition(
			azure,
			{ multiStep: 0.1, representationComplexity: 0.2 },
			{},
		);

		expect(fused.multiStep).toBeGreaterThan(0.3);
		expect(fused.multiStep).toBeLessThan(0.7);
	});

	it("respects caller-provided fusion weights", () => {
		const azure: AzureTags = {
			bloom: { remember: 0.1, understand: 0.3, apply: 0.2, analyze: 0.1, evaluate: 0, create: 0 },
			difficulty: 0.25,
			linguisticLoad: 0.2,
			abstractionLevel: 0.2,
			multiStep: 0.8,
		};
		const structural: Partial<CognitiveProfile> = { multiStep: 0.1, representationComplexity: 0.2 };
		const template: Partial<CognitiveProfile> = { multiStep: 0.2 };
		const structuralHeavy: FusionWeights = {
			bloom: { azure: 0.3, structural: 0.25, template: 0.45 },
			difficulty: { azure: 0.5, structural: 0.2, template: 0.3 },
			multistep: { extracted: 0.1, structural: 0.8, template: 0.1 },
		};
		const extractedHeavy: FusionWeights = {
			bloom: { azure: 0.3, structural: 0.25, template: 0.45 },
			difficulty: { azure: 0.5, structural: 0.2, template: 0.3 },
			multistep: { extracted: 0.8, structural: 0.1, template: 0.1 },
		};

		const structuralWeighted = fuseCognition(azure, structural, template, structuralHeavy);
		const extractedWeighted = fuseCognition(azure, structural, template, extractedHeavy);

		expect(extractedWeighted.multiStep).toBeGreaterThan(structuralWeighted.multiStep);
	});

	it("blends expected step counts and keeps them internal to reasoning", () => {
		const expected = fuseExpectedSteps(
			{ reasoning: { structuralStepEstimate: 3.2 } },
			{ reasoning: { templateExpectedSteps: 2, templateConfidence: 0.5, templateIsBestGuess: false, stepType: "conceptual" } },
		);

		expect(expected.expectedSteps).toBe(3);
		expect(expected.stepSource).toBe("blended");
	});

	it("downscales best-guess template influence when fusing expected steps", () => {
		const expected = fuseExpectedSteps(
			{ reasoning: { structuralStepEstimate: 4 } },
			{ reasoning: { templateExpectedSteps: 1, templateConfidence: 0.5, templateIsBestGuess: true, stepType: "definition" } },
		);

		expect(expected.expectedSteps).toBe(3);
		expect(expected.stepSource).toBe("blended");
	});
});