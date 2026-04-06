/**
 * Barrel re-export for the assessment builder pipeline.
 * Import from here rather than reaching into builder/ sub-modules directly.
 */
export { buildAssessment } from "./builder/controller";
export { allocateConcepts } from "./builder/conceptAllocator";
export { allocateTypes } from "./builder/typeAllocator";
export { allocateDifficulty } from "./builder/difficultyAllocator";
export { generateItemsForConcept } from "./builder/generatorOrchestrator";
export { fallbackConcepts } from "./builder/fallbackLogic";

// Utility libraries
export { SYSTEM_PROMPT, ITEM_TYPE_GUIDELINES } from "./promptLibrary";
export { pickScenario, UNIVERSAL_SCENARIOS, SUBJECT_SCENARIOS } from "./scenarioStyles";
export { difficultyToTime, DIFFICULTY_RULES } from "./difficultyRules";
export { allowedTypesForConcept, ITEM_TYPE_BY_CANONICAL } from "./itemTypeMapping";

export type {
	AssessmentRequest,
	AssessmentItem,
	Assessment,
	ItemType,
	DifficultyLevel,
} from "./assessmentTypes";
