// writerModels.ts
import { UnifiedAssessmentResponse } from "@/pipeline/contracts/UnifiedAssessmentResponse";

export interface WriterSelfCheck {
  predictedCognitive: string;
  predictedDifficulty: string;
  predictedPacing: number;
  predictedScope: string;
  predictedOrdering: string;
  predictedMisconceptions: string[];
  confidence: number;
}

export interface WriterOutput {
  assessment: UnifiedAssessmentResponse;        // your existing assessment type
  writerSelfCheck: WriterSelfCheck;
}
