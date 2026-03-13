import { DeriveTemplateRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { deriveTemplate } from "./derive";
import { DeriveTemplateResult } from "./types";

export async function runDeriveTemplate(
  request: DeriveTemplateRequest
): Promise<DeriveTemplateResult> {
  return deriveTemplate(request);
}
