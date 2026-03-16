// src/pipeline/orchestrator/test.ts

import { runAstronomerPhase1 } from "@/pipeline/agents/astronomer/phase1";
import { runAstronomerPhase2 } from "@/pipeline/agents/astronomer/phase2";
import { runSpaceCamp } from "@/pipeline/agents/spacecamp";
import { runPhilosopher } from "@/pipeline/agents/philosopher";
import { buildDocumentInsightsFromInput } from "@/pipeline/agents/document/insights";

export async function runTestPipeline(internal: any) {
  const documentInsights = buildDocumentInsightsFromInput(internal);
  if (documentInsights.flags.unreadable) {
    return {
      type: "test",
      simulation: null,
      documentInsights,
      philosopher: {
        status: "skipped",
        notes: "Document unreadable. Simulation was skipped.",
      },
    };
  }

  const astro1 = await runAstronomerPhase1(internal);
  const space = await runSpaceCamp(astro1);
  const astro2 = await runAstronomerPhase2(space);

  const philosopher = await runPhilosopher({
    mode: "playtest",
    payload: astro2
  });

  return {
    type: "test",
    simulation: astro2,
    documentInsights,
    philosopher
  };
}
