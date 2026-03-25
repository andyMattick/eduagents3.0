import { afterEach, describe, expect, it } from "vitest";

import { runSemanticPipeline } from "../pipeline/runSemanticPipeline";
import { deleteProblemOverride, getProblemOverride, resetTeacherFeedbackState, saveTeacherFeedback, upsertTeacherDerivedTemplateRecord } from "../../teacherFeedback";
import { loadTemplateLearning, recordTeacherAction } from "../learning";
import type { TaggingPipelineInput } from "../../schema/semantic";

function buildInput(documentId = "doc-1", content = "1. Solve the equation.") : TaggingPipelineInput {
	return {
		documentId,
		fileName: `${documentId}.pdf`,
		azureExtract: {
			fileName: `${documentId}.pdf`,
			content,
			pages: [{ pageNumber: 1, text: content }],
			paragraphs: content.split("\n").map((text) => ({ text, pageNumber: 1 })),
			tables: [],
			readingOrder: content.split("\n"),
		},
	};
}

describe("teacher feedback integration", () => {
	afterEach(() => {
		resetTeacherFeedbackState();
	});

	it("replaces bloom, difficulty, concepts, subject and domain via overrides", async () => {
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "bloom", aiValue: "remember", teacherValue: "analyze" });
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "difficulty", aiValue: 0.2, teacherValue: 0.8 });
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "concepts", aiValue: {}, teacherValue: { "teacher.concept": 1 } });
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "subject", aiValue: "general", teacherValue: "science" });
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "domain", aiValue: "general", teacherValue: "lab-design" });

		const output = await runSemanticPipeline(buildInput());
		const problem = output.problems[0]!;

		expect(problem.tags?.cognitive.bloom.analyze).toBe(1);
		expect(problem.tags?.difficulty).toBe(0.8);
		expect(problem.tags?.concepts).toEqual({ "teacher.concept": 1 });
		expect(problem.tags?.subject).toBe("science");
		expect(problem.tags?.domain).toBe("lab-design");
	});

	it("applies text and segmentation overrides without changing immutable ids", async () => {
		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: "doc-1",
			canonicalProblemId: "doc-1::p1",
			target: "stemText",
			aiValue: "Solve the equation.",
			teacherValue: "Revised teacher stem.",
		});
		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: "doc-1",
			canonicalProblemId: "doc-1::p1",
			target: "segmentation",
			aiValue: null,
			teacherValue: { reassignRequested: true },
		});

		const output = await runSemanticPipeline(buildInput());
		const problem = output.problems[0]!;

		expect(problem.stemText).toBe("Revised teacher stem.");
		expect((problem.tags as Record<string, unknown>).teacherSegmentation).toEqual({ reassignRequested: true });
		expect(problem.canonicalProblemId).toBe("doc-1::p1");
		expect(problem.displayOrder).toBe(1000);
	});

	it("persists overrides across runs", async () => {
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "difficulty", aiValue: 0.2, teacherValue: 0.7 });

		const first = await runSemanticPipeline(buildInput());
		const second = await runSemanticPipeline(buildInput());

		expect(first.problems[0]?.tags?.difficulty).toBe(0.7);
		expect(second.problems[0]?.tags?.difficulty).toBe(0.7);
	});

	it("increments override version metadata across teacher edits", async () => {
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "difficulty", aiValue: 0.2, teacherValue: 0.7 });
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "multiStep", aiValue: 0.1, teacherValue: 0.6 });

		const override = await getProblemOverride("doc-1::p1");
		const output = await runSemanticPipeline(buildInput());

		expect(override?.overrideVersion).toBe(2);
		expect(override?.lastUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(output.problems[0]?.tags?.teacherAdjustments).toEqual({
			overrideVersion: 2,
			lastUpdatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
		});
		expect(output.problems[0]?.tags?.reasoning?.overridesApplied).toBe(true);
	});

	it("rejects invalid override values", async () => {
		await expect(saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: "doc-1",
			canonicalProblemId: "doc-1::p1",
			target: "difficulty",
			aiValue: 0.2,
			teacherValue: 1.4,
		})).rejects.toThrow("INVALID_OVERRIDE: difficulty must be in [0,1]");
	});

	it("fires teacher-derived templates on new problems", async () => {
		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: "doc-1",
			canonicalProblemId: "doc-1::p1",
			target: "bloom",
			aiValue: "understand",
			teacherValue: "evaluate",
			evidence: { text: "anomalous phrase" },
		});

		const output = await runSemanticPipeline(buildInput("doc-2", "1. Explain the anomalous phrase in the passage."));
		const problem = output.problems[0]!;

		expect(problem.tags?.cognitive.bloom.evaluate).toBeGreaterThan(0);
	});

	it("lets a strong teacher template override a system template without changing public output shape", async () => {
		const baseline = await runSemanticPipeline(buildInput("doc-strong-teacher", "1. Explain the anomalous phrase in the passage."));
		await upsertTeacherDerivedTemplateRecord({
			id: "teacher-derived-strong-template",
			teacherId: "teacher-1",
			sourceFeedbackId: "feedback-strong-template",
			evidenceText: "anomalous phrase",
			name: "Teacher Strong Template",
			archetypeKey: "teacher-derived",
			patternConfig: {
				textPatterns: ["anomalous phrase"],
				structuralPatterns: ["constructedResponse"],
				regexPatterns: [],
				minConfidence: 0.85,
			},
			stepHints: {
				expectedSteps: 5,
				stepType: "mixed",
			},
			bloom: { evaluate: 0.9, analyze: 0.4 },
			multiStepBoost: 0.95,
			createdAt: new Date().toISOString(),
		});

		const output = await runSemanticPipeline(buildInput("doc-strong-teacher", "1. Explain the anomalous phrase in the passage."));
		const problem = output.problems[0]!;

		expect(problem.tags?.cognitive.multiStep ?? 0).toBeGreaterThan(baseline.problems[0]?.tags?.cognitive.multiStep ?? 0);
		expect(problem.tags?.reasoning).not.toHaveProperty("expectedSteps");
		expect(problem.tags?.reasoning).not.toHaveProperty("stepSource");
		expect(problem).not.toHaveProperty("reasoning");
	});

	it("records learning context from teacher feedback without changing public output shape", async () => {
		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: "doc-1",
			canonicalProblemId: "doc-1::p1",
			target: "difficulty",
			aiValue: 0.2,
			teacherValue: 0.7,
			context: {
				subject: "general",
				templateIds: ["definition-basic"],
			},
		});

		const learning = await loadTemplateLearning();
		const output = await runSemanticPipeline(buildInput());

		expect(learning.find((record) => record.templateId === "definition-basic")?.teacherOverrides).toBeGreaterThan(0);
		expect(output.problems[0]?.tags?.reasoning).not.toHaveProperty("expectedSteps");
		expect(output.problems[0]).not.toHaveProperty("reasoning");
	});

	it("applies learned expected-step adjustments only when learning data is present", async () => {
		const baseline = await runSemanticPipeline(buildInput("doc-steps", "1. Interpret the graph and explain the trend."));

		await recordTeacherAction({
			eventId: "learn-steps-1",
			teacherId: "teacher-1",
			problemId: "doc-steps::p1",
			timestamp: Date.now(),
			actionType: "expected_steps_correction",
			oldValue: 0.2,
			newValue: { expectedSteps: 5, stepType: "mixed" },
			context: { subject: "general", templateIds: ["interpretation"] },
		});
		await recordTeacherAction({
			eventId: "learn-steps-2",
			teacherId: "teacher-1",
			problemId: "doc-steps::p2",
			timestamp: Date.now() + 1,
			actionType: "expected_steps_correction",
			oldValue: 0.2,
			newValue: { expectedSteps: 5, stepType: "mixed" },
			context: { subject: "general", templateIds: ["interpretation"] },
		});

		const learned = await runSemanticPipeline(buildInput("doc-steps", "1. Interpret the graph and explain the trend."));

		expect(learned.problems[0]?.tags?.cognitive.multiStep ?? 0).toBeGreaterThan(baseline.problems[0]?.tags?.cognitive.multiStep ?? 0);
		expect(learned.problems[0]?.tags?.reasoning).not.toHaveProperty("expectedSteps");
	});

	it("removes teacher adjustments after reset", async () => {
		await saveTeacherFeedback({ teacherId: "teacher-1", documentId: "doc-1", canonicalProblemId: "doc-1::p1", target: "difficulty", aiValue: 0.2, teacherValue: 0.7 });
		await deleteProblemOverride("doc-1::p1");

		const output = await runSemanticPipeline(buildInput());

		expect(output.problems[0]?.tags?.teacherAdjustments).toBeUndefined();
		expect(output.problems[0]?.tags?.reasoning?.overridesApplied).toBe(false);
	});
});