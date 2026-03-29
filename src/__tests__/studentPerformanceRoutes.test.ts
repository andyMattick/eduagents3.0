import { afterEach, describe, expect, it } from "vitest";

import ingestAssessmentHandler from "../../api/v4/student-performance/ingestAssessment";
import performanceHandler from "../../api/v4/students/[studentId]/performance";
import { resetStudentPerformanceState } from "../prism-v4/studentPerformance";

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

describe("student performance routes", () => {
	afterEach(() => {
		resetStudentPerformanceState();
	});

	it("returns a normalized student profile payload with timeline and response times", async () => {
		const ingestRes = createResponse();
		await ingestAssessmentHandler({
			method: "POST",
			body: {
				studentId: "student-1",
				unitId: "unit-1",
				assessmentId: "assessment-1",
				items: [
					{
						itemId: "item-1",
						concept: "decimal operations",
						correct: false,
						bloom: "understand",
						mode: "compare",
						scenario: "abstract-symbolic",
						responseTimeSeconds: 1.25,
						misconceptionKey: "place-value-confusion",
						incorrectResponse: "0.35 is larger than 0.4",
						occurredAt: "2026-03-29T00:00:00.000Z",
					},
					{
						itemId: "item-2",
						concept: "decimal operations",
						correct: true,
						bloom: "apply",
						mode: "compare",
						scenario: "abstract-symbolic",
						responseTimeSeconds: 0.95,
						occurredAt: "2026-03-29T00:01:00.000Z",
					},
				],
			},
		} as any, ingestRes as any);

		expect(ingestRes.statusCode).toBe(200);

		const performanceRes = createResponse();
		await performanceHandler({ method: "GET", query: { studentId: "student-1", unitId: "unit-1" } } as any, performanceRes as any);

		expect(performanceRes.statusCode).toBe(200);
		expect(performanceRes.body.studentId).toBe("student-1");
		expect(performanceRes.body.profile.studentId).toBe("student-1");
		expect(performanceRes.body.profile.conceptMastery["decimal-operations"]).toBeLessThan(1);
		expect(performanceRes.body.misconceptions).toContain("place-value-confusion");
		expect(performanceRes.body.exposureTimeline).toHaveLength(2);
		expect(performanceRes.body.responseTimes[0].ms).toBe(1250);
	});
});