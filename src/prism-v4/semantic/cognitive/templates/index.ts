import type { Problem } from "../../../schema/domain";
import type { CognitiveProfile } from "../../../schema/semantic";
import { clamp01 } from "../../utils/heuristics";
import { detectRepresentationSignals } from "../../utils/representationCues";
import { loadSeededTemplates, toRuntimeTemplate, type CognitiveTemplate, type TemplateSubject } from "./loadTemplates";

export type { CognitiveTemplate, SeededCognitiveTemplate, TemplateSubject } from "./loadTemplates";

export interface TemplateMatchResult {
	template: CognitiveTemplate;
	confidence: number;
	passesThreshold: boolean;
	isBestGuess: boolean;
}

const runtimeTemplates = loadSeededTemplates().map(toRuntimeTemplate);

const genericOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "generic");
const mathOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "math");
const statsOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "statistics");
const elaOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "reading");
const scienceOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "science");
const historyOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "socialstudies");

export const genericTemplates = genericOnlyTemplates;
export const mathTemplates = [...genericOnlyTemplates, ...mathOnlyTemplates, ...statsOnlyTemplates];
export const statsTemplates = [...genericOnlyTemplates, ...statsOnlyTemplates];
export const elaTemplates = [...genericOnlyTemplates, ...elaOnlyTemplates];
export const scienceTemplates = [...genericOnlyTemplates, ...scienceOnlyTemplates];
export const historyTemplates = [...genericOnlyTemplates, ...historyOnlyTemplates];
export const cognitiveTemplates: CognitiveTemplate[] = runtimeTemplates;

function problemText(problem: Problem) {
	return `${problem.stemText ?? ""}\n${problem.partText ?? ""}\n${problem.cleanedText ?? problem.rawText}`;
}

function lowerProblemText(problem: Problem) {
	return problemText(problem).toLowerCase();
}

