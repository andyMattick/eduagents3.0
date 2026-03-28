import { afterEach, describe, expect, it } from "vitest";

import type { TestProduct } from "../../schema/integration/IntentProduct";
import { buildAssessmentFingerprint } from "../fingerprints";
import {
	explainAssessmentFingerprintAlignment,
	getAssessmentFingerprint,
	getTeacherFingerprint,
	getUnitFingerprint,
	resetTeacherFeedbackState,
	saveTeacherFeedback,
	saveAssessmentFingerprint,
	updateAssessmentFingerprint,
} from "../store";

function buildProduct(args: {
	concept: string;
	prompts: string[];
	assessmentTitle: string;
}): TestProduct {
	return {
		kind: "test",
		focus: null,
		title: args.assessmentTitle,
		overview: `${args.assessmentTitle} overview.`,
		estimatedDurationMinutes: args.prompts.length * 3,
		sections: [{
			concept: args.concept,
			sourceDocumentIds: ["doc-1"],
			items: args.prompts.map((prompt, index) => ({
				itemId: `${args.concept}-${index + 1}`,
				prompt,
				concept: args.concept,
				sourceDocumentId: "doc-1",
				sourceFileName: "quiz.pdf",
				difficulty: index === 0 ? "medium" : "high",
				cognitiveDemand: prompt.toLowerCase().includes("why") ? "analysis" : "conceptual",
				answerGuidance: `Look for accurate reasoning about ${args.concept}.`,
			})),
		}],
		totalItemCount: args.prompts.length,
		generatedAt: "2026-03-28T00:00:00.000Z",
	};
	}

