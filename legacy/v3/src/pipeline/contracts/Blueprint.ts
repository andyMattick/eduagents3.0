import { UnifiedAssessmentRequest } from "./UnifiedAssessmentRequest";
import { BlueprintPlanV3_2 } from "./BlueprintPlanV3_2";
import type {
  ClassifiedConstraint,
  DerivedStructuralConstraints,
} from "pipeline/agents/architect/constraintEngine";
import type { FeasibilityReport } from "pipeline/agents/architect/feasibility";
import { ProblemSlot } from "../agents/pluginEngine";

// Template-derivation taxonomy aliases.
export type ItemType = string;
export type CognitiveIntent = string;
export type Difficulty = "easy" | "medium" | "hard" | string;
export type SharedContext = Record<string, unknown> | string | null;

export interface Blueprint {
  uar: UnifiedAssessmentRequest;

  writerPrompt: string;

  plan: BlueprintPlanV3_2;

  problemSlots: ProblemSlot[];


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

  /** Pre-Writer feasibility analysis (conceptual surface area vs requested slots). */
  feasibilityReport?: FeasibilityReport;

  /**
   * Style constraints derived from the teacher's profile.
   * Forwarded to the Writer Contract so every generated item respects
   * the teacher's preferred tone, language level, and instruction length.
   */
  styleConstraints?: {
    tone: string;
    languageLevel: string;
    instructionLength: string;
    contextPreference: string;
  } | null;
}
