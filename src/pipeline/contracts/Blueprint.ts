import { UnifiedAssessmentRequest } from "./UnifiedAssessmentRequest";
import { BlueprintPlanV3_2 } from "./BlueprintPlanV3_2";

export interface Blueprint {
  uar: UnifiedAssessmentRequest;

  writerPrompt: string;

  plan: BlueprintPlanV3_2;

  constraints: {
    mustAlignToTopic: boolean;
    avoidTrickQuestions: boolean;
    avoidSensitiveContent: boolean;
    respectTimeLimit: boolean;
  };

  /** Informational warnings from plausibility checks (never blocks the run). */
  warnings?: string[];
}
