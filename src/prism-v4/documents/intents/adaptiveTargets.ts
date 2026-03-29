import type { StudentPerformanceProfile } from "../../studentPerformance";
import { compareBloomLevels, type BloomLevel, type ConceptProfile, type ItemMode, type ScenarioType, type TeacherFingerprint, type UnitFingerprint } from "../../teacherFeedback";

export interface AdaptiveTargets {
	conceptQuotas: Record<string, number>;
	bloomTargets: Record<string, BloomLevel[]>;
	difficultyTargets: Record<string, number[]>;
	modePreferences: Record<string, ItemMode[]>;
	scenarioPreferences: Record<string, ScenarioType[]>;
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function allocateWholeCounts(weights: Record<string, number>, requestedCount: number) {
	const entries = Object.entries(weights);
	if (entries.length === 0 || requestedCount <= 0) {
		return {};
	}
	const total = entries.reduce((sum, [, weight]) => sum + Math.max(0.0001, weight), 0);
	const counts: Record<string, number> = {};
	let assigned = 0;
	const ranked = entries
		.map(([conceptId, weight]) => ({ conceptId, raw: (Math.max(0.0001, weight) / total) * requestedCount }))
		.sort((left, right) => right.raw - left.raw || left.conceptId.localeCompare(right.conceptId));
	for (const entry of ranked) {
		counts[entry.conceptId] = Math.floor(entry.raw);
		assigned += counts[entry.conceptId] ?? 0;
	}
	for (const entry of ranked
		.map((candidate) => ({ conceptId: candidate.conceptId, remainder: candidate.raw - Math.floor(candidate.raw) }))
		.sort((left, right) => right.remainder - left.remainder || left.conceptId.localeCompare(right.conceptId))) {
		if (assigned >= requestedCount) {
			break;
		}
		counts[entry.conceptId] = (counts[entry.conceptId] ?? 0) + 1;
		assigned += 1;
	}
	if (assigned === 0 && ranked[0]) {
		counts[ranked[0].conceptId] = requestedCount;
	}
	return counts;
}

function allowedBloomLevels(maxBloomLevel: BloomLevel) {
	return (["remember", "understand", "apply", "analyze", "evaluate", "create"] as BloomLevel[])
		.filter((level) => compareBloomLevels(level, maxBloomLevel) <= 0);
}

function weakestBloomLevels(profile: StudentPerformanceProfile, conceptId: string, levels: BloomLevel[]) {
	const conceptBloom = profile.conceptBloomMastery[conceptId] ?? {};
	return [...levels].sort((left, right) => {
		const leftValue = conceptBloom[left] ?? profile.bloomMastery[left] ?? 0.5;
		const rightValue = conceptBloom[right] ?? profile.bloomMastery[right] ?? 0.5;
		return leftValue - rightValue || compareBloomLevels(right, left);
	});
}

function weakestModes(profile: StudentPerformanceProfile, conceptId: string, available: ItemMode[]) {
	const conceptMode = profile.conceptModeMastery[conceptId] ?? {};
	return [...available].sort((left, right) => {
		const leftValue = conceptMode[left] ?? profile.modeMastery[left] ?? 0.5;
		const rightValue = conceptMode[right] ?? profile.modeMastery[right] ?? 0.5;
		return leftValue - rightValue || left.localeCompare(right);
	});
}

function weakestScenarios(profile: StudentPerformanceProfile, conceptId: string, available: ScenarioType[]) {
	const conceptScenario = profile.conceptScenarioMastery[conceptId] ?? {};
	return [...available].sort((left, right) => {
		const leftValue = conceptScenario[left] ?? profile.scenarioMastery[left] ?? 0.5;
		const rightValue = conceptScenario[right] ?? profile.scenarioMastery[right] ?? 0.5;
		return leftValue - rightValue || left.localeCompare(right);
	});
}

export function adjustConceptQuotas(args: {
	profile: StudentPerformanceProfile;
	conceptProfiles: ConceptProfile[];
	requestedCount: number;
}) {
	const weights: Record<string, number> = {};
	for (const concept of args.conceptProfiles) {
		const mastery = args.profile.conceptMastery[concept.conceptId] ?? args.profile.overallMastery ?? 0.55;
		const exposure = args.profile.conceptExposure[concept.conceptId] ?? 0;
		const misconceptionPressure = (args.profile.misconceptions[concept.conceptId] ?? []).reduce((sum, cluster) => sum + cluster.occurrences, 0);
		const base = Math.max(1, concept.absoluteItemHint ?? 1, concept.frequencyWeight * args.requestedCount);
		const weaknessBoost = 1 + (1 - mastery) * 1.2;
		const misconceptionBoost = 1 + Math.min(0.8, misconceptionPressure * 0.15);
		const exposureSoftener = exposure > 0 ? 1 / (1 + exposure * 0.08) : 1;
		weights[concept.conceptId] = Math.max(0.5, base * weaknessBoost * misconceptionBoost * exposureSoftener);
	}
	return allocateWholeCounts(weights, args.requestedCount);
}

export function adjustBloomTargets(args: {
	profile: StudentPerformanceProfile;
	conceptProfiles: ConceptProfile[];
	conceptQuotas: Record<string, number>;
}) {
	const targets: Record<string, BloomLevel[]> = {};
	for (const concept of args.conceptProfiles) {
		const quota = args.conceptQuotas[concept.conceptId] ?? 0;
		if (quota <= 0) {
			continue;
		}
		const rankedLevels = weakestBloomLevels(args.profile, concept.conceptId, allowedBloomLevels(concept.maxBloomLevel));
		targets[concept.conceptId] = Array.from({ length: quota }, (_, index) => rankedLevels[index % rankedLevels.length] ?? concept.maxBloomLevel);
	}
	return targets;
}

export function adjustDifficultyTargets(args: {
	profile: StudentPerformanceProfile;
	conceptProfiles: ConceptProfile[];
	conceptQuotas: Record<string, number>;
}) {
	const targets: Record<string, number[]> = {};
	for (const concept of args.conceptProfiles) {
		const quota = args.conceptQuotas[concept.conceptId] ?? 0;
		if (quota <= 0) {
			continue;
		}
		const mastery = args.profile.conceptMastery[concept.conceptId] ?? args.profile.overallMastery ?? 0.55;
		const misconceptionCount = (args.profile.misconceptions[concept.conceptId] ?? []).length;
		const start = mastery < 0.45 ? 0.18 : mastery < 0.7 ? 0.32 : 0.45;
		const end = clamp(start + 0.28 + misconceptionCount * 0.04, start + 0.1, 0.88);
		targets[concept.conceptId] = Array.from({ length: quota }, (_, index) => {
			const progress = quota <= 1 ? 1 : index / (quota - 1);
			return Number((start + (end - start) * progress).toFixed(3));
		});
	}
	return targets;
}

export function adjustModeAndScenarioTargets(args: {
	profile: StudentPerformanceProfile;
	conceptProfiles: ConceptProfile[];
	fingerprints?: {
		teacherFingerprint?: TeacherFingerprint | null;
		unitFingerprint?: UnitFingerprint | null;
	};
}) {
	const modePreferences: Record<string, ItemMode[]> = {};
	const scenarioPreferences: Record<string, ScenarioType[]> = {};
	for (const concept of args.conceptProfiles) {
		const availableModes = concept.itemModes.length > 0
			? concept.itemModes
			: args.fingerprints?.teacherFingerprint?.defaultItemModes ?? [];
		const availableScenarios = concept.scenarioPatterns.length > 0
			? concept.scenarioPatterns
			: args.fingerprints?.teacherFingerprint?.defaultScenarioPreferences ?? [];
		if (availableModes.length > 0) {
			modePreferences[concept.conceptId] = weakestModes(args.profile, concept.conceptId, unique(availableModes));
		}
		if (availableScenarios.length > 0) {
			scenarioPreferences[concept.conceptId] = weakestScenarios(args.profile, concept.conceptId, unique(availableScenarios));
		}
	}
	return {
		modePreferences,
		scenarioPreferences,
	};
}

export function deriveAdaptiveTargets(
	profile: StudentPerformanceProfile,
	conceptProfiles: ConceptProfile[],
	fingerprints: {
		teacherFingerprint?: TeacherFingerprint | null;
		unitFingerprint?: UnitFingerprint | null;
	},
	requestedCount: number,
): AdaptiveTargets {
	const effectiveProfiles = conceptProfiles.length > 0
		? conceptProfiles
		: fingerprints.unitFingerprint?.conceptProfiles?.length
			? fingerprints.unitFingerprint.conceptProfiles
			: fingerprints.teacherFingerprint?.globalConceptProfiles ?? [];
	const conceptQuotas = adjustConceptQuotas({
		profile,
		conceptProfiles: effectiveProfiles,
		requestedCount,
	});
	const bloomTargets = adjustBloomTargets({
		profile,
		conceptProfiles: effectiveProfiles,
		conceptQuotas,
	});
	const difficultyTargets = adjustDifficultyTargets({
		profile,
		conceptProfiles: effectiveProfiles,
		conceptQuotas,
	});
	const preferences = adjustModeAndScenarioTargets({
		profile,
		conceptProfiles: effectiveProfiles,
		fingerprints,
	});
	return {
		conceptQuotas,
		bloomTargets,
		difficultyTargets,
		modePreferences: preferences.modePreferences,
		scenarioPreferences: preferences.scenarioPreferences,
	};
}