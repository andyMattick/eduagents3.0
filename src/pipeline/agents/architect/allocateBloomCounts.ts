/**
 * allocateBloomCounts.ts
 *
 * Largest-remainder (Hamilton) method for distributing a fixed integer
 * question count across Bloom levels from fractional targets.
 *
 * Guarantees:
 *   - Every level gets floor(fraction × questionCount) items minimum
 *   - Remainder is distributed one-by-one to the levels with the largest
 *     fractional parts (descending), breaking ties by level order
 *   - sum(output) === questionCount (enforced by invariant throw)
 *   - No Math.round, no silent pad/trim
 */

import type { CognitiveProcess } from "@/pipeline/contracts/BlueprintPlanV3_2";

export class FatalDistributionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalDistributionError";
  }
}

/**
 * Allocate an exact integer count per Bloom level using the largest-remainder
 * method. All values in `distribution` must be non-negative and sum to ≤ 1.0.
 *
 * @param distribution  Fractional weights per Bloom level (need not sum to 1.0;
 *                      any shortfall is distributed to "understand")
 * @param questionCount Target total number of questions (must be ≥ 1)
 * @returns             Integer counts per level summing exactly to questionCount
 */
export function allocateBloomCounts(
  distribution: Record<CognitiveProcess, number>,
  questionCount: number
): Record<CognitiveProcess, number> {
  if (questionCount < 1) {
    throw new FatalDistributionError(
      `[allocateBloomCounts] questionCount must be ≥ 1, got ${questionCount}`
    );
  }

  const levels: CognitiveProcess[] = [
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
  ];

  // Step 1: raw (fractional) count per level
  const raw: Record<CognitiveProcess, number> = {} as Record<CognitiveProcess, number>;
  for (const level of levels) {
    raw[level] = (distribution[level] ?? 0) * questionCount;
  }

  // Step 2: floor values
  const floored: Record<CognitiveProcess, number> = {} as Record<CognitiveProcess, number>;
  let floorSum = 0;
  for (const level of levels) {
    floored[level] = Math.floor(raw[level]);
    floorSum += floored[level];
  }

  // Step 3: remainder = how many +1 tokens to distribute
  const remainder = questionCount - floorSum;

  // Step 4: sort levels by fractional part DESC (ties resolved by level order)
  const fractionalParts: { level: CognitiveProcess; frac: number; idx: number }[] = levels.map(
    (level, idx) => ({
      level,
      frac: raw[level] - Math.floor(raw[level]),
      idx,
    })
  );

  fractionalParts.sort((a, b) =>
    b.frac !== a.frac ? b.frac - a.frac : a.idx - b.idx
  );

  // Step 5: distribute +1 to the top `remainder` levels
  const result = { ...floored };
  for (let i = 0; i < remainder; i++) {
    result[fractionalParts[i].level] += 1;
  }

  // Step 6: invariant — must sum exactly to questionCount
  const total = levels.reduce((sum, level) => sum + result[level], 0);
  if (total !== questionCount) {
    throw new FatalDistributionError(
      `[allocateBloomCounts] FatalDistributionError: expected sum=${questionCount}, got ${total}. ` +
      `Input: ${JSON.stringify(distribution)}, questionCount=${questionCount}`
    );
  }

  return result;
}
