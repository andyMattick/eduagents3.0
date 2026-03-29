import { canonicalConceptId, compareBloomLevels, type BloomLevel, type ItemMode, type ScenarioType } from "../teacherFeedback";
import type { StudentAssessmentEvent, StudentMisconceptionCluster, StudentPerformanceProfile } from "./StudentPerformanceProfile";

const MASTERY_ALPHA = 0.35;
const AUXILIARY_ALPHA = 0.28;
const RESPONSE_TIME_ALPHA = 0.22;
const EXPOSURE_DECAY = 0.985;
const MAX_MISCONCEPTION_EXAMPLES = 3;

const BLOOM_LEVELS: BloomLevel[] = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

function clamp01(value: number) {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function roundMetric(value: number) {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Number(value.toFixed(4));
}

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function normalizeMisconceptionKey(event: StudentAssessmentEvent) {
	const explicit = typeof event.misconceptionKey === "string" && event.misconceptionKey.trim().length > 0
		? event.misconceptionKey.trim().toLowerCase()
		: null;
	if (explicit) {
		return explicit;
	}
	const incorrectResponse = typeof event.incorrectResponse === "string" ? event.incorrectResponse.trim().toLowerCase() : "";
	if (!incorrectResponse) {
		return null;
	}
	return incorrectResponse.replace(/[^a-z0-9\s-]+/g, " ").replace(/\s+/g, " ").trim();
}

function applyEwma(current: number | undefined, sample: number, alpha: number) {
	if (!Number.isFinite(sample)) {
		return current ?? 0;
	}
	if (current === undefined || !Number.isFinite(current)) {
		return clamp01(sample);
	}
	return clamp01(current * (1 - alpha) + sample * alpha);
}

function applyNumericEwma(current: number | undefined, sample: number, alpha: number) {
	if (!Number.isFinite(sample)) {
		return current ?? 0;
	}
	if (current === undefined || !Number.isFinite(current)) {
		return roundMetric(sample);
	}
	return roundMetric(current * (1 - alpha) + sample * alpha);
}

function createEmptyProfile(studentId: string, unitId?: string): StudentPerformanceProfile {
	return {
		studentId,
		unitId,
		lastUpdated: new Date(0).toISOString(),
		totalEvents: 0,
		totalAssessments: 0,
		assessmentIds: [],
		overallMastery: 0,
		overallConfidence: 0,
		averageResponseTimeSeconds: 0,
		conceptMastery: {},
		conceptExposure: {},
		bloomMastery: {},
		modeMastery: {},
		scenarioMastery: {},
		conceptBloomMastery: {},
		conceptModeMastery: {},
		conceptScenarioMastery: {},
		conceptAverageResponseTimeSeconds: {},
		conceptConfidence: {},
		misconceptions: {},
	};
}

function ensureConceptMap<T extends Record<string, unknown>>(record: Record<string, T>, conceptId: string) {
	if (!record[conceptId]) {
		record[conceptId] = {} as T;
	}
	return record[conceptId]!;
}

function decayExposure(profile: StudentPerformanceProfile, currentConceptId: string) {
	for (const conceptId of Object.keys(profile.conceptExposure)) {
		const current = profile.conceptExposure[conceptId] ?? 0;
		profile.conceptExposure[conceptId] = roundMetric(current * EXPOSURE_DECAY + (conceptId === currentConceptId ? 1 : 0));
	}
	if (!(currentConceptId in profile.conceptExposure)) {
		profile.conceptExposure[currentConceptId] = 1;
	}
	profile.conceptExposure[currentConceptId] = roundMetric((profile.conceptExposure[currentConceptId] ?? 0) + (profile.totalEvents === 0 ? 0 : 0));
}

function updateMisconceptions(profile: StudentPerformanceProfile, event: StudentAssessmentEvent, conceptId: string) {
	if (event.correct) {
		return;
	}
	const misconceptionKey = normalizeMisconceptionKey(event);
	if (!misconceptionKey) {
		return;
	}
	const clusters = [...(profile.misconceptions[conceptId] ?? [])];
	const existingIndex = clusters.findIndex((cluster) => cluster.misconceptionKey === misconceptionKey);
	const existing = existingIndex >= 0 ? clusters[existingIndex] : null;
	const next: StudentMisconceptionCluster = {
		misconceptionKey,
		occurrences: (existing?.occurrences ?? 0) + 1,
		lastSeenAt: event.occurredAt,
		examples: unique([...(existing?.examples ?? []), event.incorrectResponse ?? misconceptionKey]).slice(0, MAX_MISCONCEPTION_EXAMPLES),
		relatedBloomLevels: unique([...(existing?.relatedBloomLevels ?? []), event.bloomLevel]).sort(compareBloomLevels),
		relatedModes: unique([...(existing?.relatedModes ?? []), ...(event.itemMode ? [event.itemMode] : [])]).sort(),
	};
	if (existingIndex >= 0) {
		clusters[existingIndex] = next;
	} else {
		clusters.push(next);
	}
	profile.misconceptions[conceptId] = clusters.sort((left, right) => right.occurrences - left.occurrences || right.lastSeenAt.localeCompare(left.lastSeenAt));
}

function applyEvent(profile: StudentPerformanceProfile, rawEvent: StudentAssessmentEvent) {
	const conceptId = canonicalConceptId(rawEvent.conceptId || rawEvent.conceptDisplayName || "general");
	const event: StudentAssessmentEvent = {
		...rawEvent,
		conceptId,
	};
	decayExposure(profile, conceptId);

	const masterySample = event.correct ? 1 : 0;
	profile.overallMastery = applyEwma(profile.overallMastery, masterySample, MASTERY_ALPHA);
	profile.conceptMastery[conceptId] = applyEwma(profile.conceptMastery[conceptId], masterySample, MASTERY_ALPHA);
	profile.bloomMastery[event.bloomLevel] = applyEwma(profile.bloomMastery[event.bloomLevel], masterySample, MASTERY_ALPHA);

	const conceptBloom = ensureConceptMap(profile.conceptBloomMastery, conceptId) as Partial<Record<BloomLevel, number>>;
	conceptBloom[event.bloomLevel] = applyEwma(conceptBloom[event.bloomLevel], masterySample, MASTERY_ALPHA);

	if (event.itemMode) {
		profile.modeMastery[event.itemMode] = applyEwma(profile.modeMastery[event.itemMode], masterySample, MASTERY_ALPHA);
		const conceptMode = ensureConceptMap(profile.conceptModeMastery, conceptId) as Partial<Record<ItemMode, number>>;
		conceptMode[event.itemMode] = applyEwma(conceptMode[event.itemMode], masterySample, MASTERY_ALPHA);
	}

	if (event.scenarioType) {
		profile.scenarioMastery[event.scenarioType] = applyEwma(profile.scenarioMastery[event.scenarioType], masterySample, MASTERY_ALPHA);
		const conceptScenario = ensureConceptMap(profile.conceptScenarioMastery, conceptId) as Partial<Record<ScenarioType, number>>;
		conceptScenario[event.scenarioType] = applyEwma(conceptScenario[event.scenarioType], masterySample, MASTERY_ALPHA);
	}

	if (typeof event.confidence === "number") {
		profile.overallConfidence = applyEwma(profile.overallConfidence, clamp01(event.confidence), AUXILIARY_ALPHA);
		profile.conceptConfidence[conceptId] = applyEwma(profile.conceptConfidence[conceptId], clamp01(event.confidence), AUXILIARY_ALPHA);
	}

	if (typeof event.responseTimeSeconds === "number" && Number.isFinite(event.responseTimeSeconds) && event.responseTimeSeconds >= 0) {
		profile.averageResponseTimeSeconds = applyNumericEwma(profile.averageResponseTimeSeconds, event.responseTimeSeconds, RESPONSE_TIME_ALPHA);
		profile.conceptAverageResponseTimeSeconds[conceptId] = applyNumericEwma(profile.conceptAverageResponseTimeSeconds[conceptId], event.responseTimeSeconds, RESPONSE_TIME_ALPHA);
	}

	updateMisconceptions(profile, event, conceptId);
	profile.totalEvents += 1;
	if (!profile.assessmentIds.includes(event.assessmentId)) {
		profile.assessmentIds = [...profile.assessmentIds, event.assessmentId];
		profile.totalAssessments = profile.assessmentIds.length;
	}
	profile.lastUpdated = event.occurredAt;
	return profile;
}

export function updateStudentPerformanceProfile(
	profile: StudentPerformanceProfile | null | undefined,
	events: StudentAssessmentEvent[],
): StudentPerformanceProfile {
	if (events.length === 0) {
		if (profile) {
			return profile;
		}
		throw new Error("Cannot create student performance profile from zero events");
	}
	const sorted = [...events].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));
	const seed = profile
		? {
			...profile,
			assessmentIds: [...profile.assessmentIds],
			conceptMastery: { ...profile.conceptMastery },
			conceptExposure: { ...profile.conceptExposure },
			bloomMastery: { ...profile.bloomMastery },
			modeMastery: { ...profile.modeMastery },
			scenarioMastery: { ...profile.scenarioMastery },
			conceptBloomMastery: Object.fromEntries(Object.entries(profile.conceptBloomMastery).map(([conceptId, mastery]) => [conceptId, { ...mastery }])),
			conceptModeMastery: Object.fromEntries(Object.entries(profile.conceptModeMastery).map(([conceptId, mastery]) => [conceptId, { ...mastery }])),
			conceptScenarioMastery: Object.fromEntries(Object.entries(profile.conceptScenarioMastery).map(([conceptId, mastery]) => [conceptId, { ...mastery }])),
			conceptAverageResponseTimeSeconds: { ...profile.conceptAverageResponseTimeSeconds },
			conceptConfidence: { ...profile.conceptConfidence },
			misconceptions: Object.fromEntries(Object.entries(profile.misconceptions).map(([conceptId, clusters]) => [conceptId, clusters.map((cluster) => ({ ...cluster, examples: [...cluster.examples], relatedBloomLevels: [...cluster.relatedBloomLevels], relatedModes: [...cluster.relatedModes] }))])),
		}
		: createEmptyProfile(sorted[0]!.studentId, sorted[0]!.unitId);

	for (const event of sorted) {
		applyEvent(seed, event);
	}

	seed.totalAssessments = seed.assessmentIds.length;
	return seed;
}

