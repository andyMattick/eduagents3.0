/**
 * src/lib/loadScore.ts — Proprietary per-item load score
 *
 * Aggregates measurables + predicted state signals into a single 0–1 score.
 * Higher values = higher cognitive / emotional burden for that student profile.
 * Weights are tunable constants — adjust as training data accumulates.
 */

import type { SimulationMeasurables, SimulationPredictedStates } from "../types/simulator";

const WEIGHTS = {
	cognitiveLoad: 0.35,
	difficulty: 0.25,   // normalised 1–5 → 0–1
	timeToProcess: 0.15, // capped at 30 s
	readingLoad: 0.10,
	confusion: 0.10,
	guessing: 0.05,
} as const;

/**
 * Compute a 0–1 load score for a single item + profile combination.
 *
 * @param measurables  Per-item measurable metrics.
 * @param states       Profile-level predicted state vector.
 */
export function computeLoadScore(
	measurables: SimulationMeasurables,
	states: SimulationPredictedStates,
): number {
	const difficulty01 = (measurables.difficulty - 1) / 4;
	const timeNorm = Math.min(measurables.timeToProcessSeconds / 30, 1);

	const raw =
		WEIGHTS.cognitiveLoad * measurables.cognitiveLoad +
		WEIGHTS.difficulty * difficulty01 +
		WEIGHTS.timeToProcess * timeNorm +
		WEIGHTS.readingLoad * measurables.readingLoad +
		WEIGHTS.confusion * states.confusion +
		WEIGHTS.guessing * states.guessing;

	return Math.min(Math.max(raw, 0), 1);
}
