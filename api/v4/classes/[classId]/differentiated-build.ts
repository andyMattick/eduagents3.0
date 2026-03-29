import type { VercelRequest, VercelResponse } from "@vercel/node";

import { buildClassProfileView, buildDifferentiatedBuild, buildInstructionalBuilderPlan, buildInstructionalPreview, classifyMasteryBand, resolveInstructionalAssessmentRuntime, type MasteryBand } from "../../../../src/prism-v4/session";
import { getStudentPerformanceProfile, listStudentIdsForClass } from "../../../../src/prism-v4/studentPerformance";

export const runtime = "nodejs";

function resolveQueryValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function selectRepresentativeStudentId(masteryBand: MasteryBand, studentIds: string[]) {
	if (masteryBand === "high") {
		return studentIds[studentIds.length - 1] ?? null;
	}
	if (masteryBand === "mid") {
		return studentIds[Math.floor(studentIds.length / 2)] ?? null;
	}
	return studentIds[0] ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const classId = resolveQueryValue(req.query.classId);
	if (!classId) {
		return res.status(400).json({ error: "classId is required" });
	}

	try {
		const studentIds = await listStudentIdsForClass(classId);
		if (studentIds.length === 0) {
			return res.status(404).json({ error: "Class roster not found" });
		}

		const studentProfiles = (await Promise.all(studentIds.map((studentId) => getStudentPerformanceProfile(studentId)))).filter(Boolean);
		if (studentProfiles.length === 0) {
			return res.status(404).json({ error: "Class profiles not found" });
		}

		const classProfile = buildClassProfileView({ classId, studentProfiles });
		const studentsByBand = classProfile.students.reduce<Record<MasteryBand, string[]>>((accumulator, studentProfile) => {
			accumulator[classifyMasteryBand(studentProfile.overallMastery)].push(studentProfile.studentId);
			return accumulator;
		}, { low: [], mid: [], high: [] });
		const sessionId = resolveQueryValue(req.query.sessionId) ?? classId;

		const versionSeeds = [] as Array<{
			masteryBand: MasteryBand;
			representativeStudentId: string;
			builderPlan: ReturnType<typeof buildInstructionalBuilderPlan>;
			assessmentPreview: ReturnType<typeof buildInstructionalPreview>;
		}>;

		for (const masteryBand of ["low", "mid", "high"] as MasteryBand[]) {
			const studentIdsForBand = studentsByBand[masteryBand];
			if (studentIdsForBand.length === 0) {
				continue;
			}

			const representativeStudentId = selectRepresentativeStudentId(masteryBand, studentIdsForBand);
			if (!representativeStudentId) {
				continue;
			}

			const runtimeState = await resolveInstructionalAssessmentRuntime({
				sessionId,
				studentId: representativeStudentId,
				teacherId: resolveQueryValue(req.query.teacherId),
				unitId: resolveQueryValue(req.query.unitId),
			});

			versionSeeds.push({
				masteryBand,
				representativeStudentId,
				builderPlan: buildInstructionalBuilderPlan({
					product: runtimeState.product,
					conceptProfiles: runtimeState.assessmentFingerprint.conceptProfiles,
					adaptiveTargets: runtimeState.adaptiveTargets,
				}),
				assessmentPreview: buildInstructionalPreview({
					product: runtimeState.product,
					productRecord: runtimeState.productRecord,
				}),
			});
		}

		return res.status(200).json({
			classId,
			sessionId,
			differentiatedBuild: buildDifferentiatedBuild({
				classId,
				classProfile,
				versionSeeds,
			}),
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Session not found") {
			return res.status(404).json({ error: error.message });
		}
		return res.status(500).json({ error: error instanceof Error ? error.message : "Differentiated build request failed" });
	}
}