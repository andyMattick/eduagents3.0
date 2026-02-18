// src/components/Pipeline/writer/writer.ts

import { UnifiedAssessmentRequest, UnifiedAssessmentResponse } from "../contracts/assessmentContracts";
import { writerCall } from "./writerCall";

export async function runWriter(
  req: UnifiedAssessmentRequest,
  previousDraft?: any
): Promise<UnifiedAssessmentResponse> {
  console.log(
  "%c[Writer] Starting Writer pass...",
  "color:#B45309;font-weight:bold;",
  {
    req,
    previousDraft
  }
);

  return writerCall(req, previousDraft);
}
