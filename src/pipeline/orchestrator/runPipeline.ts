
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";

// Agent imports (you will fill these in as you build each agent)
import { runArchitect } from "@/pipeline/agents/architect/index";
import { runWriter } from "@/pipeline/agents/writer";
import { runGatekeeper } from "@/pipeline/agents/gatekeeper";
import { runAstronomerPhase1 } from "@/pipeline/agents/astronomer/phase1";
import { runSpaceCamp } from "@/pipeline/agents/spacecamp";
import { runAstronomerPhase2 } from "@/pipeline/agents/astronomer/phase2";
import { runPhilosopher } from "@/pipeline/agents/philosopher";
import { runRewriter } from "@/pipeline/agents/rewriter";
import { runBuilder } from "@/pipeline/agents/builder";
import { runSCRIBE } from "@/pipeline/agents/scribe";
console.log("[Pipeline] Loaded runPipeline.ts — Version 2.0.0");

export async function runPipeline(uar: UnifiedAssessmentRequest) {
  console.log("[Pipeline] Version 2.0.0 — runPipeline.ts");

  // 1. Architect — build the blueprint
  const blueprint = await runArchitect(uar);

  // 2. Writer — generate the initial draft
  const writerDraft = await runWriter(blueprint);

  // 3. Gatekeeper — validate the draft
  const gatekeeperResult = await runGatekeeper(writerDraft);

  // 4. Astronomer Phase 1 — analyze the draft
  const astro1 = await runAstronomerPhase1(gatekeeperResult);

  // 5. SpaceCamp — simulate student performance
  const spaceCampResult = await runSpaceCamp(astro1);

  // 6. Astronomer Phase 2 — deeper analysis
  const astro2 = await runAstronomerPhase2(spaceCampResult);

  // 7. Philosopher — critique and refine
  const philosopherNotes = await runPhilosopher(astro2);

  // 8. Rewriter — fix issues and improve clarity
  const rewritten = await runRewriter({
    draft: writerDraft,
    notes: philosopherNotes,
  });

  // 9. Builder — assemble final assessment
  const finalAssessment = await runBuilder(rewritten);

  // 10. SCRIBE — score quality + produce metadata
  const scribe = await runSCRIBE(finalAssessment);

  return {
    blueprint,
    writerDraft,
    gatekeeperResult,
    astro1,
    spaceCampResult,
    astro2,
    philosopherNotes,
    rewritten,
    finalAssessment,
    scribe,
  };
}
