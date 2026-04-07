import type { CanonicalConcept } from "../domain/domainTypes";
import type { StepContext } from "./stepTypes";
import { getConceptStepRange } from "./conceptStepRange";
import { analyzeStructure } from "./structureParser";
import { adjustForDifficulty } from "./difficultyAdjustments";
import { adjustForScenario } from "./scenarioAdjustments";
import { adjustForLearner } from "./learnerAdjustments";

/**
 * Computes the cognitive step count for a single assessment item.
 *
 * The formula is additive across four layers:
 *   1. Concept-level base (min of typicalStepRange)
 *   2. Problem-structure signals (operations, transformations, representations, etc.)
 *   3. Difficulty & scenario adjustments
 *   4. Learner-profile adjustments
 *
 * The result is always clamped to the concept's [min, max] range so the engine
 * never produces an absurd value even for pathological texts.
 *
 * When `context.teacherStepOverride` is set, all computation is bypassed and the
 * override is returned directly (teacher always wins).
 *
 * @param concept  The CanonicalConcept (or minimal shape) for the item.
 * @param context  The runtime context providing text, difficulty, learner profile.
 * @returns        An integer step count ≥ 1.
 */
export function computeStepCount(
	concept: Pick<CanonicalConcept, "typicalStepRange"> | null | undefined,
	context: StepContext,
): number {
	// Teacher override short-circuits everything
	if (context.teacherStepOverride !== undefined) {
		return Math.max(1, context.teacherStepOverride);
	}

	const [min, max] = getConceptStepRange(concept);

	const structure = analyzeStructure(context.problemText);

	// Layer 2: additive structure signals
	let steps =
		min +
		structure.operations +
		structure.transformations +
		(structure.hasParentheses ? 1 : 0) +
		(structure.variableBothSides ? 1 : 0) +
		structure.representations.length;

	// Layer 3: difficulty and scenario
	steps = adjustForDifficulty(steps, context.difficulty);
	// Use structure-derived complexity when passed-in value is "medium" (neutral)
	const resolvedComplexity =
		context.scenarioComplexity !== "medium"
			? context.scenarioComplexity
			: structure.scenarioComplexity;
	steps = adjustForScenario(steps, resolvedComplexity);

	// Layer 4: learner profile
	steps = adjustForLearner(steps, context.learnerProfile);

	// Clamp to concept range, floor at 1
	return Math.max(1, Math.max(min, Math.min(steps, max)));
}
