import type { DifficultyLevel, ItemType } from "./assessmentTypes";

/**
 * Describes how each difficulty level should shape an assessment item.
 * Inject these descriptors into the LLM user prompt to constrain generation.
 */
export const DIFFICULTY_RULES: Record<
	DifficultyLevel,
	{ cognitive: string; distractors: string; scenario: string; steps: number }
> = {
	easy: {
		cognitive: "recall or direct interpretation — student identifies or restates the concept",
		distractors: "simple, clearly incorrect options that test surface-level confusion",
		scenario: "minimal or no scenario context required",
		steps: 1,
	},
	medium: {
		cognitive: "apply the concept in a realistic scenario — student must transfer knowledge",
		distractors: "plausible but incorrect options that reflect common errors",
		scenario: "a concrete, single-step real-world context",
		steps: 2,
	},
	hard: {
		cognitive: "multi-step reasoning or subtle misconception trap — student must evaluate or synthesize",
		distractors: "misconception-based options that seem correct to a student with partial understanding",
		scenario: "complex or layered context requiring interpretation before application",
		steps: 3,
	},
};

/**
 * Returns the estimated completion time in seconds for an item, accounting for
 * both item type complexity and difficulty level.
 *
 * Replaces the flat `TIME_BY_TYPE` tables that ignored difficulty.
 */
export function difficultyToTime(type: ItemType, difficulty: DifficultyLevel): number {
	const times: Record<ItemType, Record<DifficultyLevel, number>> = {
		mc:           { easy: 45, medium: 60, hard: 75 },
		short_answer: { easy: 60, medium: 90, hard: 120 },
		frq:          { easy: 150, medium: 210, hard: 300 },
	};
	return times[type]?.[difficulty] ?? 60;
}
