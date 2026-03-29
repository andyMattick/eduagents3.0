import { describe, expect, it } from "vitest";

import { recomputeProfileFromEvents, updateStudentPerformanceProfile } from "../profile";
import type { StudentAssessmentEvent } from "../StudentPerformanceProfile";

function buildEvent(overrides: Partial<StudentAssessmentEvent>): StudentAssessmentEvent {
	return {
		eventId: overrides.eventId ?? `event-${Math.random().toString(36).slice(2, 8)}`,
		studentId: overrides.studentId ?? "student-1",
		assessmentId: overrides.assessmentId ?? "assessment-1",
		unitId: overrides.unitId ?? "unit-1",
		conceptId: overrides.conceptId ?? "fractions",
		conceptDisplayName: overrides.conceptDisplayName ?? overrides.conceptId ?? "fractions",
		bloomLevel: overrides.bloomLevel ?? "analyze",
		itemMode: overrides.itemMode ?? "explain",
		scenarioType: overrides.scenarioType ?? "real-world",
		correct: overrides.correct ?? false,
		responseTimeSeconds: overrides.responseTimeSeconds ?? 42,
		confidence: overrides.confidence ?? 0.4,
		misconceptionKey: overrides.misconceptionKey,
		incorrectResponse: overrides.incorrectResponse,
		occurredAt: overrides.occurredAt ?? "2026-03-29T00:00:00.000Z",
	};
}

describe("student performance profile", () => {
	it("recomputes mastery, bloom, mode, scenario, and misconceptions deterministically", () => {
		const profile = recomputeProfileFromEvents([
			buildEvent({
				eventId: "event-1",
				correct: false,
				incorrectResponse: "Confused numerator and denominator",
				misconceptionKey: "numerator-denominator-swap",
				occurredAt: "2026-03-29T00:00:00.000Z",
			}),
			buildEvent({
				eventId: "event-2",
				correct: true,
				confidence: 0.8,
				responseTimeSeconds: 25,
				occurredAt: "2026-03-29T00:05:00.000Z",
			}),
		]);

		expect(profile.studentId).toBe("student-1");
		expect(profile.totalEvents).toBe(2);
		expect(profile.totalAssessments).toBe(1);
		expect(profile.conceptMastery.fractions).toBeGreaterThan(0.3);
		expect(profile.conceptMastery.fractions).toBeLessThan(0.7);
		expect(profile.bloomMastery.analyze).toBeDefined();
		expect(profile.modeMastery.explain).toBeDefined();
		expect(profile.scenarioMastery["real-world"]).toBeDefined();
		expect(profile.misconceptions.fractions).toHaveLength(1);
		expect(profile.misconceptions.fractions?.[0]?.misconceptionKey).toBe("numerator-denominator-swap");
		expect(profile.averageResponseTimeSeconds).toBeLessThan(42);
		expect(profile.overallConfidence).toBeGreaterThan(0.3);
	});

	it("decays exposure while incrementing the active concept", () => {
		const profile = recomputeProfileFromEvents([
			buildEvent({ eventId: "event-1", conceptId: "fractions", occurredAt: "2026-03-29T00:00:00.000Z" }),
			buildEvent({ eventId: "event-2", conceptId: "fractions", occurredAt: "2026-03-29T00:01:00.000Z" }),
			buildEvent({ eventId: "event-3", conceptId: "ratios", occurredAt: "2026-03-29T00:02:00.000Z" }),
		]);

		expect(profile.conceptExposure.fractions).toBeGreaterThan(0);
		expect(profile.conceptExposure.ratios).toBeGreaterThan(0);
		expect(profile.conceptExposure.fractions).toBeGreaterThan(profile.conceptExposure.ratios - 0.2);
		expect(profile.conceptExposure.fractions).toBeLessThan(2.1);
	});

	it("matches incremental updates to full recomputation", () => {
		const firstBatch = [
			buildEvent({ eventId: "event-1", conceptId: "fractions", correct: false, occurredAt: "2026-03-29T00:00:00.000Z" }),
			buildEvent({ eventId: "event-2", conceptId: "fractions", correct: true, occurredAt: "2026-03-29T00:01:00.000Z" }),
		];
		const secondBatch = [
			buildEvent({ eventId: "event-3", conceptId: "ratios", correct: false, itemMode: "analyze", scenarioType: "graphical", occurredAt: "2026-03-29T00:02:00.000Z" }),
		];

		const incremental = updateStudentPerformanceProfile(recomputeProfileFromEvents(firstBatch), secondBatch);
		const recomputed = recomputeProfileFromEvents([...firstBatch, ...secondBatch]);

		expect(incremental).toEqual(recomputed);
	});
});