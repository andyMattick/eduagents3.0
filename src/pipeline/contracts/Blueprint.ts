import { UnifiedAssessmentRequest } from "./UnifiedAssessmentRequest";
import { BlueprintPlanV3_2 } from "./BlueprintPlanV3_2";
import type {
  ClassifiedConstraint,
  DerivedStructuralConstraints,
} from "@/pipeline/agents/architect/constraintEngine";

export interface Blueprint {
  uar: UnifiedAssessmentRequest;

  writerPrompt: string;

  plan: BlueprintPlanV3_2;

  /**
   * Legacy boolean flags kept for backward compatibility with Gatekeeper/Writer.
   * Prefer `resolvedConstraints` and `derivedStructuralConstraints` for new logic.
   */
  constraints: {
    mustAlignToTopic: boolean;
    avoidTrickQuestions: boolean;
    avoidSensitiveContent: boolean;
    respectTimeLimit: boolean;
  };

  /**
   * Full constraint lifecycle from the semantic constraint engine.
   * - `classifiedConstraints` — every extracted constraint with type + priority
   * - `resolvedConstraints`   — after conflict arbitration (some may be dropped/softened)
   * - `derivedStructuralConstraints` — structural knobs translated from meta phrases
   */
  classifiedConstraints?: ClassifiedConstraint[];
  resolvedConstraints?: ClassifiedConstraint[];
  derivedStructuralConstraints?: DerivedStructuralConstraints;

  /** Informational warnings from plausibility checks (never blocks the run). */
  warnings?: string[];
}
