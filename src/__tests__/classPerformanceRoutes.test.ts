import { afterEach, describe, expect, it, vi } from "vitest";

import classPerformanceHandler from "../../api/v4/classes/[classId]/performance";
import * as studentPerformance from "../prism-v4/studentPerformance";
import { resetStudentPerformanceState, saveClassRoster, saveStudentPerformanceProfile } from "../prism-v4/studentPerformance";
import type { StudentPerformanceProfile } from "../prism-v4/studentPerformance";

function createResponse() {
	const res: any = {};
	res.status = (code: number) => {
		res.statusCode = code;
		return res;
	};
	res.json = (body: unknown) => {
		res.body = body;
		return res;
	};
	res.setHeader = () => res;
	return res;
}

function buildStudentProfile(args: {
	studentId: string;
	conceptMastery: Record<string, number>;
	misconceptions?: StudentPerformanceProfile["misconceptions"];
}): StudentPerformanceProfile {
	return {
		studentId: args.studentId,
		lastUpdated: "2026-03-29T00:00:00.000Z",
		totalEvents: 3,
		totalAssessments: 1,
		assessmentIds: ["assessment-1"],
		overallMastery: 0.5,
		overallConfidence: 0.5,
		averageResponseTimeSeconds: 30,
		conceptMastery: args.conceptMastery,
		conceptExposure: Object.fromEntries(Object.keys(args.conceptMastery).map((conceptId) => [conceptId, 1])),
		bloomMastery: {},
		modeMastery: {},
		scenarioMastery: {},
		conceptBloomMastery: {},
		conceptModeMastery: {},
		conceptScenarioMastery: {},
		conceptAverageResponseTimeSeconds: {},
		conceptConfidence: {},
		misconceptions: args.misconceptions ?? {},
	};
}

describe("class performance routes", () => {
	afterEach(() => {
		resetStudentPerformanceState();
		vi.restoreAllMocks();
	});

	it("returns a normalized class profile with low mid and high mastery clusters", async () => {
		await saveClassRoster("class-1", ["student-low", "student-mid", "student-high"]);
		await saveStudentPerformanceProfile(buildStudentProfile({
			studentId: "student-low",
			conceptMastery: { fractions: 0.2, ratios: 0.5 },
			misconceptions: {
				fractions: [{ misconceptionKey: "denominator-swap", occurrences: 2, lastSeenAt: "2026-03-29T00:00:00.000Z", examples: ["Added denominators"], relatedBloomLevels: ["apply"], relatedModes: ["explain"] }],
			},
		}));
		await saveStudentPerformanceProfile(buildStudentProfile({
			studentId: "student-mid",
			conceptMastery: { fractions: 0.6, ratios: 0.65 },
			misconceptions: {
				fractions: [{ misconceptionKey: "denominator-swap", occurrences: 1, lastSeenAt: "2026-03-29T00:00:00.000Z", examples: ["Common denominator error"], relatedBloomLevels: ["apply"], relatedModes: ["explain"] }],
			},
		}));
		await saveStudentPerformanceProfile(buildStudentProfile({
			studentId: "student-high",
			conceptMastery: { fractions: 0.9, ratios: 0.8 },
		}));

		const rosterSpy = vi.spyOn(studentPerformance, "listStudentIdsForClass");
		const profileSpy = vi.spyOn(studentPerformance, "getStudentPerformanceProfile");

		const res = createResponse();
		await classPerformanceHandler({ method: "GET", query: { classId: "class-1" } } as any, res as any);

		expect(rosterSpy).toHaveBeenCalledWith("class-1");
		expect(profileSpy).toHaveBeenCalledTimes(3);
		expect(profileSpy).toHaveBeenCalledWith("student-low");
		expect(profileSpy).toHaveBeenCalledWith("student-mid");
		expect(profileSpy).toHaveBeenCalledWith("student-high");
		expect(res.statusCode).toBe(200);
		expect(res.body.classProfile).toMatchObject({
			classId: "class-1",
			students: [
				{ studentId: "student-high" },
				{ studentId: "student-low" },
				{ studentId: "student-mid" },
			],
		});

		const fractionsCluster = res.body.classProfile.conceptClusters.find((entry: { conceptId: string }) => entry.conceptId === "fractions");
		expect(fractionsCluster).toEqual({
			conceptId: "fractions",
			low: ["student-low"],
			mid: ["student-mid"],
			high: ["student-high"],
		});

		const misconceptions = res.body.classProfile.misconceptionClusters.find((entry: { misconception: string }) => entry.misconception === "denominator-swap");
		expect(misconceptions).toEqual({
			misconception: "denominator-swap",
			students: ["student-low", "student-mid"],
		});
	});
});