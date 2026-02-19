// src/components/Pipeline/writer/writerOrchestrator.ts
import {
  UnifiedAssessmentRequest,
  WriterAstronomerResponse
} from "../contracts/assessmentContracts";


import { runWriter } from "./writer";
import { validateWriterOutput } from "./writerValidation";
import { runAstronomer } from "../astronomer/astronomerCall";

export async function runWriterOrchestrator(
  req: UnifiedAssessmentRequest
): Promise<WriterAstronomerResponse> {

  console.log(
    "%c[WriterOrchestrator] Starting writer orchestrator...",
    "color:#4C1D95;font-weight:bold;",
    req
  );

  //
  // 1. Writer v2
  //
  const writerDraft = await runWriter(req);

  console.log(
    "%c[WriterOrchestrator] Writer v2 initial draft:",
    "color:#5B21B6;font-weight:bold;",
    writerDraft
  );

  //
  // 2. Validate Writer output BEFORE Astronomer
  //
  const validation = validateWriterOutput(writerDraft);

  console.log(
    "%c[WriterOrchestrator] Writer validation result:",
    "color:#6D28D9;font-weight:bold;",
    validation
  );

  if (!validation.valid) {
    console.error(
      "%c[WriterOrchestrator] Writer produced INVALID output:",
      "color:#DC2626;font-weight:bold;",
      validation.errors
    );
    throw new Error(
      "Writer produced invalid output:\n" + validation.errors.join("\n")
    );
  }

  //
  // 3. Astronomer v2 (stub)
  //
  console.log(
    "%c[WriterOrchestrator] Calling Astronomer...",
    "color:#7C3AED;font-weight:bold;"
  );

  const astronomerReport = await runAstronomer({
    uar: req,
    writerDraft
  });

  console.log(
    "%c[WriterOrchestrator] Astronomer report:",
    "color:#8B5CF6;font-weight:bold;",
    astronomerReport
  );

  //
  // 4. Return Writer + Astronomer only
  //
  const response: WriterAstronomerResponse = {
    writerDraft,
    astronomerReport
  };

  console.log(
    "%c[WriterOrchestrator] Final orchestrator output:",
    "color:#4ADE80;font-weight:bold;",
    response
  );

  return response;
}
