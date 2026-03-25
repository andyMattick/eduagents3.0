import type { Problem } from "../../../schema/domain";
import type { CognitiveProfile } from "../../../schema/semantic";
import templatesData from "./templates.json";

export type TemplateSubject = "generic" | "math" | "statistics" | "reading" | "science" | "socialstudies";

export interface TemplatePatternConfig {
	textPatterns: string[];
	structuralPatterns: string[];
	regexPatterns?: string[];
	minConfidence: number;
}

export interface TemplateStepHints {
	expectedSteps: number;
	stepType: "procedural" | "conceptual" | "interpretive" | "mixed" | "definition" | "code-interpretation";
}

export interface SeededCognitiveTemplate {
	id: string;
	subject: TemplateSubject;
	name: string;
	archetypeKey: string;
	description: string;
	patternConfig: TemplatePatternConfig;
	boosts: {
		bloom: CognitiveProfile["bloom"];
		multiStepBoost: number;
		difficultyBoost: number;
		misconceptionRiskBoost?: number;
	};
	stepHints?: TemplateStepHints;
	meta: {
		version: number;
		createdBy: string;
		createdAt: string;
	};
}

export interface CognitiveTemplate {
	id: string;
	subject?: TemplateSubject | string;
	name?: string;
	archetypeKey?: string;
	description?: string;
	patternConfig?: TemplatePatternConfig;
	stepHints?: TemplateStepHints;
	bloom: Partial<CognitiveProfile["bloom"]>;
	difficultyBoost?: number;
	multiStepBoost?: number;
	misconceptionRiskBoost?: number;
	minConfidence?: number;
	learningAdjustment?: {
		confidenceDelta?: number;
		frozen?: boolean;
		learnedExpectedSteps?: number;
		learnedStepType?: TemplateStepHints["stepType"];
	};
	match?: (problem: Problem) => boolean;
}

export function loadSeededTemplates(): SeededCognitiveTemplate[] {
	return templatesData as SeededCognitiveTemplate[];
}

export function toRuntimeTemplate(template: SeededCognitiveTemplate): CognitiveTemplate {
	return {
		id: template.id,
		subject: template.subject,
		name: template.name,
		archetypeKey: template.archetypeKey,
		description: template.description,
		patternConfig: template.patternConfig,
		stepHints: template.stepHints,
		bloom: template.boosts.bloom,
		difficultyBoost: template.boosts.difficultyBoost,
		multiStepBoost: template.boosts.multiStepBoost,
		misconceptionRiskBoost: template.boosts.misconceptionRiskBoost,
		minConfidence: template.patternConfig.minConfidence,
	};
}