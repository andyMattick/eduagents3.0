import type { CanonicalConcept } from "../domain/domainTypes";

const DEFAULT_STEP_RANGE: [number, number] = [2, 4];

/**
 * Returns the [min, max] step range for a canonical concept.
 * Falls back to [2, 4] for concepts without explicit ranges, and for any
 * unknown / custom concept object passed in.
 */
export function getConceptStepRange(concept: Pick<CanonicalConcept, "typicalStepRange"> | null | undefined): [number, number] {
	return concept?.typicalStepRange ?? DEFAULT_STEP_RANGE;
}
