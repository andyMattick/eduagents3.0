import type { StudentPerformanceProfile } from "../studentPerformance";

import type { AssessmentPreviewModel, BuilderPlanModel, ClassProfileModel, DifferentiatedBuildModel } from "./InstructionalIntelligenceSession";
import type { MasteryBand } from "./masteryBands";
import { classifyMasteryBand } from "./masteryBands";

const MASTERY_BAND_ORDER: MasteryBand[] = ["low", "mid", "high"];

const MASTERY_BAND_LABELS: Record<MasteryBand, string> = {
	low: "Support Version",
	mid: "Core Version",
	high: "Extension Version",
};

function summarizePriorityConcepts(classProfile: ClassProfileModel, masteryBand: MasteryBand) {
	return classProfile.conceptClusters
		.map((cluster) => ({ conceptId: cluster.conceptId, count: cluster[masteryBand].length }))
		.filter((entry) => entry.count > 0)
		.sort((left, right) => right.count - left.count || left.conceptId.localeCompare(right.conceptId))
		.slice(0, 3)
		.map((entry) => entry.conceptId);
}

function buildExplanation(args: {
	classProfile: ClassProfileModel;
	masteryBand: MasteryBand;
	studentIds: string[];
	representativeStudentId: string;
}) {
	const label = MASTERY_BAND_LABELS[args.masteryBand];
	const priorityConcepts = summarizePriorityConcepts(args.classProfile, args.masteryBand);
	const conceptsSummary = priorityConcepts.length > 0 ? ` Priority concepts: ${priorityConcepts.join(", ")}.` : "";
	return `${label} targets ${args.studentIds.length} student${args.studentIds.length === 1 ? "" : "s"} in the ${args.masteryBand} mastery band using representative profile ${args.representativeStudentId}.${conceptsSummary}`;
}

function groupStudentsByBand(studentProfiles: StudentPerformanceProfile[]) {
	const buckets: Record<MasteryBand, StudentPerformanceProfile[]> = {
		low: [],
		mid: [],
		high: [],
	};

	for (const studentProfile of [...studentProfiles].sort((left, right) => left.overallMastery - right.overallMastery || left.studentId.localeCompare(right.studentId))) {
		buckets[classifyMasteryBand(studentProfile.overallMastery)].push(studentProfile);
	}

	return buckets;
}

export function buildDifferentiatedBuild(args: {
	classId: string;
	classProfile: ClassProfileModel;
	versionSeeds: Array<{
		masteryBand: MasteryBand;
		representativeStudentId: string;
		builderPlan: BuilderPlanModel;
		assessmentPreview: AssessmentPreviewModel;
	}>;
}): DifferentiatedBuildModel {
	const studentsByBand = groupStudentsByBand(args.classProfile.students);
	const seedByBand = new Map(args.versionSeeds.map((seed) => [seed.masteryBand, seed] as const));

	return {
		classId: args.classId,
		versions: MASTERY_BAND_ORDER.flatMap((masteryBand) => {
			const seed = seedByBand.get(masteryBand);
			const studentIds = studentsByBand[masteryBand].map((entry) => entry.studentId);
			if (!seed || studentIds.length === 0) {
				return [];
			}

			return [{
				versionId: `${masteryBand}-version`,
				label: MASTERY_BAND_LABELS[masteryBand],
				masteryBand,
				studentIds,
				representativeStudentId: seed.representativeStudentId,
				explanation: buildExplanation({
					classProfile: args.classProfile,
					masteryBand,
					studentIds,
					representativeStudentId: seed.representativeStudentId,
				}),
				builderPlan: seed.builderPlan,
				assessmentPreview: seed.assessmentPreview,
			}];
		}),
	};
}