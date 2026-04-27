import type { CognitiveProfile } from "../../schema/semantic";
import type { TeacherFeedback, TeacherDerivedTemplateRecord } from "../../teacherFeedback";

function oneHotBloom(value: unknown): Partial<CognitiveProfile["bloom"]> {
	if (typeof value !== "string") {
		return typeof value === "object" && value ? value as Partial<CognitiveProfile["bloom"]> : {};
	}

	return {
		remember: value === "remember" ? 1 : 0,
		understand: value === "understand" ? 1 : 0,
		apply: value === "apply" ? 1 : 0,
		analyze: value === "analyze" ? 1 : 0,
		evaluate: value === "evaluate" ? 1 : 0,
		create: value === "create" ? 1 : 0,
	};
}

export function deriveTemplateFromFeedback(feedback: TeacherFeedback): Partial<TeacherDerivedTemplateRecord> | null {
	const evidenceText = feedback.evidence?.text?.trim();
	if (!evidenceText) {
		return null;
	}

	if (!["bloom", "difficulty", "multiStep", "concepts", "misconceptionRisk"].includes(feedback.target)) {
		return null;
	}

	const difficultyDelta = typeof feedback.teacherValue === "number" && typeof feedback.aiValue === "number"
		? feedback.teacherValue - feedback.aiValue
		: undefined;
	const misconceptionDelta = typeof feedback.teacherValue === "number" && typeof feedback.aiValue === "number"
		? feedback.teacherValue - feedback.aiValue
		: undefined;
	const multiStepValue = typeof feedback.teacherValue === "number" ? Math.min(1, Math.max(0, feedback.teacherValue)) : undefined;

	return {
		name: `Teacher Pattern: ${evidenceText.slice(0, 40)}`,
		archetypeKey: "teacher-derived",
		evidenceText,
		patternConfig: {
			textPatterns: [evidenceText.toLowerCase()],
			structuralPatterns: [],
			regexPatterns: [],
			minConfidence: 0.85,
		},
		bloom: feedback.target === "bloom"
			? oneHotBloom(feedback.teacherValue)
			: feedback.target === "multiStep"
				? { apply: 0.2, analyze: Number(feedback.teacherValue) > Number(feedback.aiValue) ? 0.2 : 0.05 }
				: undefined,
		difficultyBoost: feedback.target === "difficulty" || feedback.target === "multiStep" ? difficultyDelta : undefined,
		multiStepBoost: feedback.target === "multiStep" ? multiStepValue : undefined,
		misconceptionRiskBoost: feedback.target === "misconceptionRisk" ? misconceptionDelta : undefined,
		stepHints: feedback.target === "multiStep" && typeof multiStepValue === "number"
			? {
				expectedSteps: Math.min(6, Math.max(1, Math.round(1 + multiStepValue * 5))),
				stepType: multiStepValue >= 0.55 ? "mixed" : "conceptual",
			}
			: undefined,
	};
}