describe("teacher feedback fingerprint store", () => {
	afterEach(() => {
		resetTeacherFeedbackState();
	});

	it("stores generated assessment fingerprints and aggregates unit and teacher fingerprints", async () => {
		const first = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-1",
			unitId: "unit-a",
			product: buildProduct({
				concept: "Hypothesis Testing",
				prompts: [
					"State the null hypothesis and alternative hypothesis.",
					"Interpret the p-value and make the decision at alpha = 0.05.",
				],
				assessmentTitle: "Assessment One",
			}),
			sourceType: "generated",
			now: "2026-03-28T00:00:00.000Z",
		});
		const second = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-2",
			unitId: "unit-b",
			product: buildProduct({
				concept: "Type I and Type II Errors",
				prompts: [
					"Describe a Type I error in the restaurant income study.",
					"Which error is more serious in the restaurant income study and why?",
				],
				assessmentTitle: "Assessment Two",
			}),
			sourceType: "generated",
			now: "2026-03-29T00:00:00.000Z",
		});

		await saveAssessmentFingerprint(first);
		const storedSecond = await saveAssessmentFingerprint(second);

		expect(storedSecond.assessment.sourceType).toBe("generated");
		expect(await getAssessmentFingerprint("assessment-1")).toMatchObject({ assessmentId: "assessment-1", sourceType: "generated" });
		expect(await getUnitFingerprint("teacher-1", "unit-a")).toMatchObject({
			teacherId: "teacher-1",
			unitId: "unit-a",
			derivedFromAssessmentIds: ["assessment-1"],
		});
		expect(await getTeacherFingerprint("teacher-1")).toMatchObject({
			teacherId: "teacher-1",
			version: 2,
		});
		expect((await getTeacherFingerprint("teacher-1"))?.globalConceptProfiles.map((profile) => profile.conceptId)).toEqual(
			expect.arrayContaining(["hypothesis-testing", "type-i-and-type-ii-errors"]),
		);
	});

	it("updates stored assessment fingerprints and recomputes aggregated teacher preferences", async () => {
		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-1",
			unitId: "unit-a",
			product: {
				kind: "test",
				focus: null,
				title: "Editable Assessment",
				overview: "Editable overview.",
				estimatedDurationMinutes: 12,
				sections: [
					{
						concept: "Hypothesis Testing",
						sourceDocumentIds: ["doc-1"],
						items: [
							{ itemId: "1", prompt: "State the null hypothesis.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "conceptual", answerGuidance: "State it." },
							{ itemId: "2", prompt: "Interpret the p-value.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Interpret it." },
						],
					},
					{
						concept: "P-Values & Decision Rules",
						sourceDocumentIds: ["doc-1"],
						items: [
							{ itemId: "3", prompt: "What decision at alpha = 0.05?", concept: "P-Values & Decision Rules", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Decide it." },
						],
					},
				],
				totalItemCount: 3,
				generatedAt: "2026-03-28T00:00:00.000Z",
			},
			now: "2026-03-28T00:00:00.000Z",
		}));

		const updated = await updateAssessmentFingerprint({
			assessmentId: "assessment-1",
			edits: {
				removeConceptIds: ["p-values-decision-rules"],
				addConcepts: [{ displayName: "Simulation-Based Inference", absoluteItemHint: 1, maxBloomLevel: "analyze", scenarioPatterns: ["simulation"], itemModes: ["analyze"] }],
				itemCountOverrides: { "hypothesis-testing": 4 },
				bloomCeilings: { "hypothesis-testing": "analyze" },
				scenarioOverrides: { "hypothesis-testing": ["real-world"] },
				sectionOrder: ["hypothesis-testing", "simulation-based-inference"],
				now: "2026-03-29T00:00:00.000Z",
			},
		});

		expect(updated).not.toBeNull();
		expect(updated?.assessment.conceptProfiles.map((profile) => profile.conceptId)).toEqual(["hypothesis-testing", "simulation-based-inference"]);
		expect(updated?.assessment.conceptProfiles[0]).toMatchObject({ absoluteItemHint: 4, maxBloomLevel: "analyze", scenarioPatterns: ["real-world"] });
		expect(updated?.unit?.flowProfile.sectionOrder).toEqual(["hypothesis-testing", "simulation-based-inference"]);
		expect(updated?.teacher?.globalConceptProfiles.map((profile) => profile.conceptId)).toEqual(["hypothesis-testing", "simulation-based-inference"]);
	});

	it("explains stored assessment alignment against teacher and unit fingerprints", async () => {
		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-1",
			unitId: "unit-a",
			product: buildProduct({
				concept: "Type I and Type II Errors",
				prompts: [
					"Describe a Type I error in the restaurant income study.",
					"Which error is more serious in the restaurant income study and why?",
				],
				assessmentTitle: "Explainable Assessment",
			}),
			now: "2026-03-28T00:00:00.000Z",
		}));

		const explanation = await explainAssessmentFingerprintAlignment("assessment-1");

		expect(explanation).not.toBeNull();
		expect(explanation?.narrative).toContain("teacher fingerprint");
		expect(explanation?.conceptReasons[0]).toContain("Type I and Type II Errors");
		expect(explanation?.flowReason).toContain("Section order follows the teacher flow profile");
	});

	it("recomputes teacher weights, bloom levels, and scenario preferences after adaptive edits", async () => {
		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-1",
			unitId: "unit-a",
			product: {
				kind: "test",
				focus: null,
				title: "Adaptive Assessment",
				overview: "Adaptive overview.",
				estimatedDurationMinutes: 15,
				sections: [
					{
						concept: "P-Values & Decision Rules",
						sourceDocumentIds: ["doc-1"],
						items: [
							{ itemId: "1", prompt: "Interpret the p-value for the restaurant income study.", concept: "P-Values & Decision Rules", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "procedural", answerGuidance: "Interpret it." },
							{ itemId: "2", prompt: "What decision at alpha = 0.05 for the restaurant income study?", concept: "P-Values & Decision Rules", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Decide it." },
							{ itemId: "3", prompt: "Explain whether the result is practically important.", concept: "P-Values & Decision Rules", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Explain it." },
						],
					},
					{
						concept: "Hypothesis Testing",
						sourceDocumentIds: ["doc-1"],
						items: [
							{ itemId: "4", prompt: "State the null hypothesis.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "conceptual", answerGuidance: "State it." },
						],
					},
				],
				totalItemCount: 4,
				generatedAt: "2026-03-28T00:00:00.000Z",
			},
			now: "2026-03-28T00:00:00.000Z",
		}));

		const beforeTeacher = await getTeacherFingerprint("teacher-1");
		const beforeProfile = beforeTeacher?.globalConceptProfiles.find((profile) => profile.conceptId === "p-values-decision-rules");

		const updated = await updateAssessmentFingerprint({
			assessmentId: "assessment-1",
			edits: {
				itemCountOverrides: { "p-values-decision-rules": 1 },
				bloomLevelAppends: { "p-values-decision-rules": ["evaluate"] },
				scenarioOverrides: { "p-values-decision-rules": ["abstract-symbolic"] },
				now: "2026-03-29T00:00:00.000Z",
			},
		});

		const afterTeacher = await getTeacherFingerprint("teacher-1");
		const afterProfile = afterTeacher?.globalConceptProfiles.find((profile) => profile.conceptId === "p-values-decision-rules");

		expect(updated).not.toBeNull();
		expect((afterProfile?.frequencyWeight ?? 0)).toBeLessThan(beforeProfile?.frequencyWeight ?? 1);
		expect(afterProfile?.maxBloomLevel).toBe("evaluate");
		expect((afterProfile?.bloomDistribution.evaluate ?? 0)).toBeGreaterThan(beforeProfile?.bloomDistribution.evaluate ?? 0);
		expect(afterTeacher?.defaultScenarioPreferences).toContain("abstract-symbolic");
	});

	it("aggregates dominant section order across multiple stored assessments", async () => {
		const buildOrderedProduct = (title: string, concepts: string[]) => ({
			kind: "test" as const,
			focus: null,
			title,
			overview: `${title} overview.`,
			estimatedDurationMinutes: concepts.length * 3,
			sections: concepts.map((concept, index) => ({
				concept,
				sourceDocumentIds: ["doc-1"],
				items: [{ itemId: `${index + 1}`, prompt: `State ${concept}.`, concept, sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium" as const, cognitiveDemand: "conceptual" as const, answerGuidance: `State ${concept}.` }],
			})),
			totalItemCount: concepts.length,
			generatedAt: "2026-03-28T00:00:00.000Z",
		});

		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-a",
			unitId: "unit-a",
			product: buildOrderedProduct("A", ["Proportion", "Mean", "P-Values"]),
			now: "2026-03-28T00:00:00.000Z",
		}));
		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-b",
			unitId: "unit-a",
			product: buildOrderedProduct("B", ["Proportion", "Mean", "P-Values"]),
			now: "2026-03-29T00:00:00.000Z",
		}));
		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-c",
			unitId: "unit-a",
			product: buildOrderedProduct("C", ["Mean", "Proportion", "P-Values"]),
			now: "2026-03-30T00:00:00.000Z",
		}));

		const teacher = await getTeacherFingerprint("teacher-1");
		expect(teacher?.flowProfile.sectionOrder.slice(0, 3)).toEqual(["proportion", "mean", "p-values"]);
	});

	it("ingests assessment-linked teacher feedback into fingerprint edits", async () => {
		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-ingest",
			unitId: "unit-a",
			product: {
				kind: "test",
				focus: null,
				title: "Feedback Driven Assessment",
				overview: "Feedback Driven Assessment overview.",
				estimatedDurationMinutes: 9,
				sections: [
					{
						concept: "Hypothesis Testing",
						sourceDocumentIds: ["doc-1"],
						items: [
							{ itemId: "1", prompt: "State the null hypothesis.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "conceptual", answerGuidance: "State it." },
						],
					},
				],
				totalItemCount: 1,
				generatedAt: "2026-03-28T00:00:00.000Z",
			},
			now: "2026-03-28T00:00:00.000Z",
		}));

		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: "doc-1",
			canonicalProblemId: "doc-1::p1",
			target: "bloom",
			aiValue: "understand",
			teacherValue: "analyze",
			context: {
				subject: "statistics",
				assessmentId: "assessment-ingest",
				unitId: "unit-a",
				conceptId: "Hypothesis Testing",
				scenarioType: "real-world",
				scope: "assessment-item",
			},
		});

		await saveTeacherFeedback({
			teacherId: "teacher-1",
			documentId: "doc-1",
			canonicalProblemId: "doc-1::p1",
			target: "concepts",
			aiValue: { "Hypothesis Testing": 1 },
			teacherValue: { "Hypothesis Testing": 1, "Simulation-Based Inference": 1 },
			context: {
				subject: "statistics",
				assessmentId: "assessment-ingest",
				unitId: "unit-a",
				scope: "instructional-unit",
			},
		});

		const updated = await getAssessmentFingerprint("assessment-ingest");
		const teacher = await getTeacherFingerprint("teacher-1");

		expect(updated?.conceptProfiles.map((profile) => profile.conceptId)).toEqual(["hypothesis-testing", "simulation-based-inference"]);
		expect(updated?.conceptProfiles.find((profile) => profile.conceptId === "hypothesis-testing")).toMatchObject({
			maxBloomLevel: "analyze",
			scenarioPatterns: ["real-world"],
		});
		expect(updated?.flowProfile.sectionOrder).toEqual(["hypothesis-testing", "simulation-based-inference"]);
		expect(teacher?.globalConceptProfiles.map((profile) => profile.conceptId)).toContain("simulation-based-inference");
	});
});
