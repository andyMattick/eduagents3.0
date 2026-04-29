import type { AdaptiveTargets } from "../documents/intents/adaptiveTargets";
import type { TestProduct } from "../schema/integration";
import type { ExtractedProblemDifficulty } from "../schema/semantic";
import { canonicalConceptId, classifyBloomLevel, classifyItemModes, classifyScenarioTypes, type BloomLevel, type ConceptProfile, type ItemMode, type ScenarioType } from "../teacherFeedback";
import type { ConceptRegistry } from "../normalizer";

import type { BuilderPlanModel } from "./InstructionalIntelligenceSession";

type AdaptiveTargetSummary = NonNullable<BuilderPlanModel["adaptiveTargets"]>;

function resolveConceptId(raw: string, registry?: ConceptRegistry): string {
	const trimmed = raw.trim();
	if (registry) {
		const normalized = trimmed.includes(".") ? trimmed.toLowerCase() : trimmed;
		if (registry.canonical.has(normalized)) return normalized;
		const mapped = registry.mapToCanonical.get(trimmed);
		if (mapped !== undefined) return mapped ?? canonicalConceptId(trimmed);
	}
	return canonicalConceptId(trimmed);
}

function uniqueValues<T>(values: T[]) {
	return [...new Set(values)];
}

function sortLevelsByFrequency(counts: Map<BloomLevel, number>) {
	return [...counts.entries()]
		.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
		.map(([level]) => level);
}

function summarizeAdaptiveTargets(args: {
	adaptiveTargets?: AdaptiveTargets | null;
	conceptProfiles: ConceptProfile[];
}): AdaptiveTargetSummary | undefined {
	const { adaptiveTargets, conceptProfiles } = args;
	if (!adaptiveTargets) {
		return undefined;
	}

	const conceptProfileById = new Map(conceptProfiles.map((profile) => [profile.conceptId, profile] as const));
	const boostedConcepts = Object.entries(adaptiveTargets.conceptQuotas)
		.filter(([conceptId, quota]) => quota > (conceptProfileById.get(conceptId)?.absoluteItemHint ?? 0))
		.map(([conceptId]) => conceptId)
		.sort((left, right) => left.localeCompare(right));
	const suppressedConcepts = Object.entries(adaptiveTargets.conceptQuotas)
		.filter(([conceptId, quota]) => quota < (conceptProfileById.get(conceptId)?.absoluteItemHint ?? 0))
		.map(([conceptId]) => conceptId)
		.sort((left, right) => left.localeCompare(right));

	const bloomCounts = new Map<BloomLevel, number>();
	for (const levels of Object.values(adaptiveTargets.bloomTargets)) {
		for (const level of levels) {
			bloomCounts.set(level, (bloomCounts.get(level) ?? 0) + 1);
		}
	}
	const boostedBloom = sortLevelsByFrequency(bloomCounts).slice(0, 3);
	const suppressedBloom = conceptProfiles
		.flatMap((profile) => Object.entries(profile.bloomDistribution).filter(([, count]) => count > 0).map(([level]) => level as BloomLevel))
		.filter((level) => !boostedBloom.includes(level));

	return {
		boostedConcepts,
		suppressedConcepts,
		boostedBloom,
		suppressedBloom: uniqueValues(suppressedBloom).slice(0, 3),
	};
}

function deriveMode(item: TestProduct["sections"][number]["items"][number]): ItemMode {
	if (item.explanation?.itemModes?.[0]) {
		return item.explanation.itemModes[0] as ItemMode;
	}
	return classifyItemModes(item.prompt)[0] ?? "explain";
}

function deriveScenario(item: TestProduct["sections"][number]["items"][number]): ScenarioType {
	if (item.explanation?.scenarioTypes?.[0]) {
		return item.explanation.scenarioTypes[0] as ScenarioType;
	}
	return classifyScenarioTypes(item.prompt)[0] ?? "abstract-symbolic";
}

function deriveBloom(item: TestProduct["sections"][number]["items"][number]): BloomLevel {
	if (item.explanation?.bloomLevel) {
		return item.explanation.bloomLevel as BloomLevel;
	}
	return classifyBloomLevel(item.prompt);
}

export function buildInstructionalBuilderPlan(args: {
	product: TestProduct;
	conceptProfiles?: ConceptProfile[];
	adaptiveTargets?: AdaptiveTargets | null;
	registry?: ConceptRegistry;
}): BuilderPlanModel {
	const conceptProfiles = args.conceptProfiles ?? [];
	const sections = args.product.sections.map((section) => {
		const conceptId = resolveConceptId(section.concept, args.registry);
		const conceptProfile = conceptProfiles.find((profile) => profile.conceptId === conceptId);
		return {
			conceptId,
			conceptName: conceptProfile?.displayName ?? section.concept,
			itemCount: section.items.length,
			bloomSequence: section.items.map((item) => deriveBloom(item)),
			difficultySequence: section.items.map((item) => item.complexityBand as ExtractedProblemDifficulty),
			modeSequence: section.items.map((item) => deriveMode(item)),
			scenarioSequence: section.items.map((item) => deriveScenario(item)),
		};
	});

	return {
		sections,
		adaptiveTargets: summarizeAdaptiveTargets({
			adaptiveTargets: args.adaptiveTargets,
			conceptProfiles,
		}),
	};
}