// src/components/Pipeline/writer/writer.ts

import { UnifiedAssessmentRequest, UnifiedAssessmentResponse } from "../contracts/assessmentContracts";
import { writerCall } from "./writerCall";

export async function runWriter(
  req: UnifiedAssessmentRequest,
  previousDraft?: any
): Promise<UnifiedAssessmentResponse> {
  return writerCall(req, previousDraft);
}
