// src/pipeline/orchestrator/analyze.ts

import { runAstronomerPhase1 } from "@/pipeline/agents/astronomer/phase1";
import { runAstronomerPhase2 } from "@/pipeline/agents/astronomer/phase2";
import { runSpaceCamp } from "@/pipeline/agents/spacecamp";
import { runPhilosopher } from "@/pipeline/agents/philosopher";

export async function runAnalyzePipeline(internal: any) {
  const astro1 = await runAstronomerPhase1(internal);
  const space = await runSpaceCamp(astro1);
  const astro2 = await runAstronomerPhase2(space);

  const philosopher = await runPhilosopher({
    mode: "compare",
    payload: astro2
  });

  return {
    type: "analyze",
    analysis: astro2,
    philosopher
  };
}
