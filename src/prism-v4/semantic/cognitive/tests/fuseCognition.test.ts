import { describe, expect, it } from "vitest";

import type { CognitiveProfile } from "../../../schema/semantic";
import { fuseCognition, type AzureTags } from "../fuseCognition";

describe("fuseCognition", () => {
	it("lets structural and template signals override a flat Azure bloom", () => {
		const azure: AzureTags = {
			bloom: { remember: 0.8, understand: 0.2, apply: 0, analyze: 0, evaluate: 0, create: 0 },
			difficulty: 0.2,
			linguisticLoad: 0.3,
			abstractionLevel: 0.2,
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

		expect(fused.multiStep).toBeGreaterThan(0.5);
		expect(fused.bloom.apply).toBeGreaterThanOrEqual(fused.bloom.understand);
	});

	it("carries template misconception risk boosts into the fused profile", () => {
		const azure: AzureTags = {
			bloom: { remember: 0.1, understand: 0.4, apply: 0.2, analyze: 0.1, evaluate: 0, create: 0 },
			difficulty: 0.3,
			linguisticLoad: 0.2,
			abstractionLevel: 0.2,
		};

		const fused = fuseCognition(
			azure,
			{ multiStep: 0.1, representationComplexity: 0.2 },
			{ misconceptionRisk: 0.45 },
		);

		expect(fused.misconceptionRisk).toBeCloseTo(0.45, 5);
	});
});