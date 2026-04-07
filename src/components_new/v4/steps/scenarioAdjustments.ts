import type { ScenarioComplexity } from "./stepTypes";

/**
 * Adjusts a raw step count based on scenario complexity.
 *
 * High-complexity scenarios require an extra step to unpack context before
 * the student can begin solving. Low/medium complexity scenarios are neutral.
 */
export function adjustForScenario(steps: number, complexity: ScenarioComplexity): number {
	if (complexity === "high") return steps + 1;
	return steps;
}
