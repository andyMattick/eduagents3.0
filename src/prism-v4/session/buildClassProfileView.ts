import { canonicalConceptId } from "../teacherFeedback";
import type { StudentPerformanceProfile } from "../studentPerformance";

import type { ClassProfileModel } from "./InstructionalIntelligenceSession";
import { classifyMasteryBand } from "./masteryBands";

function uniqueValues<T>(values: T[]) {
	return [...new Set(values)];
}

export function buildClassProfileView(args: {
	classId: string;
	studentProfiles: StudentPerformanceProfile[];
}): ClassProfileModel {
	const { classId, studentProfiles } = args;
	const conceptIds = uniqueValues(
		studentProfiles.flatMap((profile) => Object.keys(profile.conceptMastery).map((conceptId) => canonicalConceptId(conceptId))),
	).sort((left, right) => left.localeCompare(right));

	const misconceptionMap = new Map<string, Set<string>>();
	for (const profile of studentProfiles) {
		for (const clusters of Object.values(profile.misconceptions)) {
			for (const cluster of clusters) {
				const students = misconceptionMap.get(cluster.misconceptionKey) ?? new Set<string>();
				students.add(profile.studentId);
				misconceptionMap.set(cluster.misconceptionKey, students);
			}
		}
	}

	return {
		classId,
		students: [...studentProfiles].sort((left, right) => left.studentId.localeCompare(right.studentId)),
		conceptClusters: conceptIds.map((conceptId) => {
			const buckets = { low: [] as string[], mid: [] as string[], high: [] as string[] };
			for (const profile of studentProfiles) {
				const mastery = profile.conceptMastery[conceptId] ?? profile.conceptMastery[canonicalConceptId(conceptId)];
				const band = classifyMasteryBand(mastery);
				if (band === "neutral") {
					continue;
				}
				buckets[band].push(profile.studentId);
			}
			return {
				conceptId,
				low: buckets.low.sort((left, right) => left.localeCompare(right)),
				mid: buckets.mid.sort((left, right) => left.localeCompare(right)),
				high: buckets.high.sort((left, right) => left.localeCompare(right)),
			};
		}),
		misconceptionClusters: [...misconceptionMap.entries()]
			.map(([misconception, students]) => ({
				misconception,
				students: [...students].sort((left, right) => left.localeCompare(right)),
			}))
			.sort((left, right) => right.students.length - left.students.length || left.misconception.localeCompare(right.misconception)),
	};
}