export function recomputeProfileFromEvents(events: StudentAssessmentEvent[]): StudentPerformanceProfile {
	if (events.length === 0) {
		throw new Error("Cannot recompute student performance profile from zero events");
	}
	const sorted = [...events].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));
	return updateStudentPerformanceProfile(createEmptyProfile(sorted[0]!.studentId, sorted[0]!.unitId), sorted);
}

export function createStudentPerformanceProfile(studentId: string, unitId?: string) {
	return createEmptyProfile(studentId, unitId);
}

export function rankWeakestBloomLevels(profile: StudentPerformanceProfile, conceptId: string, allowedLevels: BloomLevel[]) {
	const conceptBloom = profile.conceptBloomMastery[conceptId] ?? {};
	return [...allowedLevels].sort((left, right) => {
		const leftValue = conceptBloom[left] ?? profile.bloomMastery[left] ?? 0.5;
		const rightValue = conceptBloom[right] ?? profile.bloomMastery[right] ?? 0.5;
		return leftValue - rightValue || compareBloomLevels(left, right);
	});
}

export function getConceptMisconceptionKeys(profile: StudentPerformanceProfile, conceptId: string) {
	return (profile.misconceptions[conceptId] ?? []).map((cluster) => cluster.misconceptionKey);
}

export function getWeakestConcepts(profile: StudentPerformanceProfile) {
	return Object.entries(profile.conceptMastery)
		.sort((left, right) => left[1] - right[1] || (profile.conceptExposure[left[0]] ?? 0) - (profile.conceptExposure[right[0]] ?? 0) || left[0].localeCompare(right[0]));
}

export function getObservedBloomLevels(profile: StudentPerformanceProfile, conceptId: string) {
	const observed = Object.keys(profile.conceptBloomMastery[conceptId] ?? {}) as BloomLevel[];
	return observed.length > 0 ? observed.sort(compareBloomLevels) : [...BLOOM_LEVELS];
}
