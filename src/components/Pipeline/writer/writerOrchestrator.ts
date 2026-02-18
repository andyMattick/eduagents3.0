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
console.log(
  "%c[WriterOrchestrator] Starting writer orchestrator...",
  "color:#4C1D95;font-weight:bold;",
  req
);

  // ALWAYS start with Writer v2
 let draft = await runWriter(req);

console.log(
  "%c[WriterOrchestrator] Writer v2 initial draft:",
  "color:#5B21B6;font-weight:bold;",
  draft
);


  // Validate Writer output BEFORE Astronomer
  const validation = validateWriterOutput(draft);

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


  let cycles = 0;

  while (cycles < MAX_REWRITE_CYCLES) {
    console.log(
  `%c[WriterOrchestrator] Rewrite cycle ${cycles} starting...`,
  "color:#7C3AED;font-weight:bold;"
);

    cycles++;
    console.log(
  "%c[WriterOrchestrator] Calling Astronomer...",
  "color:#7C3AED;font-weight:bold;"
);

    // Astronomer analyzes the Writer's draft
    const astro = await runAstronomer(draft);
    draft.astronomerClusters = { clusters: astro.clusters };
    draft.studentInteraction = astro.studentInteraction;
    console.log(
      "%c[WriterOrchestrator] Astronomer clusters:",
      "color:#8B5CF6;font-weight:bold;",
      astro
    );

    console.log(
  "%c[WriterOrchestrator] Calling Philosopher...",
  "color:#A78BFA;font-weight:bold;"
);

    // Philosopher evaluates the Writer's draft
    const philosopher = await runPhilosopher(draft, astro);
    draft.philosopherExplanation = philosopher;

    // If Philosopher says "complete", stop
    if (philosopher.decision.status === "complete") {
      console.log(
  "%c[WriterOrchestrator] Philosopher marked COMPLETE — returning final draft",
  "color:#EDE9FE;font-weight:bold;"
);

      draft.rewriteMeta = { cycles, status: "complete" };
      return draft;
    }
    console.log(
  "%c[WriterOrchestrator] Philosopher evaluation:",
  "color:#C4B5FD;font-weight:bold;",
  philosopher
);

    // Otherwise, Rewriter fixes ONLY culprit problems
    const rewrite = await runRewriter(draft, philosopher);

    draft.problemPayload = draft.problemPayload.map((p) => {
      const updated = rewrite.rewrittenProblems.find(r => r.problemId === p.problemId);
      return updated ?? p;
    });
    console.log(
      "%c[WriterOrchestrator] Rewriter output:",
      "color:#C026D3;font-weight:bold;",
      rewrite
    );

    // After rewrite, Writer regenerates the full document
    draft = await runWriter(req, draft);
  }
  


  draft.rewriteMeta = { cycles: MAX_REWRITE_CYCLES, status: "forced-complete" };
  console.log(
  "%c[WriterOrchestrator] Final draft returned:",
  "color:#4ADE80;font-weight:bold;",
  draft
);
  
  return draft;
}


