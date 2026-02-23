
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
import { SCRIBE } from "@/pipeline/agents/scribe";
import { Gatekeeper } from "../agents/gatekeeper/Gatekeeper";
import { createTrace, logAgentStep } from "@/utils/trace";
import { runAgent } from "@/utils/runAgent";
import { PipelineTrace } from "@/types/Trace";
import { log } from "console";
import { json } from "stream/consumers";

console.log("[Pipeline] Loaded runPipeline.ts — Version 2.0.0");

export async function runPipeline(uar: UnifiedAssessmentRequest) {
  console.log("[Pipeline] Version 2.0.0 — runPipeline.ts");
  
  const trace: PipelineTrace = createTrace(
    ["write", "playtest", "compare"] // capabilities for this run 
  );
  // 0. SCRIBE selects the best agents for this run
  const selected = await runAgent(trace, "SCRIBE.selectAgents", SCRIBE.selectAgents, uar);

  console.log("[Pipeline] Selected Agents:", selected);
  const blueprint = await runAgent(trace, "Architect", runArchitect, {
    uar,
    agentId: selected.architectInstanceId,
    compensation: selected.compensationProfile
  });
  // 1. Architect — build the blueprint
  
  // 2. Writer — generate the initial draft
  
  const writerDraft = await runAgent(trace, "Writer", runWriter, {
    blueprint,
    agentId: selected.writerInstanceId,
    compensation: selected.compensationProfile
  });

  // 3. Gatekeeper — validate the draft
  const gatekeeperResult = Gatekeeper.validate(blueprint, writerDraft);
  logAgentStep(trace, "Gatekeeper", { blueprint, writerDraft }, gatekeeperResult);
  if(process.env.NODE_ENV === "development") {
    console.log("Gatekeeper Report:", gatekeeperResult);
  }
  
  // 4. Astronomer Phase 1 — analyze the draft
  
  const astro1 = await runAgent(trace, "Astronomer Phase 1", runAstronomerPhase1, {
    writerDraft,
    gatekeeperResult,
    agentID: selected.astronomerInstanceId
  })

  // 5. SpaceCamp — simulate student performance
  const spaceCampResult = await runAgent(trace, "SpaceCamp", runSpaceCamp, astro1);

  // 6. Astronomer Phase 2 — deeper analysis
  
  const astro2 = await runAgent(trace, "Astronomer Phase 2", runAstronomerPhase2, {
    spaceCampResult,
    compensation: selected.compensationProfile,
    agentID: selected.astronomerInstanceId
});

  // 7. Philosopher — critique and refine
  const philosopherNotes = await runAgent(trace, "Philosopher", runPhilosopher, astro2);

  // 8. Rewriter — fix issues and improve clarity
  
  const rewritten = await runAgent(trace, "Rewriter", runRewriter, {
    draft: writerDraft,
    notes: philosopherNotes,
  });

  // 9. Builder — assemble final assessment
  const finalAssessment = await runAgent(trace, "Builder", runBuilder, rewritten);
  const gatekeeperReport = Gatekeeper.validate(blueprint, writerDraft);
  logAgentStep(trace, "Gatekeeper (Final)", { blueprint, finalAssessment }, gatekeeperReport);

  // 10. SCRIBE — score quality + produce metadata
  const scribeResult = await runAgent(trace, "SCRIBE.updateDossier", SCRIBE.updateDossier, {
  userId: uar.userId,
  agentType: "writer", // or dynamic based on selected
  instanceId: selected.writerInstanceId,
  gatekeeperReport,
  finalAssessment
});

trace.finishedAt = Date.now();

if(process.env.NODE_ENV === "development") {
  console.log("[TRACE]", JSON.stringify(trace, null, 2));
}
  return {
    selected,
    blueprint,
    writerDraft,
    gatekeeperResult,
    astro1,
    spaceCampResult,
    astro2,
    philosopherNotes,
    rewritten,
    finalAssessment,
    scribe: scribeResult,
    trace,
  };
}
