import type { CognitiveProfile, ProblemTagVector } from "../../schema/semantic";
import { clamp01 } from "../utils/heuristics";
import { fusionConfig, type FusionWeights } from "./fusionConfig";

export type AzureTags = Pick<ProblemTagVector, "abstractionLevel" | "bloom" | "difficulty" | "linguisticLoad" | "multiStep">;
export type InternalStepType = "procedural" | "conceptual" | "interpretive" | "mixed" | "definition" | "code-interpretation";
export type InternalStepSource = "template" | "structural" | "blended" | "fallback";

export interface StructuralStepReasoning {
	structuralStepEstimate?: number;
	extractedSteps?: number;
	representationCount?: number;
	directiveCount?: number;
	isMultipartParent?: boolean;
	isMultipartChild?: boolean;
}

export interface TemplateStepReasoning {
	templateExpectedSteps?: number;
	templateConfidence?: number;
	templateIsBestGuess?: boolean;
	stepType?: InternalStepType;
	templateId?: string;
	templateSource?: "subject" | "teacher";
}

export interface InternalProblemReasoning extends StructuralStepReasoning, TemplateStepReasoning {
	expectedSteps: number;
	stepSource: InternalStepSource;
}

export interface StructuralCognitionInput extends Partial<CognitiveProfile> {
	reasoning?: StructuralStepReasoning;
}

export interface TemplateCognitionInput extends Partial<CognitiveProfile> {
	reasoning?: TemplateStepReasoning;
}

export interface ExpectedStepFusion {
	expectedSteps: number;
	stepSource: InternalStepSource;
	stepType?: TemplateStepReasoning["stepType"];
	structuralStepEstimate: number;
	templateExpectedSteps?: number;
	templateConfidence?: number;
	templateIsBestGuess?: boolean;
	templateId?: string;
	templateSource?: "subject" | "teacher";
}

function clampStepCount(value: number) {
	return Math.min(6, Math.max(1, value));
}

function normalizeExpectedSteps(value: number | undefined) {
	if (typeof value !== "number") {
		return undefined;
	}

	return clamp01((clampStepCount(value) - 1) / 5);
}

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

export function fuseExpectedSteps(
	structural: StructuralCognitionInput,
	template: TemplateCognitionInput,
): ExpectedStepFusion {
	const structuralStepEstimate = clampStepCount(structural.reasoning?.structuralStepEstimate ?? 1);
	const templateExpectedSteps = template.reasoning?.templateExpectedSteps;
	const templateConfidence = clamp01(template.reasoning?.templateConfidence ?? 0);
	const templateIsBestGuess = template.reasoning?.templateIsBestGuess ?? false;

	if (typeof templateExpectedSteps !== "number" || templateConfidence <= 0) {
		return {
			expectedSteps: Math.round(structuralStepEstimate),
			stepSource: "fallback",
			stepType: template.reasoning?.stepType,
			structuralStepEstimate,
		};
	}

	const influence = templateIsBestGuess ? templateConfidence * 0.4 : templateConfidence;
	const blended = clampStepCount(templateExpectedSteps * influence + structuralStepEstimate * (1 - influence));
	const expectedSteps = Math.round(blended);
	const stepSource = templateConfidence >= 0.85 && !templateIsBestGuess ? "template" : "blended";

	return {
		expectedSteps,
		stepSource,
		stepType: template.reasoning?.stepType,
		structuralStepEstimate,
		templateExpectedSteps,
		templateConfidence,
		templateIsBestGuess,
		templateId: template.reasoning?.templateId,
		templateSource: template.reasoning?.templateSource,
	};
}

export function buildInternalProblemReasoning(
	structural: StructuralCognitionInput,
	template: TemplateCognitionInput,
): InternalProblemReasoning {
	const fused = fuseExpectedSteps(structural, template);

	return {
		...structural.reasoning,
		...template.reasoning,
		expectedSteps: fused.expectedSteps,
		stepSource: fused.stepSource,
		structuralStepEstimate: fused.structuralStepEstimate,
		templateExpectedSteps: fused.templateExpectedSteps,
		templateConfidence: fused.templateConfidence,
		templateId: fused.templateId,
		templateSource: fused.templateSource,
		templateIsBestGuess: fused.templateIsBestGuess,
		stepType: fused.stepType,
	};
}

export function fuseCognition(
	azure: AzureTags,
	structural: StructuralCognitionInput,
	template: TemplateCognitionInput,
	weights: FusionWeights = fusionConfig,
): CognitiveProfile {
	const bloom = fuseBloom(azure.bloom, structural.bloom, template.bloom, weights.bloom);
	const fusedSteps = fuseExpectedSteps(structural, template);
	const structuralStepSignal = normalizeExpectedSteps(structural.reasoning?.structuralStepEstimate);
	const templateStepSignal = normalizeExpectedSteps(template.reasoning?.templateExpectedSteps);
	const fusedStepSignal = normalizeExpectedSteps(fusedSteps.expectedSteps) ?? 0;
	const structuralMultiStep = Math.max(structural.multiStep ?? 0, (structuralStepSignal ?? 0) * 0.6);
	const templateStepBoost = typeof templateStepSignal === "number"
		? templateStepSignal * (template.reasoning?.templateIsBestGuess ? 0.25 : 0.5)
		: undefined;
	const templateMultiStep = typeof template.multiStep === "number" || typeof templateStepBoost === "number"
		? Math.max(template.multiStep ?? 0, templateStepBoost ?? 0)
		: undefined;
	const weightedMultiStep = weighted(azure.multiStep, structuralMultiStep, templateMultiStep, {
		azure: weights.multistep.extracted,
		structural: weights.multistep.structural,
		template: weights.multistep.template,
	});

	return {
		bloom,
		difficulty: weighted(azure.difficulty, structural.difficulty, template.difficulty, weights.difficulty),
		linguisticLoad: clamp01(azure.linguisticLoad),
		abstractionLevel: clamp01(azure.abstractionLevel),
		multiStep: clamp01(Math.max(weightedMultiStep, fusedStepSignal * 0.4)),
		representationComplexity: clamp01(structural.representationComplexity ?? 0),
		misconceptionRisk: clamp01(template.misconceptionRisk ?? 0),
	};
}