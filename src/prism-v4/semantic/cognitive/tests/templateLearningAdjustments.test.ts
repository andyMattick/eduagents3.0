import { afterEach, describe, expect, it } from "vitest";

import { applyLearningAdjustments, aggregateTemplateLearning, recordTeacherAction, resetLearningState } from "../../learning";
import { genericTemplates } from "../templates";

describe("template learning adjustments", () => {
	afterEach(() => {
		resetLearningState();
	});

	it("freezes a template after repeated high-drift corrections", async () => {
		await recordTeacherAction({
			eventId: "evt-1",
			teacherId: "teacher-1",
			problemId: "doc-1::p1",
			timestamp: Date.now(),
			actionType: "template_override",
			oldValue: "remember",
			newValue: "analyze",
			context: { subject: "general", templateIds: ["definition-basic"] },
		});
		await recordTeacherAction({
			eventId: "evt-2",
			teacherId: "teacher-1",
			problemId: "doc-1::p2",
			timestamp: Date.now() + 1,
			actionType: "template_override",
			oldValue: "remember",
			newValue: "analyze",
			context: { subject: "general", templateIds: ["definition-basic"] },
		});
		await recordTeacherAction({
			eventId: "evt-3",
			teacherId: "teacher-1",
			problemId: "doc-1::p3",
			timestamp: Date.now() + 2,
			actionType: "template_override",
			oldValue: "remember",
			newValue: "analyze",
			context: { subject: "general", templateIds: ["definition-basic"] },
		});

		const records = await aggregateTemplateLearning();
		const record = records.find((entry) => entry.templateId === "definition-basic");

		expect(record?.frozen).toBe(true);
		expect(applyLearningAdjustments(genericTemplates, records).some((template) => template.id === "definition-basic")).toBe(false);
	});

	it("learns expected steps after repeated corrections", async () => {
		await recordTeacherAction({
			eventId: "evt-steps-1",
			teacherId: "teacher-1",
			problemId: "doc-1::p1",
			timestamp: Date.now(),
			actionType: "expected_steps_correction",
			oldValue: 0.1,
			newValue: { expectedSteps: 5, stepType: "mixed" },
			context: { subject: "general", templateIds: ["interpretation"] },
		});
		await recordTeacherAction({
			eventId: "evt-steps-2",
			teacherId: "teacher-1",
			problemId: "doc-1::p2",
			timestamp: Date.now() + 1,
			actionType: "expected_steps_correction",
			oldValue: 0.1,
			newValue: { expectedSteps: 4, stepType: "mixed" },
			context: { subject: "general", templateIds: ["interpretation"] },
		});

		const records = await aggregateTemplateLearning();
		const record = records.find((entry) => entry.templateId === "interpretation");
		const adjustedTemplate = applyLearningAdjustments(genericTemplates, records).find((template) => template.id === "interpretation");

		expect(record?.learnedExpectedSteps).toBe(5);
		expect(adjustedTemplate?.stepHints?.expectedSteps).toBe(5);
		expect(adjustedTemplate?.stepHints?.stepType).toBe("mixed");
	});
});