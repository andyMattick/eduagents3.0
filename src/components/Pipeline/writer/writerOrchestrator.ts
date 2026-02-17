// src/components/Pipeline/writer/writerOrchestrator.ts

import { UnifiedAssessmentRequest, UnifiedAssessmentResponse } from "../contracts/assessmentContracts";
import { runWriter } from "./writer";
import { runAstronomer } from "../astronomer/astronomerCall";
import { runPhilosopher } from "../philosopher/philosopher";
import { runRewriter } from "../rewriter/rewriter";
import { validateWriterOutput } from "../writer/writerValidation";

const MAX_REWRITE_CYCLES = 3;

export async function runWriterOrchestrator(
  req: UnifiedAssessmentRequest
): Promise<UnifiedAssessmentResponse> {

  // ALWAYS start with Writer v2
  let draft = await runWriter(req);

  // Validate Writer output BEFORE Astronomer
  const validation = validateWriterOutput(draft);

  if (!validation.valid) {
    throw new Error(
      "Writer produced invalid output:\n" + validation.errors.join("\n")
    );
  }

  let cycles = 0;

  while (cycles < MAX_REWRITE_CYCLES) {
    cycles++;

    // Astronomer analyzes the Writer's draft
    const astro = await runAstronomer(draft);
    draft.astronomerClusters = { clusters: astro.clusters };
    draft.studentInteraction = astro.studentInteraction;

    // Philosopher evaluates the Writer's draft
    const philosopher = await runPhilosopher(draft, astro);
    draft.philosopherExplanation = philosopher;

    // If Philosopher says "complete", stop
    if (philosopher.decision.status === "complete") {

      draft.rewriteMeta = { cycles, status: "complete" };
      return draft;
    }

    // Otherwise, Rewriter fixes ONLY culprit problems
    const rewrite = await runRewriter(draft, philosopher);

    draft.problemPayload = draft.problemPayload.map((p) => {
      const updated = rewrite.rewrittenProblems.find(r => r.problemId === p.problemId);
      return updated ?? p;
    });

    // After rewrite, Writer regenerates the full document
    draft = await runWriter(req, draft);
  }

  draft.rewriteMeta = { cycles: MAX_REWRITE_CYCLES, status: "forced-complete" };
  return draft;
}
