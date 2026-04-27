/**
 * Adjusts a raw step count for item difficulty.
 *
 * Easy items require fewer steps (less cognitive scaffolding in the answer key).
 * Hard items require more (additional justification, multi-step reasoning).
 */
export function adjustForDifficulty(steps: number, difficulty: "easy" | "medium" | "hard"): number {
	if (difficulty === "easy") return steps - 1;
	if (difficulty === "hard") return steps + 1;
	return steps;
}
