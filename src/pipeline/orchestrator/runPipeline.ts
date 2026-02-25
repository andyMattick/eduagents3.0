
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";

// Agent imports (you will fill these in as you build each agent)
import { runArchitect } from "@/pipeline/agents/architect/index";
import { runWriter } from "@/pipeline/agents/writer";
// import { runGatekeeper } from "@/pipeline/agents/gatekeeper";
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
import { supabase } from "@/supabase/client";

console.log("[Pipeline] Loaded runPipeline.ts — Version 2.0.0");

export async function runPipeline(uar: UnifiedAssessmentRequest) {
  // 0. Load predictive teacher defaults
const { data: defaults } = await supabase
  .from("teacher_defaults")
  .select("*")
  .eq("teacher_id", uar.userId)
  .maybeSingle();

// 1. Merge predictive defaults into the UAR
const uarWithDefaults: UnifiedAssessmentRequest = {
  ...uar,

  questionTypes:
    defaults?.preferred_question_types ?? uar.questionTypes,

  questionCount:
    defaults?.preferred_question_count ?? uar.questionCount,

  difficultyPreference:
    defaults?.preferred_difficulty_profile ?? uar.difficultyPreference,

  orderingStrategy:
    defaults?.preferred_ordering_strategy ?? uar.orderingStrategy,

  pacingSecondsPerItem:
    defaults?.preferred_pacing_seconds ?? uar.pacingSecondsPerItem,

  guardrails:
    defaults?.preferred_guardrails ?? uar.guardrails,
};

  
  if (uar.mode === "playtest" && uar.subscriptionTier !== "tier2" && uar.subscriptionTier !== "admin") {
  throw new Error("Playtesting is only available for Tier 2 users.");
}
  console.log("[Pipeline] Version 2.0.0 — runPipeline.ts");
  
  const trace: PipelineTrace = createTrace(
    ["write", "playtest", "compare"] // capabilities for this run 
  );
  // 0. SCRIBE selects the best agents for this run
  const selected = await runAgent( trace, "SCRIBE.selectAgents", SCRIBE.selectAgents, uarWithDefaults );

  console.log("[Pipeline] Selected Agents:", selected);
  
  const blueprint = await runAgent(trace, "Architect", runArchitect, {
    uar: uarWithDefaults,
    agentId: selected.architectInstanceId,
    compensation: selected.compensationProfile
  });
  // 1. Architect — build the blueprint
  
  // 2. Writer — generate the initial draft
  
  const writerDraft = await runAgent(trace, "Writer", runWriter, {
    blueprint: blueprint.plan,
    agentId: selected.writerInstanceId,
    compensation: selected.compensationProfile
  });
// 3. Gatekeeper — validate the draft
const gatekeeperResult = Gatekeeper.validate(blueprint.plan, writerDraft);
logAgentStep(trace, "Gatekeeper", { blueprint, writerDraft }, gatekeeperResult);
if (process.env.NODE_ENV === "development") {
  console.log("Gatekeeper Report:", gatekeeperResult);
}

// ===============================
// 4. PHILOSOPHER — WRITE MODE
// ===============================

const philosopherWrite = await runAgent(
  trace,
  "Philosopher (write)",
  runPhilosopher,
  {
    mode: "write",
    payload: { writerDraft, gatekeeperResult, blueprint },
    blueprint,
    writerDraft,
    gatekeeperReport: gatekeeperResult,
  }
);

// WRITE MODE BRANCHING
if (philosopherWrite.status === "complete" && philosopherWrite.severity <= 2) {
  // Skip playtest, skip compare → go straight to Builder
  const finalAssessment = await runAgent(trace, "Builder", runBuilder, writerDraft);

  const scribeResult = await runAgent(
    trace,
    "SCRIBE.updateAgentDossier",
    SCRIBE.updateAgentDossier,
    {
      userId: uar.userId,
      agentType: "writer",
      instanceId: selected.writerInstanceId,
      gatekeeperReport: gatekeeperResult,
      finalAssessment,
      blueprint,
      uar: uarWithDefaults,
    }
  );

  trace.finishedAt = Date.now();
  return {
    selected,
    blueprint,
    writerDraft,
    gatekeeperResult,
    astro1: null,
    spaceCampResult: null,
    astro2: null,
    philosopherWrite,
    finalAssessment,
    scribe: scribeResult,
    trace,
  };
}

if (philosopherWrite.status === "rewrite" && philosopherWrite.severity <= 6) {
  const rewritten = await runAgent(trace, "Rewriter", runRewriter, {
    writerDraft,
    rewriteInstructions: philosopherWrite.rewriteInstructions,
  });

  const gatekeeperFinal = Gatekeeper.validate(blueprint.plan, rewritten);
  logAgentStep(trace, "Gatekeeper (Final)", { blueprint: blueprint.plan, rewritten }, gatekeeperFinal);

  const finalAssessment = await runAgent(trace, "Builder", runBuilder, rewritten);

  const scribeResult = await runAgent(
    trace,
    "SCRIBE.updateAgentDossier",
    SCRIBE.updateAgentDossier,
    {
      userId: uar.userId,
      agentType: "writer",
      instanceId: selected.writerInstanceId,
      gatekeeperReport: gatekeeperFinal,
      finalAssessment,
      blueprint,
      uar: uarWithDefaults,
    }
  );

  trace.finishedAt = Date.now();
  return {
    selected,
    blueprint,
    writerDraft,
    gatekeeperResult,
    astro1: null,
    spaceCampResult: null,
    astro2: null,
    philosopherWrite,
    rewritten,
    gatekeeperFinal,
    finalAssessment,
    scribe: scribeResult,
    trace,
  };
}

if (philosopherWrite.status === "rewrite" && philosopherWrite.severity >= 7) {
  // Structural failure → restart pipeline
  return await runPipeline(uar);
}

// ===============================
// 5. ASTRONOMER PHASE 1 — analyze the draft
// ===============================

const astro1 = await runAgent(
  trace,
  "Astronomer Phase 1",
  runAstronomerPhase1,
  {
    writerDraft,
    gatekeeperResult,
    agentID: selected.astronomerInstanceId,
  }
);

// 6. SpaceCamp — simulate student performance
const spaceCampResult = await runAgent(trace, "SpaceCamp", runSpaceCamp, astro1);

// 7. Astronomer Phase 2 — deeper analysis
const astro2 = await runAgent(
  trace,
  "Astronomer Phase 2",
  runAstronomerPhase2,
  {
    spaceCampResult,
    compensation: selected.compensationProfile,
    agentID: selected.astronomerInstanceId,
  }
);

// ===============================
// 8. PHILOSOPHER — PLAYTEST MODE
// ===============================

const philosopherPlaytest = await runAgent(
  trace,
  "Philosopher (playtest)",
  runPhilosopher,
  {
    mode: "playtest",
    payload: astro2,
  }
);

// PLAYTEST BRANCHING
if (philosopherPlaytest.status === "rewrite" && philosopherPlaytest.severity <= 6) {
  const rewritten = await runAgent(trace, "Rewriter", runRewriter, {
    writerDraft,
    rewriteInstructions: philosopherPlaytest.rewriteInstructions,
  });

  const gatekeeperFinal = Gatekeeper.validate(blueprint.plan, rewritten);
  logAgentStep(trace, "Gatekeeper (Final)", { blueprint: blueprint.plan, rewritten }, gatekeeperFinal);

  const finalAssessment = await runAgent(trace, "Builder", runBuilder, rewritten);

  const scribeResult = await runAgent(
    trace,
    "SCRIBE.updateAgentDossier",
    SCRIBE.updateAgentDossier,
    {
      userId: uar.userId,
      agentType: "writer",
      instanceId: selected.writerInstanceId,
      gatekeeperReport: gatekeeperFinal,
      finalAssessment,
      blueprint,
      uar: uarWithDefaults,
    }
  );

  trace.finishedAt = Date.now();
  return {
    selected,
    blueprint,
    writerDraft,
    gatekeeperResult,
    astro1,
    spaceCampResult,
    astro2,
    philosopherWrite,
    philosopherPlaytest,
    rewritten,
    gatekeeperFinal,
    finalAssessment,
    scribe: scribeResult,
    trace,
  };
}

if (philosopherPlaytest.status === "rewrite" && philosopherPlaytest.severity >= 7) {
  return await runPipeline(uar);
}

// ===============================
// 9. BUILDER — FINAL ASSEMBLY (no rewrites needed)
// ===============================

const finalAssessment = await runAgent(trace, "Builder", runBuilder, writerDraft);

const scribeResult = await runAgent(
  trace,
  "SCRIBE.updateAgentDossier",
  SCRIBE.updateAgentDossier,
  {
    userId: uar.userId,
    agentType: "writer",
    instanceId: selected.writerInstanceId,
    gatekeeperReport: gatekeeperResult,
    finalAssessment,
    blueprint,
    uar: uarWithDefaults,
  }
);

trace.finishedAt = Date.now();

return {
  selected,
  blueprint,
  writerDraft,
  gatekeeperResult,
  astro1,
  spaceCampResult,
  astro2,
  philosopherWrite,
  philosopherPlaytest,
  finalAssessment,
  scribe: scribeResult,
  trace,
}};
