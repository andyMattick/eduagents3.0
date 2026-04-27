import type { DifficultyLevel } from "../assessmentTypes";

/**
 * Distributes item count across difficulty levels.
 * - Non-mixed modes assign the entire count to a single level.
 * - "mixed" splits 30 % easy / 50 % medium / 20 % hard (rounding remainder to hard).
 */
export function allocateDifficulty(
	count: number,
	mode: DifficultyLevel | "mixed",
): Record<DifficultyLevel, number> {
	if (mode !== "mixed") {
		const alloc = { easy: 0, medium: 0, hard: 0 };
		alloc[mode] = count;
		return alloc;
	}

	const easy = Math.round(count * 0.3);
	const medium = Math.round(count * 0.5);
	const hard = count - easy - medium;

	return { easy, medium, hard: Math.max(0, hard) };
}
