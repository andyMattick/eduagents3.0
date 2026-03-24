import type { CognitiveProfile, ProblemTagVector } from "../../schema/semantic";
import { clamp01 } from "../utils/heuristics";
import { fusionConfig, type FusionWeights } from "./fusionConfig";

export type AzureTags = Pick<ProblemTagVector, "abstractionLevel" | "bloom" | "difficulty" | "linguisticLoad" | "multiStep">;

function weighted(
	azureValue: number | undefined,
	structuralValue: number | undefined,
	templateValue: number | undefined,
	weights: { azure: number; structural: number; template: number },
) {
	const entries = [
		{ value: azureValue, weight: weights.azure },
		{ value: structuralValue, weight: weights.structural },
		{ value: templateValue, weight: weights.template },
	].filter((entry): entry is { value: number; weight: number } => typeof entry.value === "number");

	if (entries.length === 0) {
		return 0;
	}

	const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
	if (totalWeight <= 0) {
		return 0;
	}

	return clamp01(entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight);
}

function weightedBloom(
	azureValue: number | undefined,
	structuralValue: number | undefined,
	templateValue: number | undefined,
	weights: { azure: number; structural: number; template: number },
) {
	const azureScore = azureValue ?? 0;
	const structuralScore = structuralValue ?? 0;
	const templateScore = templateValue ?? 0;
	const totalWeight = weights.azure + weights.structural + weights.template;

	if (totalWeight <= 0) {
		return 0;
	}

	return clamp01(
		(azureScore * weights.azure + structuralScore * weights.structural + templateScore * weights.template) / totalWeight,
	);
}

function fuseBloom(
	azureBloom: CognitiveProfile["bloom"],
	structuralBloom: Partial<CognitiveProfile["bloom"]> | undefined,
	templateBloom: Partial<CognitiveProfile["bloom"]> | undefined,
	weights: { azure: number; structural: number; template: number },
): CognitiveProfile["bloom"] {
	return {
		remember: weightedBloom(azureBloom.remember, structuralBloom?.remember, templateBloom?.remember, weights),
		understand: weightedBloom(azureBloom.understand, structuralBloom?.understand, templateBloom?.understand, weights),
		apply: weightedBloom(azureBloom.apply, structuralBloom?.apply, templateBloom?.apply, weights),
		analyze: weightedBloom(azureBloom.analyze, structuralBloom?.analyze, templateBloom?.analyze, weights),
		evaluate: weightedBloom(azureBloom.evaluate, structuralBloom?.evaluate, templateBloom?.evaluate, weights),
		create: weightedBloom(azureBloom.create, structuralBloom?.create, templateBloom?.create, weights),
	};
}

export function fuseCognition(
	azure: AzureTags,
	structural: Partial<CognitiveProfile>,
	template: Partial<CognitiveProfile>,
	weights: FusionWeights = fusionConfig,
): CognitiveProfile {
	const bloom = fuseBloom(azure.bloom, structural.bloom, template.bloom, weights.bloom);

	return {
		bloom,
		difficulty: weighted(azure.difficulty, structural.difficulty, template.difficulty, weights.difficulty),
		linguisticLoad: clamp01(azure.linguisticLoad),
		abstractionLevel: clamp01(azure.abstractionLevel),
		multiStep: weighted(azure.multiStep, structural.multiStep, template.multiStep, {
			azure: weights.multistep.extracted,
			structural: weights.multistep.structural,
			template: weights.multistep.template,
		}),
		representationComplexity: clamp01(structural.representationComplexity ?? 0),
		misconceptionRisk: clamp01(template.misconceptionRisk ?? 0),
	};
}