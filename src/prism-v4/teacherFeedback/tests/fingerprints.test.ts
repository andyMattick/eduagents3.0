import { describe, expect, it } from "vitest";

import type { TestProduct } from "../../schema/integration/IntentProduct";
import {
	applyAssessmentFingerprintEdits,
	buildAssessmentFingerprint,
	classifyBloomLevel,
	classifyItemModes,
	classifyScenarioTypes,
	deriveItemCounts,
	explainFingerprintAlignment,
	mergeAssessmentIntoTeacherFingerprint,
	mergeAssessmentIntoUnitFingerprint,
} from "../fingerprints";

function buildTestProduct(): TestProduct {
	return {
		kind: "test",
		focus: null,
		title: "Statistics Quiz",
		overview: "Teacher-authored statistics assessment.",
		estimatedDurationMinutes: 20,
		sections: [
			{
				concept: "Hypothesis Testing",
				sourceDocumentIds: ["doc-1"],
				items: [
					{ itemId: "1", prompt: "Identify the parameter and statistic in the restaurant income study.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "conceptual", answerGuidance: "Look for the population parameter and sample statistic." },
					{ itemId: "2", prompt: "State the null hypothesis and alternative hypothesis for the claim.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "conceptual", answerGuidance: "Look for correct hypotheses." },
					{ itemId: "3", prompt: "Interpret the p-value from the class study and decide whether to reject the null hypothesis.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Look for a correct interpretation and decision." },
				],
			},
			{
				concept: "Simulation-Based Inference",
				sourceDocumentIds: ["doc-1"],
				items: [
					{ itemId: "4", prompt: "Use the dotplot from the simulation to explain how unusual the observed result is.", concept: "Simulation-Based Inference", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Look for simulation-based reasoning." },
				],
			},
		],
		totalItemCount: 4,
		generatedAt: "2026-03-28T00:00:00.000Z",
	};
}

function buildFrequencyTestProduct(): TestProduct {
	return {
		kind: "test",
		focus: null,
		title: "Frequency Test",
		overview: "Teacher-authored concept weighting test.",
		estimatedDurationMinutes: 30,
		sections: [
			{
				concept: "Hypothesis Testing",
				sourceDocumentIds: ["doc-1"],
				items: Array.from({ length: 4 }, (_, index) => ({
					itemId: `h-${index + 1}`,
					prompt: `State the null hypothesis and alternative hypothesis for study ${index + 1}.`,
					concept: "Hypothesis Testing",
					sourceDocumentId: "doc-1",
					sourceFileName: "quiz.pdf",
					difficulty: "medium" as const,
					cognitiveDemand: "conceptual" as const,
					answerGuidance: "Look for correct hypotheses.",
				})),
			},
			{
				concept: "P-Values & Decision Rules",
				sourceDocumentIds: ["doc-1"],
				items: Array.from({ length: 3 }, (_, index) => ({
					itemId: `p-${index + 1}`,
					prompt: `Interpret the p-value for sample ${index + 1} and make the decision at alpha = 0.05.`,
					concept: "P-Values & Decision Rules",
					sourceDocumentId: "doc-1",
					sourceFileName: "quiz.pdf",
					difficulty: "high" as const,
					cognitiveDemand: "analysis" as const,
					answerGuidance: "Look for a valid decision.",
				})),
			},
			{
				concept: "Type I and Type II Errors",
				sourceDocumentIds: ["doc-1"],
				items: Array.from({ length: 2 }, (_, index) => ({
					itemId: `e-${index + 1}`,
					prompt: `Which error is more serious in case ${index + 1} and why?`,
					concept: "Type I and Type II Errors",
					sourceDocumentId: "doc-1",
					sourceFileName: "quiz.pdf",
					difficulty: "high" as const,
					cognitiveDemand: "analysis" as const,
					answerGuidance: "Look for contextual evaluation.",
				})),
			},
			{
				concept: "Simulation-Based Inference",
				sourceDocumentIds: ["doc-1"],
				items: [{
					itemId: "s-1",
					prompt: "Use the dotplot from the simulation to explain how unusual the observed result is.",
					concept: "Simulation-Based Inference",
					sourceDocumentId: "doc-1",
					sourceFileName: "quiz.pdf",
					difficulty: "high",
					cognitiveDemand: "analysis",
					answerGuidance: "Look for simulation-based reasoning.",
				}],
			},
		],
		totalItemCount: 10,
		generatedAt: "2026-03-28T00:00:00.000Z",
	};
}

describe("teacher fingerprints", () => {
	it("classifies item modes across teacher assessment verbs", () => {
		expect(classifyItemModes("Identify the parameter and statistic.")).toContain("identify");
		expect(classifyItemModes("State the null hypothesis and alternative hypothesis.")).toContain("state");
		expect(classifyItemModes("Interpret the p-value in context.")).toContain("interpret");
		expect(classifyItemModes("Use the result to decide whether to reject the null hypothesis.")).toContain("apply");
		expect(classifyItemModes("Which error is more serious and why?")).toEqual(expect.arrayContaining(["evaluate", "analyze"]));
		expect(classifyItemModes("Interpret the p-value and justify your decision.")).toEqual(expect.arrayContaining(["interpret", "evaluate"]));
		expect(classifyItemModes("Explain a Type I error in context.")).toContain("explain");
	});

	it("maps prompts to bloom levels using the primary cognitive demand", () => {
		expect(classifyBloomLevel("Identify the parameter and statistic.")).toBe("remember");
		expect(classifyBloomLevel("State the null hypothesis and alternative hypothesis.")).toBe("understand");
		expect(classifyBloomLevel("Interpret the p-value in context.")).toBe("apply");
		expect(classifyBloomLevel("Compare the two decisions and justify which is stronger.")).toBe("analyze");
		expect(classifyBloomLevel("Which error is more serious and why?")).toBe("evaluate");
		expect(classifyBloomLevel("Construct your own significance-test scenario.")).toBe("create");
	});

	it("classifies scenario types for real-world, simulation, and abstract items", () => {
		expect(classifyScenarioTypes("A restaurant income study compares a sample mean to a claimed average.")).toContain("real-world");
		expect(classifyScenarioTypes("A Flint water quality study tests whether the average lead level changed.")).toContain("real-world");
		expect(classifyScenarioTypes("Use the dotplot from the simulation to interpret the result.")).toEqual(expect.arrayContaining(["simulation", "graphical"]));
		expect(classifyScenarioTypes("Given x + y = 10, compare the symbolic expressions.")).toContain("abstract-symbolic");
	});

	it("assigns multi-mode prompts to each tagged concept profile", () => {
		const fingerprint = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-multi-mode",
			product: {
				kind: "test",
				focus: null,
				title: "Shared Prompt Test",
				overview: "Shared prompt mode propagation.",
				estimatedDurationMinutes: 10,
				sections: [
					{
						concept: "Hypothesis Testing",
						sourceDocumentIds: ["doc-1"],
						items: [{ itemId: "1", prompt: "Interpret the p-value and justify your decision.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Justify it." }],
					},
					{
						concept: "Type I and Type II Errors",
						sourceDocumentIds: ["doc-1"],
						items: [{ itemId: "2", prompt: "Interpret the p-value and justify your decision.", concept: "Type I and Type II Errors", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Justify it." }],
					},
				],
				totalItemCount: 2,
				generatedAt: "2026-03-28T00:00:00.000Z",
			},
		});

		expect(fingerprint.conceptProfiles.find((profile) => profile.conceptId === "hypothesis-testing")?.itemModes).toEqual(expect.arrayContaining(["interpret", "evaluate"]));
		expect(fingerprint.conceptProfiles.find((profile) => profile.conceptId === "type-i-and-type-ii-errors")?.itemModes).toEqual(expect.arrayContaining(["interpret", "evaluate"]));
	});

	it("extracts concept frequencies and section ordering from a test product", () => {
		const fingerprint = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-1",
			unitId: "unit-1",
			product: buildTestProduct(),
			sourceType: "uploaded",
			now: "2026-03-28T00:00:00.000Z",
		});

		expect(fingerprint.itemCount).toBe(4);
		expect(fingerprint.flowProfile.sectionOrder).toEqual(["hypothesis-testing", "simulation-based-inference"]);
		expect(fingerprint.conceptProfiles[0]?.frequencyWeight).toBe(0.75);
		expect(fingerprint.conceptProfiles[0]?.absoluteItemHint).toBe(3);
		expect(fingerprint.conceptProfiles[0]?.itemModes).toEqual(expect.arrayContaining(["identify", "state", "interpret", "apply"]));
	});

	it("extracts concept frequency weights and absolute counts from a 10-item assessment", () => {
		const fingerprint = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-frequency",
			unitId: "unit-1",
			product: buildFrequencyTestProduct(),
			now: "2026-03-28T00:00:00.000Z",
		});

		expect(fingerprint.itemCount).toBe(10);
		expect(fingerprint.conceptProfiles).toEqual(expect.arrayContaining([
			expect.objectContaining({ conceptId: "hypothesis-testing", frequencyWeight: 0.4, absoluteItemHint: 4 }),
			expect.objectContaining({ conceptId: "p-values-decision-rules", frequencyWeight: 0.3, absoluteItemHint: 3 }),
			expect.objectContaining({ conceptId: "type-i-and-type-ii-errors", frequencyWeight: 0.2, absoluteItemHint: 2 }),
			expect.objectContaining({ conceptId: "simulation-based-inference", frequencyWeight: 0.1, absoluteItemHint: 1, lowEmphasis: true }),
		]));
	});

	it("captures per-concept bloom distributions and max bloom ceilings", () => {
		const fingerprint = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-bloom",
			product: {
				kind: "test",
				focus: null,
				title: "Bloom Test",
				overview: "Bloom distribution check.",
				estimatedDurationMinutes: 10,
				sections: [{
					concept: "Hypothesis Testing",
					sourceDocumentIds: ["doc-1"],
					items: [
						{ itemId: "1", prompt: "Identify the parameter.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "low", cognitiveDemand: "recall", answerGuidance: "Identify it." },
						{ itemId: "2", prompt: "State the null hypothesis.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "conceptual", answerGuidance: "State it." },
						{ itemId: "3", prompt: "Interpret the p-value in context.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "procedural", answerGuidance: "Interpret it." },
						{ itemId: "4", prompt: "Compare the decision and justify which conclusion is stronger.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "high", cognitiveDemand: "analysis", answerGuidance: "Analyze it." },
					],
				}],
				totalItemCount: 4,
				generatedAt: "2026-03-28T00:00:00.000Z",
			},
		});

		expect(fingerprint.conceptProfiles[0]?.bloomDistribution).toMatchObject({
			remember: 0.25,
			understand: 0.25,
			apply: 0.25,
			analyze: 0.25,
		});
		expect(fingerprint.conceptProfiles[0]?.maxBloomLevel).toBe("analyze");
	});

	it("aggregates assessment fingerprints into a unit and teacher fingerprint with ema smoothing", () => {
		const previous = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-1",
			unitId: "unit-1",
			product: buildTestProduct(),
			now: "2026-03-28T00:00:00.000Z",
		});
		const current = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-2",
			unitId: "unit-1",
			product: {
				...buildTestProduct(),
				sections: [buildTestProduct().sections[1]!, buildTestProduct().sections[0]!],
				totalItemCount: 4,
			},
			now: "2026-03-29T00:00:00.000Z",
		});

		const unit = mergeAssessmentIntoUnitFingerprint({ previous: null, assessment: previous, now: "2026-03-28T00:00:00.000Z" });
		const updatedUnit = mergeAssessmentIntoUnitFingerprint({ previous: unit, assessment: current, now: "2026-03-29T00:00:00.000Z" });
		const teacher = mergeAssessmentIntoTeacherFingerprint({ previous: null, assessment: previous, now: "2026-03-28T00:00:00.000Z" });
		const updatedTeacher = mergeAssessmentIntoTeacherFingerprint({ previous: teacher, assessment: current, now: "2026-03-29T00:00:00.000Z" });

		expect(updatedUnit.derivedFromAssessmentIds).toEqual(["assessment-1", "assessment-2"]);
		expect(updatedUnit.version).toBe(2);
		expect(updatedTeacher.version).toBe(2);
		expect(updatedTeacher.defaultScenarioPreferences).toContain("real-world");
		expect(updatedTeacher.defaultBloomDistribution.analyze).toBeGreaterThan(0);
	});

	it("keeps mixed scenario preferences when a teacher uses both real-world and abstract styles", () => {
		const realWorld = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-real",
			product: buildTestProduct(),
		});
		const abstract = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-abstract",
			product: {
				kind: "test",
				focus: null,
				title: "Abstract Test",
				overview: "Abstract symbolic prompts.",
				estimatedDurationMinutes: 9,
				sections: [{
					concept: "Hypothesis Testing",
					sourceDocumentIds: ["doc-1"],
					items: [{ itemId: "a-1", prompt: "Given x + y = 10, interpret the symbolic result.", concept: "Hypothesis Testing", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "medium", cognitiveDemand: "procedural", answerGuidance: "Interpret it." }],
				}],
				totalItemCount: 1,
				generatedAt: "2026-03-28T00:00:00.000Z",
			},
		});

		const teacher = mergeAssessmentIntoTeacherFingerprint({ previous: mergeAssessmentIntoTeacherFingerprint({ previous: null, assessment: realWorld }), assessment: abstract });

		expect(teacher.defaultScenarioPreferences).toEqual(expect.arrayContaining(["real-world", "abstract-symbolic"]));
	});

	it("keeps sparse concepts with low emphasis during multi-assessment aggregation", () => {
		let teacher = null;
		for (let index = 0; index < 5; index += 1) {
			teacher = mergeAssessmentIntoTeacherFingerprint({
				previous: teacher,
				assessment: buildAssessmentFingerprint({
					teacherId: "teacher-1",
					assessmentId: `assessment-${index}`,
					unitId: "unit-1",
					product: index === 4
						? {
							...buildTestProduct(),
							sections: [{
								concept: "Rare Concept",
								sourceDocumentIds: ["doc-1"],
								items: [{ itemId: "rare-1", prompt: "State the rare concept.", concept: "Rare Concept", sourceDocumentId: "doc-1", sourceFileName: "quiz.pdf", difficulty: "low", cognitiveDemand: "conceptual", answerGuidance: "State it." }],
							}],
							totalItemCount: 1,
						}
						: buildTestProduct(),
				}),
				now: `2026-03-2${index}T00:00:00.000Z`,
			});
		}

		const rareConcept = teacher?.globalConceptProfiles.find((profile) => profile.conceptId === "rare-concept");
		expect(rareConcept).toBeTruthy();
		expect(rareConcept?.frequencyWeight).toBeGreaterThan(0);
		expect(rareConcept?.lowEmphasis).toBe(true);
	});

	it("applies teacher edits for removing, adding, merging, and overriding concept profiles", () => {
		const assessment = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-edit",
			unitId: "unit-1",
			product: buildFrequencyTestProduct(),
			now: "2026-03-28T00:00:00.000Z",
		});

		const edited = applyAssessmentFingerprintEdits({
			assessment,
			edits: {
				removeConceptIds: ["simulation-based-inference"],
				addConcepts: [{ displayName: "Confidence Intervals", absoluteItemHint: 2, maxBloomLevel: "apply", scenarioPatterns: ["real-world"], itemModes: ["interpret"] }],
				mergeConcepts: [{ conceptIds: ["hypothesis-testing", "p-values-decision-rules"], mergedConceptId: "significance-testing", displayName: "Significance Testing" }],
				itemCountOverrides: { "type-i-and-type-ii-errors": 4 },
				bloomCeilings: { "type-i-and-type-ii-errors": "analyze" },
				scenarioOverrides: { "type-i-and-type-ii-errors": ["real-world"] },
				sectionOrder: ["significance-testing", "type-i-and-type-ii-errors", "confidence-intervals"],
				now: "2026-03-29T00:00:00.000Z",
			},
		});

		expect(edited.version).toBe(2);
		expect(edited.conceptProfiles.find((profile) => profile.conceptId === "simulation-based-inference")).toBeUndefined();
		expect(edited.conceptProfiles.find((profile) => profile.conceptId === "confidence-intervals")).toMatchObject({
			absoluteItemHint: 2,
			maxBloomLevel: "apply",
			scenarioPatterns: ["real-world"],
		});
		expect(edited.conceptProfiles.find((profile) => profile.conceptId === "significance-testing")).toMatchObject({
			absoluteItemHint: 7,
		});
		expect(edited.conceptProfiles.find((profile) => profile.conceptId === "type-i-and-type-ii-errors")).toMatchObject({
			absoluteItemHint: 4,
			maxBloomLevel: "analyze",
			scenarioPatterns: ["real-world"],
		});
		expect(edited.flowProfile.sectionOrder.slice(0, 3)).toEqual(["significance-testing", "type-i-and-type-ii-errors", "confidence-intervals"]);
	});

	it("raises bloom ceilings and shifts distributions upward when a teacher adds a higher-order item", () => {
		const assessment = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-bloom-raise",
			product: buildTestProduct(),
		});
		const before = assessment.conceptProfiles.find((profile) => profile.conceptId === "hypothesis-testing");
		const edited = applyAssessmentFingerprintEdits({
			assessment,
			edits: {
				bloomLevelAppends: { "hypothesis-testing": ["evaluate"] },
				now: "2026-03-29T00:00:00.000Z",
			},
		});
		const after = edited.conceptProfiles.find((profile) => profile.conceptId === "hypothesis-testing");

		expect(after?.maxBloomLevel).toBe("evaluate");
		expect((after?.bloomDistribution.evaluate ?? 0)).toBeGreaterThan(before?.bloomDistribution.evaluate ?? 0);
	});

	it("explains how an assessment matches the teacher fingerprint", () => {
		const assessment = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-1",
			unitId: "unit-1",
			product: buildTestProduct(),
			now: "2026-03-28T00:00:00.000Z",
		});
		const teacher = mergeAssessmentIntoTeacherFingerprint({ previous: null, assessment, now: "2026-03-28T00:00:00.000Z" });
		const unit = mergeAssessmentIntoUnitFingerprint({ previous: null, assessment, now: "2026-03-28T00:00:00.000Z" });

		const explanation = explainFingerprintAlignment({
			assessment,
			teacherFingerprint: teacher,
			unitFingerprint: unit,
		});

		expect(explanation.narrative).toContain("teacher fingerprint");
		expect(explanation.conceptReasons.some((reason) => reason.includes("Hypothesis Testing"))).toBe(true);
		expect(explanation.bloomReason).toContain("Bloom levels follow");
		expect(explanation.scenarioReason).toContain("Scenario choices reflect preferred contexts");
		expect(explanation.flowReason).toContain("Section order follows the teacher flow profile");
	});

	it("derives item counts from concept weights unless explicit overrides are present", () => {
		const fingerprint = buildAssessmentFingerprint({
			teacherId: "teacher-1",
			assessmentId: "assessment-1",
			unitId: "unit-1",
			product: buildTestProduct(),
		});

		const counts = deriveItemCounts({
			concepts: fingerprint.conceptProfiles,
			flowProfile: fingerprint.flowProfile,
		});

		expect(counts["hypothesis-testing"]).toBeGreaterThanOrEqual(counts["simulation-based-inference"]);
		expect(deriveItemCounts({
			concepts: fingerprint.conceptProfiles,
			flowProfile: fingerprint.flowProfile,
			overrides: { "hypothesis-testing": 2, "simulation-based-inference": 5 },
		})).toEqual({ "hypothesis-testing": 2, "simulation-based-inference": 5 });
	});
});