function weightedAverage(entries: Array<{ value: number; weight: number }>) {
	if (entries.length === 0) {
		return 0;
	}

	const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
	if (totalWeight <= 0) {
		return 0;
	}

	return entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

function scoreTextPatterns(text: string, patterns: string[]) {
	if (patterns.length === 0) {
		return undefined;
	}

	const hits = patterns.filter((pattern) => text.includes(pattern.toLowerCase())).length;
	return hits / patterns.length;
}

function scoreRegexPatterns(text: string, patterns: string[]) {
	if (patterns.length === 0) {
		return undefined;
	}

	const hits = patterns.filter((pattern) => {
		try {
			return new RegExp(pattern, "i").test(text);
		} catch {
			return false;
		}
	}).length;

	return hits / patterns.length;
}

function getStructuralFlags(problem: Problem) {
	const text = problemText(problem);
	const signals = detectRepresentationSignals({
		text,
		hasExtractedTable: problem.tags?.representation === "table",
	});
	const problemType = problem.tags?.problemType ?? {};
	const representation = problem.tags?.representation ?? signals.representation;
	const representationCount = problem.tags?.representationCount ?? signals.representationCount;

	return {
		hasEquation: representation === "equation" || signals.cues.equation,
		hasGraph: representation === "graph" || signals.cues.graph,
		hasTable: representation === "table" || signals.cues.table,
		hasDiagram: representation === "diagram" || signals.cues.diagram,
		hasMap: representation === "map" || signals.cues.map,
		hasTimeline: representation === "timeline" || signals.cues.timeline,
		hasExperiment: representation === "experiment" || signals.cues.experiment,
		hasSourceExcerpt: representation === "primarySource" || signals.cues.primarySource,
		hasPassage: signals.cues.primarySource,
		hasCodeLikeContent: signals.cues.codeLike,
		multiRepresentation: representationCount > 1,
		constructedResponse: Boolean(problemType.constructedResponse || problemType.shortAnswer),
		multipart: (problem.partIndex ?? 0) > 0,
	};
}

function countActiveRepresentationFlags(structuralFlags: ReturnType<typeof getStructuralFlags>) {
	return [
		structuralFlags.hasEquation,
		structuralFlags.hasGraph,
		structuralFlags.hasTable,
		structuralFlags.hasDiagram,
		structuralFlags.hasMap,
		structuralFlags.hasTimeline,
		structuralFlags.hasExperiment,
		structuralFlags.hasSourceExcerpt,
	].filter(Boolean).length;
}

function getArchetypeBonus(template: CognitiveTemplate, structuralFlags: ReturnType<typeof getStructuralFlags>) {
	if (template.archetypeKey !== "multi-representation-synthesis") {
		return 0;
	}

	const representationKinds = countActiveRepresentationFlags(structuralFlags);
	if (!structuralFlags.multiRepresentation || representationKinds < 2) {
		return 0;
	}

	return structuralFlags.constructedResponse ? 0.6 : 0.48;
}

function scoreTemplate(problem: Problem, template: CognitiveTemplate): TemplateMatchResult | null {
	if (template.match) {
		if (!template.match(problem)) {
			return null;
		}

		return {
			template,
			confidence: 1,
			passesThreshold: true,
			isBestGuess: false,
		};
	}

	if (!template.patternConfig) {
		return null;
	}

	const text = lowerProblemText(problem);
	const structuralFlags = getStructuralFlags(problem);
	const textScore = scoreTextPatterns(text, template.patternConfig.textPatterns);
	const structuralScore = template.patternConfig.structuralPatterns.length > 0
		? template.patternConfig.structuralPatterns.filter((flag) => structuralFlags[flag as keyof typeof structuralFlags]).length / template.patternConfig.structuralPatterns.length
		: undefined;
	const regexScore = scoreRegexPatterns(problemText(problem), template.patternConfig.regexPatterns ?? []);
	const confidence = clamp01(weightedAverage([
		...(typeof textScore === "number" ? [{ value: textScore, weight: 0.55 }] : []),
		...(typeof structuralScore === "number" ? [{ value: structuralScore, weight: 0.3 }] : []),
		...(typeof regexScore === "number" ? [{ value: regexScore, weight: 0.15 }] : []),
	]) + getArchetypeBonus(template, structuralFlags));

	if (confidence <= 0) {
		return null;
	}

	return {
		template,
		confidence,
		passesThreshold: confidence >= (template.minConfidence ?? template.patternConfig.minConfidence),
		isBestGuess: false,
	};
}

export function pickTemplatesForSubject(subject: string): CognitiveTemplate[] {
	switch (subject) {
		case "math":
			return mathTemplates;
		case "reading":
			return elaTemplates;
		case "science":
			return scienceTemplates;
		case "socialstudies":
			return historyTemplates;
		default:
			return genericTemplates;
	}
}

export function getTemplateMatches(
	problem: Problem,
	templates: CognitiveTemplate[] = cognitiveTemplates,
): TemplateMatchResult[] {
	const scored = templates
		.map((template) => scoreTemplate(problem, template))
		.filter((result): result is TemplateMatchResult => result !== null)
		.sort((left, right) => right.confidence - left.confidence);

	const strongHits = scored.filter((result) => result.passesThreshold);
	if (strongHits.length > 0) {
		return strongHits;
	}

	const bestGuess = scored[0];
	if (!bestGuess) {
		return [];
	}

	return [{
		...bestGuess,
		isBestGuess: true,
	}];
}

export function getMatchedTemplates(
	problem: Problem,
	templates: CognitiveTemplate[] = cognitiveTemplates,
): CognitiveTemplate[] {
	return getTemplateMatches(problem, templates).map((result) => result.template);
}

export function applyTemplates(
	problem: Problem,
	templates: CognitiveTemplate[] = cognitiveTemplates,
): Partial<CognitiveProfile> {
	const matched = getTemplateMatches(problem, templates);
	const bloom: Partial<CognitiveProfile["bloom"]> = {};

	for (const match of matched) {
		const scale = match.confidence * (match.isBestGuess ? 0.6 : 1);
		for (const [level, score] of Object.entries(match.template.bloom)) {
			const key = level as keyof CognitiveProfile["bloom"];
			bloom[key] = clamp01((bloom[key] ?? 0) + (score ?? 0) * scale);
		}
	}

	return {
		bloom,
		difficulty: clamp01(matched.reduce((total, match) => total + (match.template.difficultyBoost ?? 0) * match.confidence * (match.isBestGuess ? 0.6 : 1), 0)),
		multiStep: clamp01(matched.reduce((total, match) => total + (match.template.multiStepBoost ?? 0) * match.confidence * (match.isBestGuess ? 0.6 : 1), 0)),
		misconceptionRisk: clamp01(matched.reduce((total, match) => total + (match.template.misconceptionRiskBoost ?? 0) * match.confidence * (match.isBestGuess ? 0.6 : 1), 0)),
	};
}