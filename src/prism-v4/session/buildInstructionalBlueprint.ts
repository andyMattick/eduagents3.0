import type { TestProduct } from "../schema/integration";
import type { ExtractedProblemDifficulty } from "../schema/semantic";
import {
	buildAssessmentFingerprint,
	canonicalConceptId,
	type AssessmentFingerprint,
	type BloomLevel,
	type ItemMode,
	type ScenarioType,
	type TeacherFingerprint,
} from "../teacherFeedback";

import type { BlueprintModel, ConceptMapModel, InstructionalAnalysis, TeacherFingerprintModel } from "./InstructionalIntelligenceSession";
import type { CountedBloom, CountedDifficulty, CountedMode, CountedScenario } from "./primitives";

const BLOOM_LEVELS: BloomLevel[] = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
const ITEM_MODES: ItemMode[] = ["identify", "state", "interpret", "compare", "apply", "analyze", "evaluate", "explain", "construct"];
const SCENARIO_TYPES: ScenarioType[] = ["real-world", "simulation", "data-table", "graphical", "abstract-symbolic"];
const DIFFICULTY_BANDS: ExtractedProblemDifficulty[] = ["low", "medium", "high"];

function uniqueValues<T>(values: T[]) {
	return [...new Set(values)];
}

function titleCase(value: string) {
	return value
		.split(/[-\s]+/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

function countArrayValues<T extends string>(values: T[], order: T[]) {
	const counts = values.reduce<Map<T, number>>((map, value) => {
		map.set(value, (map.get(value) ?? 0) + 1);
		return map;
	}, new Map<T, number>());

	return order.flatMap((value) => {
		const count = counts.get(value) ?? 0;
		return count > 0 ? [[value, count] as const] : [];
	});
}

function countRecordValues<T extends string>(record: Partial<Record<T, number>>, order: T[]) {
	return order.flatMap((value) => {
		const count = record[value] ?? 0;
		return count > 0 ? [[value, count] as const] : [];
	});
}

function orderedConceptProfiles(assessment: AssessmentFingerprint) {
	const profilesById = new Map(assessment.conceptProfiles.map((profile) => [profile.conceptId, profile] as const));
	const orderedIds = uniqueValues([...assessment.flowProfile.sectionOrder, ...assessment.conceptProfiles.map((profile) => profile.conceptId)]);
	return orderedIds.flatMap((conceptId) => {
		const profile = profilesById.get(conceptId);
		return profile ? [profile] : [];
	});
}

function createSingleBloomDistribution(level: BloomLevel) {
	return BLOOM_LEVELS.reduce<Record<BloomLevel, number>>((distribution, currentLevel) => {
		distribution[currentLevel] = currentLevel === level ? 1 : 0;
		return distribution;
	}, {
		remember: 0,
		understand: 0,
		apply: 0,
		analyze: 0,
		evaluate: 0,
		create: 0,
	});
}

function toCountedBloom(values: Array<readonly [BloomLevel, number]>): CountedBloom[] {
	return values.map(([level, count]) => ({ level, count }));
}

function toCountedMode(values: Array<readonly [ItemMode, number]>): CountedMode[] {
	return values.map(([mode, count]) => ({ mode, count }));
}

function toCountedScenario(values: Array<readonly [ScenarioType, number]>): CountedScenario[] {
	return values.map(([scenario, count]) => ({ scenario, count }));
}

function toCountedDifficulty(values: Array<readonly [ExtractedProblemDifficulty, number]>): CountedDifficulty[] {
	return values.map(([band, count]) => ({ band, count }));
}

function expandBloomPreferences(entries: CountedBloom[]) {
	return entries.flatMap((entry) => Array.from({ length: Math.max(0, Math.round(entry.count)) }, () => entry.level));
}

function sortModesByCount(entries: CountedMode[]) {
	return [...entries]
		.filter((entry) => entry.count > 0)
		.sort((left, right) => right.count - left.count || ITEM_MODES.indexOf(left.mode) - ITEM_MODES.indexOf(right.mode))
		.map((entry) => entry.mode);
}

function sortScenariosByCount(entries: CountedScenario[]) {
	return [...entries]
		.filter((entry) => entry.count > 0)
		.sort((left, right) => right.count - left.count || SCENARIO_TYPES.indexOf(left.scenario) - SCENARIO_TYPES.indexOf(right.scenario))
		.map((entry) => entry.scenario);
}

function difficultyCountsFromProduct(product?: TestProduct) {
	if (!product) {
		return [] as CountedDifficulty[];
	}

	const difficulties = product.sections.flatMap((section) => section.items.map((item) => item.difficulty));
	return toCountedDifficulty(countArrayValues(difficulties, DIFFICULTY_BANDS));
}

function sortAnalysisConcepts(analysis: InstructionalAnalysis) {
	return [...analysis.concepts]
		.filter((concept) => !concept.isNoise)
		.sort((left, right) =>
			Number(left.isNoise ?? false) - Number(right.isNoise ?? false)
			|| (right.overlapStrength ?? 0) - (left.overlapStrength ?? 0)
			|| (right.gapScore ?? 0) - (left.gapScore ?? 0)
			|| (right.score ?? 0) - (left.score ?? 0)
			|| right.problemCount - left.problemCount
			|| right.documentCount - left.documentCount
			|| left.concept.localeCompare(right.concept),
		);
}

function clampQuotaWeight(value: number) {
	return Number(Math.max(0.25, value).toFixed(4));
}

function computeConceptQuotaWeight(concept: InstructionalAnalysis["concepts"][number]) {
	return clampQuotaWeight(
		(concept.overlapStrength ?? 0) * 0.35
		+ (concept.gapScore ?? 0) * 0.3
		+ (concept.score ?? 0) * 0.2
		+ (concept.multipartPresence ?? 0) * 0.1
		+ (concept.groupCount ?? concept.problemCount) * 0.05,
	);
}

function distributeConceptQuotas(concepts: InstructionalAnalysis["concepts"], totalItems: number) {
	if (concepts.length === 0) {
		return [] as Array<{ concept: InstructionalAnalysis["concepts"][number]; quota: number; included: boolean }>;
	}

	const sorted = sortAnalysisConcepts({
		concepts,
		problems: [],
		misconceptions: [],
		bloomSummary: { remember: 0, understand: 0, apply: 0, analyze: 0, evaluate: 0, create: 0 },
		modeSummary: {},
		scenarioSummary: {},
		difficultySummary: { low: 0, medium: 0, high: 0, averageInstructionalDensity: 0 },
		domain: "",
	});
	const includedCount = Math.min(sorted.length, Math.max(1, totalItems));
	const included = sorted.slice(0, includedCount);
	const weights = included.map((concept) => ({ concept, weight: computeConceptQuotaWeight(concept) }));
	const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0) || included.length;
	const quotas = new Map<string, number>();
	let assigned = 0;

	for (const entry of weights) {
		const rawQuota = totalItems <= includedCount ? 1 : (entry.weight / totalWeight) * totalItems;
		const baseQuota = totalItems <= includedCount ? 1 : Math.max(1, Math.floor(rawQuota));
		quotas.set(entry.concept.concept, baseQuota);
		assigned += baseQuota;
	}

	if (assigned > totalItems) {
		for (const concept of [...included].reverse()) {
			if (assigned <= totalItems) {
				break;
			}
			const current = quotas.get(concept.concept) ?? 1;
			if (current > 1) {
				quotas.set(concept.concept, current - 1);
				assigned -= 1;
			}
		}
	}

	if (assigned < totalItems) {
		const rankedRemainders = weights
			.map((entry) => ({
				concept: entry.concept,
				remainder: totalItems <= includedCount ? 0 : ((entry.weight / totalWeight) * totalItems) - (quotas.get(entry.concept.concept) ?? 1),
			}))
			.sort((left, right) => right.remainder - left.remainder || (right.concept.overlapStrength ?? 0) - (left.concept.overlapStrength ?? 0));
		for (const entry of rankedRemainders) {
			if (assigned >= totalItems) {
				break;
			}
			quotas.set(entry.concept.concept, (quotas.get(entry.concept.concept) ?? 1) + 1);
			assigned += 1;
		}
	}

	return sorted.map((concept) => ({
		concept,
		quota: quotas.get(concept.concept) ?? 0,
		included: quotas.has(concept.concept),
	}));
}

export function buildInstructionalBlueprint(args: {
	assessment: AssessmentFingerprint;
	product?: TestProduct;
	analysis?: InstructionalAnalysis;
}): BlueprintModel {
	const orderedProfiles = orderedConceptProfiles(args.assessment);
	const bloomCounts = new Map<BloomLevel, number>();
	const requestedTotalItems = Math.max(
		1,
		args.product?.totalItemCount
			?? args.assessment.itemCount
			?? orderedProfiles.reduce((sum, profile) => sum + Math.max(1, profile.absoluteItemHint ?? 1), 0),
	);

	for (const profile of orderedProfiles) {
		const absoluteItemHint = Math.max(1, profile.absoluteItemHint ?? 1);
		for (const level of BLOOM_LEVELS) {
			const weightedCount = Math.round((profile.bloomDistribution[level] ?? 0) * absoluteItemHint);
			if (weightedCount > 0) {
				bloomCounts.set(level, (bloomCounts.get(level) ?? 0) + weightedCount);
			}
		}
		if (![...bloomCounts.keys()].includes(profile.maxBloomLevel)) {
			bloomCounts.set(profile.maxBloomLevel, (bloomCounts.get(profile.maxBloomLevel) ?? 0) + 1);
		}
	}

	const conceptBlueprints = args.analysis && args.analysis.concepts.length > 0
		? distributeConceptQuotas(args.analysis.concepts, requestedTotalItems).map(({ concept, quota, included }, index) => ({
			id: concept.concept,
			name: titleCase(concept.concept),
			order: index,
			included,
			quota,
			isNoise: concept.isNoise,
			score: concept.score,
			freqProblems: concept.problemCount,
			freqDocuments: concept.documentCount,
			groupCount: concept.groupCount,
			multipartPresence: concept.multipartPresence,
			overlapStrength: concept.overlapStrength,
			gapScore: concept.gapScore,
			coverageScore: concept.coverageScore,
			isCrossDocumentAnchor: concept.isCrossDocumentAnchor,
		}))
		: orderedProfiles.map((profile, index) => ({
			id: profile.conceptId,
			name: profile.displayName || titleCase(profile.conceptId),
			order: index,
			included: true,
			quota: Math.max(1, profile.absoluteItemHint ?? 1),
		}));

	const bloomLadder = args.analysis
		? toCountedBloom(countRecordValues(args.analysis.bloomSummary, BLOOM_LEVELS))
		: toCountedBloom(countRecordValues(Object.fromEntries(bloomCounts.entries()) as Partial<Record<BloomLevel, number>>, BLOOM_LEVELS));
	const modeMix = args.analysis && Object.keys(args.analysis.modeSummary).length > 0
		? toCountedMode(countRecordValues(args.analysis.modeSummary as Partial<Record<ItemMode, number>>, ITEM_MODES))
		: toCountedMode(countArrayValues(orderedProfiles.flatMap((profile) => profile.itemModes), ITEM_MODES));
	const scenarioMix = args.analysis && Object.keys(args.analysis.scenarioSummary).length > 0
		? toCountedScenario(countRecordValues(args.analysis.scenarioSummary as Partial<Record<ScenarioType, number>>, SCENARIO_TYPES))
		: toCountedScenario(countArrayValues(orderedProfiles.flatMap((profile) => profile.scenarioPatterns), SCENARIO_TYPES));
	return {
		concepts: conceptBlueprints,
		bloomLadder,
		difficultyRamp: difficultyCountsFromProduct(args.product),
		modeMix,
		scenarioMix,
	};
}

export function mergeBlueprintModel(current: BlueprintModel, patch: Partial<BlueprintModel>): BlueprintModel {
	return {
		concepts: patch.concepts ?? current.concepts,
		bloomLadder: patch.bloomLadder ?? current.bloomLadder,
		difficultyRamp: patch.difficultyRamp ?? current.difficultyRamp,
		modeMix: patch.modeMix ?? current.modeMix,
		scenarioMix: patch.scenarioMix ?? current.scenarioMix,
	};
}

export function buildAssessmentFingerprintFromBlueprint(args: {
	teacherId: string;
	assessmentId: string;
	product: TestProduct;
	blueprint: BlueprintModel;
	current?: AssessmentFingerprint | null;
	unitId?: string;
	now?: string;
}): AssessmentFingerprint {
	const now = args.now ?? new Date().toISOString();
	const base = args.current ?? buildAssessmentFingerprint({
		teacherId: args.teacherId,
		assessmentId: args.assessmentId,
		product: args.product,
		unitId: args.unitId,
		sourceType: "generated",
		now,
	});
	const existingProfiles = new Map(base.conceptProfiles.map((profile) => [profile.conceptId, profile] as const));
	const includedConcepts = [...args.blueprint.concepts]
		.filter((concept) => concept.included !== false)
		.sort((left, right) => left.order - right.order);
	const totalItems = includedConcepts.reduce((sum, concept) => sum + Math.max(1, Math.round(concept.quota)), 0);
	const expandedBloomLevels = expandBloomPreferences(args.blueprint.bloomLadder);
	const preferredModes = sortModesByCount(args.blueprint.modeMix);
	const preferredScenarios = sortScenariosByCount(args.blueprint.scenarioMix);

	const conceptProfiles = includedConcepts.map((concept, index) => {
		// Preserve taxonomy IDs as-is; only slugify if concept.id is absent (name-only fallback).
		const conceptId = concept.id ? concept.id : canonicalConceptId(concept.name);
		const existing = existingProfiles.get(conceptId);
		const assignedBloom = expandedBloomLevels[index] ?? existing?.maxBloomLevel ?? "understand";
		const absoluteItemHint = Math.max(1, Math.round(concept.quota));
		return {
			conceptId,
			displayName: concept.name,
			frequencyWeight: totalItems > 0 ? Number((absoluteItemHint / totalItems).toFixed(4)) : 0,
			absoluteItemHint,
			lowEmphasis: absoluteItemHint <= 1,
			bloomDistribution: createSingleBloomDistribution(assignedBloom),
			scenarioPatterns: preferredScenarios.length > 0
				? [preferredScenarios[index % preferredScenarios.length]]
				: (existing?.scenarioPatterns.length ? existing.scenarioPatterns : ["abstract-symbolic"]),
			scenarioDirective: existing?.scenarioDirective,
			itemModes: preferredModes.length > 0
				? [preferredModes[index % preferredModes.length]]
				: (existing?.itemModes.length ? existing.itemModes : ["explain"]),
			maxBloomLevel: assignedBloom,
		};
	});

	return {
		teacherId: args.teacherId,
		assessmentId: args.assessmentId,
		unitId: args.unitId ?? base.unitId,
		conceptProfiles,
		flowProfile: {
			sectionOrder: includedConcepts.map((concept) => concept.id ? concept.id : canonicalConceptId(concept.name)),
			typicalLengthRange: [Math.max(1, totalItems), Math.max(1, totalItems)],
			cognitiveLadderShape: uniqueValues(expandedBloomLevels.length > 0 ? expandedBloomLevels : conceptProfiles.map((profile) => profile.maxBloomLevel)),
		},
		itemCount: Math.max(1, totalItems),
		sourceType: base.sourceType,
		lastUpdated: now,
		version: (base.version ?? 0) + 1,
	};
}

export function buildInstructionalConceptMap(args: {
	analysis: InstructionalAnalysis;
	blueprint: BlueprintModel;
}): ConceptMapModel {
	// Use the raw concept string as the map key — taxonomy IDs (e.g. "math.statistics.hypothesis-testing")
	// must not be slugified because canonicalConceptId() strips dots.
	const analysisByConcept = new Map(args.analysis.concepts.map((concept) => [concept.concept, concept] as const));
	const orderedConcepts = [...args.blueprint.concepts]
		.filter((concept) => concept.included !== false)
		.sort((left, right) => left.order - right.order);

	return {
		nodes: orderedConcepts.map((concept) => {
			const analysisConcept = analysisByConcept.get(concept.id || concept.name);
			return {
				id: concept.id,
				label: concept.name,
				weight: analysisConcept?.overlapStrength ?? analysisConcept?.score ?? analysisConcept?.problemCount ?? concept.quota,
			};
		}),
		edges: orderedConcepts.flatMap((concept, index) => {
			const nextConcept = orderedConcepts[index + 1];
			const currentAnalysis = analysisByConcept.get(concept.id || concept.name);
			const nextAnalysis = nextConcept ? analysisByConcept.get(nextConcept.id || nextConcept.name) : null;
			return nextConcept
				? [{
					from: concept.id,
					to: nextConcept.id,
					weight: Number((((currentAnalysis?.overlapStrength ?? 0) + (nextAnalysis?.overlapStrength ?? 0) + (currentAnalysis?.coverageScore ?? 0) + (nextAnalysis?.coverageScore ?? 0)) / 2 || 1).toFixed(4)),
				}]
				: [];
		}),
	};
}

export function buildTeacherFingerprintModel(fingerprint: TeacherFingerprint | null, teacherId?: string): TeacherFingerprintModel {
	if (!fingerprint) {
		return {
			teacherId: teacherId ?? "",
			modePreferences: [],
			scenarioPreferences: [],
			bloomPreferences: [],
			difficultyPreferences: [],
			rawFingerprint: null,
		};
	}

	return {
		teacherId: fingerprint.teacherId,
		modePreferences: toCountedMode(countArrayValues(fingerprint.defaultItemModes, ITEM_MODES)),
		scenarioPreferences: toCountedScenario(countArrayValues(fingerprint.defaultScenarioPreferences, SCENARIO_TYPES)),
		bloomPreferences: toCountedBloom(countRecordValues(fingerprint.defaultBloomDistribution, BLOOM_LEVELS)),
		difficultyPreferences: [],
		rawFingerprint: fingerprint,
	};
}

export function mergeTeacherFingerprintModel(
	current: TeacherFingerprintModel,
	patch: Partial<TeacherFingerprintModel>,
): TeacherFingerprintModel {
	return {
		teacherId: patch.teacherId ?? current.teacherId,
		modePreferences: patch.modePreferences ?? current.modePreferences,
		scenarioPreferences: patch.scenarioPreferences ?? current.scenarioPreferences,
		bloomPreferences: patch.bloomPreferences ?? current.bloomPreferences,
		difficultyPreferences: patch.difficultyPreferences ?? current.difficultyPreferences,
		rawFingerprint: patch.rawFingerprint ?? current.rawFingerprint,
	};
}

export function buildTeacherFingerprintFromModel(args: {
	teacherId: string;
	model: TeacherFingerprintModel;
	current?: TeacherFingerprint | null;
	now?: string;
}): TeacherFingerprint {
	const now = args.now ?? new Date().toISOString();
	const bloomTotal = args.model.bloomPreferences.reduce((sum, entry) => sum + Math.max(0, entry.count), 0);
	const defaultBloomDistribution = BLOOM_LEVELS.reduce<Record<BloomLevel, number>>((distribution, level) => {
		const count = args.model.bloomPreferences.find((entry) => entry.level === level)?.count ?? 0;
		distribution[level] = bloomTotal > 0 ? Number((count / bloomTotal).toFixed(4)) : (args.current?.defaultBloomDistribution[level] ?? (level === "understand" ? 1 : 0));
		return distribution;
	}, {
		remember: 0,
		understand: 0,
		apply: 0,
		analyze: 0,
		evaluate: 0,
		create: 0,
	});

	const defaultScenarioPreferences = sortScenariosByCount(args.model.scenarioPreferences);
	const defaultItemModes = sortModesByCount(args.model.modePreferences);
	const cognitiveLadderShape = uniqueValues(expandBloomPreferences(args.model.bloomPreferences));

	return {
		teacherId: args.teacherId,
		globalConceptProfiles: args.current?.globalConceptProfiles ?? [],
		defaultBloomDistribution,
		defaultScenarioPreferences: defaultScenarioPreferences.length > 0 ? defaultScenarioPreferences : (args.current?.defaultScenarioPreferences ?? []),
		defaultItemModes: defaultItemModes.length > 0 ? defaultItemModes : (args.current?.defaultItemModes ?? []),
		flowProfile: {
			sectionOrder: args.current?.flowProfile.sectionOrder ?? [],
			typicalLengthRange: args.current?.flowProfile.typicalLengthRange ?? [1, 1],
			cognitiveLadderShape: cognitiveLadderShape.length > 0 ? cognitiveLadderShape : (args.current?.flowProfile.cognitiveLadderShape ?? []),
		},
		lastUpdated: now,
		version: (args.current?.version ?? 0) + 1,
	};
}