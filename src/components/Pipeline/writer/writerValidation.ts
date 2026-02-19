import {
  UnifiedAssessmentResponse,
  ProblemPayload
} from "../contracts/assessmentContracts";



export interface WriterValidationResult {
  valid: boolean;
  errors: string[];
}

import { WriterDraft } from "../writer/WriterDraft"; 
export function validateWriterOutput( 
  draft: WriterDraft 
): WriterValidationResult {

  const errors: string[] = [];

  // 1. Problem payload exists
  if (!Array.isArray(draft.problemPayload) || draft.problemPayload.length === 0) {
    errors.push("Writer produced no problems.");
  }

  // 2. Stable problem IDs
  draft.problemPayload?.forEach((p, i) => {
    if (!p.problemId || typeof p.problemId !== "string") {
      errors.push(`Problem at index ${i} is missing a valid problemId.`);
    }
  });
/*
  // 3. Answer key exists
  if (!draft.answerKey || !Array.isArray(draft.answerKey.answers)) {
    errors.push("Writer produced an invalid answer key.");
  }

  // 4. Cognitive traces
  if (!Array.isArray(draft.cognitiveTraces)) {
    errors.push("Writer produced invalid cognitiveTraces.");
  }

  // 5. Difficulty estimates
  if (!Array.isArray(draft.difficultyEstimates)) {
    errors.push("Writer produced invalid difficultyEstimates.");
  }

  // 6. Misconception clusters
  if (!Array.isArray(draft.misconceptionClusters)) {
    errors.push("Writer produced invalid misconceptionClusters.");
  }

  // 7. Time estimates
  if (!draft.timeEstimates || typeof draft.timeEstimates !== "object") {
    errors.push("Writer produced invalid timeEstimates.");
  }

  // 8. Final document
  if (!draft.finalDocument || typeof draft.finalDocument !== "object") {
    errors.push("Writer produced invalid finalDocument.");
  }
    */

  return {
    valid: errors.length === 0,
    errors
  };
}
