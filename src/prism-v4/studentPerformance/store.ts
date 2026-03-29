import { supabaseRest } from "../../../lib/supabase";
import type { StudentAssessmentEvent, StudentPerformanceProfile } from "./StudentPerformanceProfile";

const studentProfileMemory = new Map<string, StudentPerformanceProfile>();
const studentEventMemory = new Map<string, StudentAssessmentEvent[]>();

function canUseSupabase() {
	return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function profileKey(studentId: string, unitId?: string) {
	return `${studentId}::${unitId ?? "global"}`;
}

function normalizeProfile(profile: StudentPerformanceProfile) {
	return {
		student_id: profile.studentId,
		unit_id: profile.unitId ?? null,
		last_updated: profile.lastUpdated,
		total_events: profile.totalEvents,
		total_assessments: profile.totalAssessments,
		assessment_ids: profile.assessmentIds,
		overall_mastery: profile.overallMastery,
		overall_confidence: profile.overallConfidence,
		average_response_time_seconds: profile.averageResponseTimeSeconds,
		concept_mastery: profile.conceptMastery,
		concept_exposure: profile.conceptExposure,
		bloom_mastery: profile.bloomMastery,
		mode_mastery: profile.modeMastery,
		scenario_mastery: profile.scenarioMastery,
		concept_bloom_mastery: profile.conceptBloomMastery,
		concept_mode_mastery: profile.conceptModeMastery,
		concept_scenario_mastery: profile.conceptScenarioMastery,
		concept_average_response_time_seconds: profile.conceptAverageResponseTimeSeconds,
		concept_confidence: profile.conceptConfidence,
		misconceptions: profile.misconceptions,
	};
}

function hydrateProfile(row: Record<string, unknown>): StudentPerformanceProfile {
	return {
		studentId: String(row.student_id),
		unitId: typeof row.unit_id === "string" ? row.unit_id : undefined,
		lastUpdated: String(row.last_updated ?? new Date(0).toISOString()),
		totalEvents: Number(row.total_events ?? 0),
		totalAssessments: Number(row.total_assessments ?? 0),
		assessmentIds: (row.assessment_ids as string[]) ?? [],
		overallMastery: Number(row.overall_mastery ?? 0),
		overallConfidence: Number(row.overall_confidence ?? 0),
		averageResponseTimeSeconds: Number(row.average_response_time_seconds ?? 0),
		conceptMastery: (row.concept_mastery as Record<string, number>) ?? {},
		conceptExposure: (row.concept_exposure as Record<string, number>) ?? {},
		bloomMastery: (row.bloom_mastery as StudentPerformanceProfile["bloomMastery"]) ?? {},
		modeMastery: (row.mode_mastery as StudentPerformanceProfile["modeMastery"]) ?? {},
		scenarioMastery: (row.scenario_mastery as StudentPerformanceProfile["scenarioMastery"]) ?? {},
		conceptBloomMastery: (row.concept_bloom_mastery as StudentPerformanceProfile["conceptBloomMastery"]) ?? {},
		conceptModeMastery: (row.concept_mode_mastery as StudentPerformanceProfile["conceptModeMastery"]) ?? {},
		conceptScenarioMastery: (row.concept_scenario_mastery as StudentPerformanceProfile["conceptScenarioMastery"]) ?? {},
		conceptAverageResponseTimeSeconds: (row.concept_average_response_time_seconds as Record<string, number>) ?? {},
		conceptConfidence: (row.concept_confidence as Record<string, number>) ?? {},
		misconceptions: (row.misconceptions as StudentPerformanceProfile["misconceptions"]) ?? {},
	};
}

function normalizeEvent(event: StudentAssessmentEvent) {
	return {
		event_id: event.eventId,
		student_id: event.studentId,
		assessment_id: event.assessmentId,
		unit_id: event.unitId ?? null,
		item_id: event.itemId ?? null,
		concept_id: event.conceptId,
		concept_display_name: event.conceptDisplayName ?? null,
		bloom_level: event.bloomLevel,
		item_mode: event.itemMode ?? null,
		scenario_type: event.scenarioType ?? null,
		difficulty: event.difficulty ?? null,
		correct: event.correct,
		response_time_seconds: event.responseTimeSeconds ?? null,
		confidence: event.confidence ?? null,
		misconception_key: event.misconceptionKey ?? null,
		incorrect_response: event.incorrectResponse ?? null,
		occurred_at: event.occurredAt,
		metadata: event.metadata ?? null,
	};
}

function hydrateEvent(row: Record<string, unknown>): StudentAssessmentEvent {
	return {
		eventId: String(row.event_id),
		studentId: String(row.student_id),
		assessmentId: String(row.assessment_id),
		unitId: typeof row.unit_id === "string" ? row.unit_id : undefined,
		itemId: typeof row.item_id === "string" ? row.item_id : undefined,
		conceptId: String(row.concept_id),
		conceptDisplayName: typeof row.concept_display_name === "string" ? row.concept_display_name : undefined,
		bloomLevel: row.bloom_level as StudentAssessmentEvent["bloomLevel"],
		itemMode: typeof row.item_mode === "string" ? row.item_mode as StudentAssessmentEvent["itemMode"] : undefined,
		scenarioType: typeof row.scenario_type === "string" ? row.scenario_type as StudentAssessmentEvent["scenarioType"] : undefined,
		difficulty: typeof row.difficulty === "string" ? row.difficulty as StudentAssessmentEvent["difficulty"] : undefined,
		correct: Boolean(row.correct),
		responseTimeSeconds: typeof row.response_time_seconds === "number" ? row.response_time_seconds : undefined,
		confidence: typeof row.confidence === "number" ? row.confidence : undefined,
		misconceptionKey: typeof row.misconception_key === "string" ? row.misconception_key : undefined,
		incorrectResponse: typeof row.incorrect_response === "string" ? row.incorrect_response : undefined,
		occurredAt: String(row.occurred_at),
		metadata: (row.metadata as Record<string, unknown>) ?? undefined,
	};
}

export async function saveStudentPerformanceProfile(profile: StudentPerformanceProfile) {
	studentProfileMemory.set(profileKey(profile.studentId, profile.unitId), profile);
	if (canUseSupabase()) {
		await supabaseRest("student_performance_profiles", {
			method: "POST",
			body: normalizeProfile(profile),
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	}
	return profile;
}

export async function getStudentPerformanceProfile(studentId: string, unitId?: string): Promise<StudentPerformanceProfile | null> {
	if (canUseSupabase()) {
		const rows = await supabaseRest("student_performance_profiles", {
			select: "student_id,unit_id,last_updated,total_events,total_assessments,assessment_ids,overall_mastery,overall_confidence,average_response_time_seconds,concept_mastery,concept_exposure,bloom_mastery,mode_mastery,scenario_mastery,concept_bloom_mastery,concept_mode_mastery,concept_scenario_mastery,concept_average_response_time_seconds,concept_confidence,misconceptions",
			filters: {
				student_id: `eq.${studentId}`,
				...(unitId ? { unit_id: `eq.${unitId}` } : { unit_id: "is.null" }),
			},
		});
		const row = Array.isArray(rows) ? rows[0] : null;
		if (!row) {
			return null;
		}
		const profile = hydrateProfile(row as Record<string, unknown>);
		studentProfileMemory.set(profileKey(profile.studentId, profile.unitId), profile);
		return profile;
	}
	return studentProfileMemory.get(profileKey(studentId, unitId)) ?? null;
}

export async function appendStudentAssessmentEvents(events: StudentAssessmentEvent[]) {
	if (events.length === 0) {
		return [];
	}
	for (const event of events) {
		const key = profileKey(event.studentId, event.unitId);
		studentEventMemory.set(key, [...(studentEventMemory.get(key) ?? []), event]);
	}
	if (canUseSupabase()) {
		await supabaseRest("student_assessment_events", {
			method: "POST",
			body: events.map((event) => normalizeEvent(event)),
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	}
	return events;
}

export async function listStudentAssessmentEvents(studentId: string, unitId?: string): Promise<StudentAssessmentEvent[]> {
	if (canUseSupabase()) {
		const rows = await supabaseRest("student_assessment_events", {
			select: "event_id,student_id,assessment_id,unit_id,item_id,concept_id,concept_display_name,bloom_level,item_mode,scenario_type,difficulty,correct,response_time_seconds,confidence,misconception_key,incorrect_response,occurred_at,metadata",
			filters: {
				student_id: `eq.${studentId}`,
				...(unitId ? { unit_id: `eq.${unitId}` } : {}),
				order: "occurred_at.asc,event_id.asc",
			},
		});
		const hydrated = ((rows as Array<Record<string, unknown>>) ?? []).map((row) => hydrateEvent(row));
		studentEventMemory.set(profileKey(studentId, unitId), hydrated);
		return hydrated;
	}
	return [...(studentEventMemory.get(profileKey(studentId, unitId)) ?? [])].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));
}

export function resetStudentPerformanceState() {
	studentProfileMemory.clear();
	studentEventMemory.clear();
}
