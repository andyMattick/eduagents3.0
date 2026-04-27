import { describe, expect, it } from "vitest";

import { loadTeacherTemplates } from "../../semantic/cognitive/templates/loadTeacherTemplates";
import type { TeacherDerivedTemplateRecord } from "../TeacherFeedback";

function makeRecord(overrides: Partial<TeacherDerivedTemplateRecord> = {}): TeacherDerivedTemplateRecord {
	return {
		id: overrides.id ?? "teacher-derived-custom-1",
		teacherId: overrides.teacherId ?? "teacher-1",
		sourceFeedbackId: overrides.sourceFeedbackId ?? "feedback-1",
		evidenceText: overrides.evidenceText ?? "anomalous phrase",
		createdAt: overrides.createdAt ?? "2026-03-24T00:00:00.000Z",
		...overrides,
	};
}

describe("teacher template loader", () => {
	it("rejects invalid teacher templates", () => {
		const result = loadTeacherTemplates([
			makeRecord({
				id: "teacher-derived-invalid",
				patternConfig: {
					textPatterns: ["graph"],
					structuralPatterns: ["invalidPattern" as never],
					regexPatterns: [],
					minConfidence: 0.5,
				},
			}),
		]);

		expect(result.templates).toEqual([]);
		expect(result.rejected[0]?.id).toBe("teacher-derived-invalid");
	});

	it("rejects system id collisions instead of overriding silently", () => {
		const result = loadTeacherTemplates([
			makeRecord({
				id: "interpretation",
				patternConfig: {
					textPatterns: ["interpret"],
					structuralPatterns: [],
					regexPatterns: [],
					minConfidence: 0.9,
				},
			}),
		]);

		expect(result.templates).toEqual([]);
		expect(result.rejected[0]?.reason).toContain("invalid teacher template");
	});

	it("normalizes valid teacher templates without exposing subject or domain", () => {
		const result = loadTeacherTemplates([
			makeRecord({
				id: "teacher-derived-valid",
				subject: "science",
				domain: "lab-design",
				patternConfig: {
					textPatterns: ["anomalous phrase"],
					structuralPatterns: ["constructedResponse"],
					regexPatterns: [],
					minConfidence: 0.8,
				},
				stepHints: {
					expectedSteps: 4,
					stepType: "mixed",
				},
				multiStepBoost: 0.9,
			}),
		]);

		expect(result.rejected).toEqual([]);
		expect(result.templates).toHaveLength(1);
		expect(result.templates[0]).not.toHaveProperty("subject");
		expect(result.templates[0]).not.toHaveProperty("domain");
		expect(result.templates[0]?.stepHints?.expectedSteps).toBe(4);
	});
});