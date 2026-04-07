import type { LearnerProfile } from "./stepTypes";

/**
 * Adjusts a raw step count for the target learner profile.
 *
 * Support / accessible / IEP-504 learners benefit from more explicit scaffolding
 * (each step broken into a smaller chunk). Challenge learners receive compressed
 * steps that require more independent reasoning.
 */
export function adjustForLearner(steps: number, profile: LearnerProfile): number {
	switch (profile) {
		case "support":    return steps + 1;
		case "accessible": return steps + 1;
		case "iep504":     return steps + 2;
		case "challenge":  return steps - 1;
		default:           return steps;
	}
}
