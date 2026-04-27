import type { StudentAssessmentEvent, StudentPerformanceProfile } from "../studentPerformance";

export interface StudentExposureEntry {
	timestamp: string;
	conceptId: string;
	conceptLabel?: string;
}

export interface StudentResponseTimeEntry {
	itemId: string;
	conceptId: string;
	ms: number;
}

export interface InstructionalStudentProfilePayload {
	studentId: string;
	unitId?: string;
	profile: StudentPerformanceProfile;
	misconceptions: string[];
	exposureTimeline: StudentExposureEntry[];
	responseTimes: StudentResponseTimeEntry[];
}

function uniqueValues<T>(values: T[]) {
	return [...new Set(values)];
}

export function buildStudentProfileView(args: {
	profile: StudentPerformanceProfile;
	events: StudentAssessmentEvent[];
}): InstructionalStudentProfilePayload {
	const { profile, events } = args;
	const misconceptions = uniqueValues(
		Object.values(profile.misconceptions)
			.flatMap((clusters) => clusters.map((cluster) => cluster.misconceptionKey)),
	).sort((left, right) => left.localeCompare(right));

	return {
		studentId: profile.studentId,
		unitId: profile.unitId,
		profile,
		misconceptions,
		exposureTimeline: events.map((event) => ({
			timestamp: event.occurredAt,
			conceptId: event.conceptId,
			conceptLabel: event.conceptDisplayName,
		})),
		responseTimes: events.flatMap((event) => {
			if (typeof event.responseTimeSeconds !== "number") {
				return [];
			}
			return [{
				itemId: event.itemId ?? event.eventId,
				conceptId: event.conceptId,
				ms: Math.round(event.responseTimeSeconds * 1000),
			}];
		}),
	};
}