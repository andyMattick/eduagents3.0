
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";

// Agent imports (you will fill these in as you build each agent)
import { runArchitect } from "@/pipeline/agents/architect/index";
import { runWriter, getLastWriterTelemetry } from "@/pipeline/agents/writer";

/** Dispatch flag: 'build' runs Phase 1 only; 'playtest' continues to Phase 2. */
export type PipelineMode = "build" | "playtest";
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

console.log("[Pipeline] Loaded runPipeline.ts — Version 2.1.0");

// ─────────────────────────────────────────────────────────────────────────────
// Lean helpers — extract only what each downstream agent actually reads.
// Avoids passing full blueprints, drafts, and UARs where scalars suffice.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builder only needs slot id/cognitiveDemand/difficulty to enrich items.
 * Strip everything else (validation config, pacing, distribution, etc.).
 */
function blueprintForBuilder(blueprint: any): { plan: { slots: any[] } } {
  return {
    plan: {
      slots: (blueprint.plan?.slots ?? []).map((s: any) => ({
        id: s.id,
        cognitiveDemand: s.cognitiveDemand,
        difficulty: s.difficulty,
      })),
    },
  };
}

/**
 * SCRIBE.updateAgentDossier needs plan-level aggregates but NOT the slots array
 * (which is the bulk of the plan). Pass cognitiveDistribution etc. only.
 */
function blueprintForScribe(blueprint: any): { plan: Record<string, any> } {
  const p = blueprint.plan ?? {};
  return {
    plan: {
      cognitiveDistribution: p.cognitiveDistribution,
      difficultyProfile: p.difficultyProfile,
      orderingStrategy: p.orderingStrategy,
      pacingSecondsPerItem: p.pacingSecondsPerItem,
    },
  };
}

/**
 * SCRIBE only reads course, gradeLevels, assessmentType, guardrails from the UAR.
 */
function uarForScribe(uar: any): Record<string, any> {
  return {
    course: uar.course,
    gradeLevels: uar.gradeLevels,
    assessmentType: uar.assessmentType,
    guardrails: (uar as any).guardrails ?? null,
  };
}

/**
 * ValidateAndScore — merges Gatekeeper + Philosopher (write mode) into a
 * single pipeline step.
 *
 * Why: both are deterministic / zero-LLM-cost. Calling them separately meant
 * the trace stored two full copies of { blueprint, writerDraft } (5-10 KB each).
 * Now we store one slim summary entry instead.
 */
async function validateAndScore(
  blueprint: any,
  writerDraft: any[],
  trace: any,
  writerTelemetry: any
): Promise<{ gatekeeperResult: any; philosopherWrite: any }> {
  const gk = Gatekeeper.validate(blueprint.plan, writerDraft);

  // SCRIBE learns from violations + telemetry before Philosopher reports
  SCRIBE.updateWriterDossier(gk, writerTelemetry);

  if (process.env.NODE_ENV === "development") {
    console.log("Gatekeeper Report:", gk);
  }

  // Philosopher write-mode: deterministic, no LLM. Pass minimal refs only.
  const phil = await runPhilosopher({
    mode: "write",
    blueprint,
    writerDraft,
    gatekeeperReport: gk,
  });

  // One slim trace entry replaces previous: logAgentStep("Gatekeeper", {blueprint, writerDraft})
  // + runAgent("Philosopher", { payload: { ... }, blueprint, writerDraft, ... })
  logAgentStep(
    trace,
    "ValidateAndScore",
    { slotCount: blueprint.plan?.slots?.length ?? 0, itemCount: writerDraft.length },
    {
      ok: gk.ok,
      violationCount: gk.violations?.length ?? 0,
      philosopherStatus: phil.status,
      severity: phil.severity,
      qualityScore: phil.analysis?.qualityScore,
      notes: phil.philosopherNotes,
    }
  );

  return { gatekeeperResult: gk, philosopherWrite: phil };
}

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
  // 2a. SCRIBE → Writer prescriptions
const writerPrescriptions = SCRIBE.getWriterPrescriptions();

const writerDraft = await runAgent(trace, "Writer", runWriter, {
  blueprint: blueprint.plan,
  uar: blueprint.uar, // normalized Architect UAR
  scribePrescriptions: writerPrescriptions,
  agentId: selected.writerInstanceId,
  compensation: selected.compensationProfile
});

// 2b. Count invariant — warn if Writer dropped any slots, but continue
// with what we have rather than aborting the entire run.
if (writerDraft.length !== blueprint.plan.slots.length) {
  console.error(
    `[Pipeline] Warning: Writer returned ${writerDraft.length} items but blueprint has ${blueprint.plan.slots.length} slots. ` +
    `Proceeding with partial draft — missing slots will be absent from the final assessment.`
  );
}

// 2c. Capture Writer adaptive-chunking telemetry into the trace
const writerTelemetry = getLastWriterTelemetry();
if (writerTelemetry) {
  logAgentStep(trace, "Writer.telemetry", {}, writerTelemetry);
  console.log("[Pipeline] Writer telemetry:", JSON.stringify(writerTelemetry));
}

// 3+4. ValidateAndScore — Gatekeeper + Philosopher write-mode merged (no full-object echoing)
const { gatekeeperResult, philosopherWrite } = await validateAndScore(
  blueprint, writerDraft, trace, writerTelemetry
);

// WRITE MODE BRANCHING
if (philosopherWrite.status === "complete" && philosopherWrite.severity <= 2) {
  // Skip playtest, skip compare → go straight to Builder
  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: writerDraft, blueprint: blueprintForBuilder(blueprint) });

  const scribeResult = await runAgent(
    trace, "SCRIBE.updateAgentDossier", SCRIBE.updateAgentDossier,
    {
      userId: uar.userId, agentType: "writer", instanceId: selected.writerInstanceId,
      gatekeeperReport: gatekeeperResult, finalAssessment,
      blueprint: blueprintForScribe(blueprint), uar: uarForScribe(uarWithDefaults),
    }
  );

  trace.finishedAt = Date.now();
  return {
    selected, blueprint, writerDraft, gatekeeperResult,
    astro1: null, spaceCampResult: null, astro2: null,
    philosopherWrite, finalAssessment, scribe: scribeResult, trace,
  };
}

if (philosopherWrite.status === "rewrite" && philosopherWrite.severity <= 6) {
  const rewritten = await runAgent(trace, "Rewriter", runRewriter, {
    writerDraft,
    rewriteInstructions: philosopherWrite.rewriteInstructions,
  });

  const gatekeeperFinal = Gatekeeper.validate(blueprint.plan, rewritten);
  logAgentStep(trace, "Gatekeeper (Final)",
    { slotCount: blueprint.plan?.slots?.length ?? 0, itemCount: rewritten.length },
    { ok: gatekeeperFinal.ok, violationCount: gatekeeperFinal.violations?.length ?? 0 });

  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: rewritten, blueprint: blueprintForBuilder(blueprint) });

  const scribeResult = await runAgent(
    trace, "SCRIBE.updateAgentDossier", SCRIBE.updateAgentDossier,
    {
      userId: uar.userId, agentType: "writer", instanceId: selected.writerInstanceId,
      gatekeeperReport: gatekeeperFinal, finalAssessment,
      blueprint: blueprintForScribe(blueprint), uar: uarForScribe(uarWithDefaults),
    }
  );

  trace.finishedAt = Date.now();
  return {
    selected, blueprint, writerDraft, gatekeeperResult,
    astro1: null, spaceCampResult: null, astro2: null,
    philosopherWrite, rewritten, gatekeeperFinal, finalAssessment, scribe: scribeResult, trace,
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
  logAgentStep(trace, "Gatekeeper (Final)",
    { slotCount: blueprint.plan?.slots?.length ?? 0, itemCount: rewritten.length },
    { ok: gatekeeperFinal.ok, violationCount: gatekeeperFinal.violations?.length ?? 0 });

  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: rewritten, blueprint: blueprintForBuilder(blueprint) });

  const scribeResult = await runAgent(
    trace, "SCRIBE.updateAgentDossier", SCRIBE.updateAgentDossier,
    {
      userId: uar.userId, agentType: "writer", instanceId: selected.writerInstanceId,
      gatekeeperReport: gatekeeperFinal, finalAssessment,
      blueprint: blueprintForScribe(blueprint), uar: uarForScribe(uarWithDefaults),
    }
  );

  trace.finishedAt = Date.now();
  return {
    selected, blueprint, writerDraft, gatekeeperResult,
    astro1, spaceCampResult, astro2,
    philosopherWrite, philosopherPlaytest, rewritten, gatekeeperFinal,
    finalAssessment, scribe: scribeResult, trace,
  };
}

if (philosopherPlaytest.status === "rewrite" && philosopherPlaytest.severity >= 7) {
  return await runPipeline(uar);
}

// ===============================
// 9. BUILDER — FINAL ASSEMBLY (no rewrites needed)
// ===============================

const finalAssessment = await runAgent(trace, "Builder", runBuilder,
  { items: writerDraft, blueprint: blueprintForBuilder(blueprint) });

const scribeResult = await runAgent(
  trace, "SCRIBE.updateAgentDossier", SCRIBE.updateAgentDossier,
  {
    userId: uar.userId, agentType: "writer", instanceId: selected.writerInstanceId,
    gatekeeperReport: gatekeeperResult, finalAssessment,
    blueprint: blueprintForScribe(blueprint), uar: uarForScribe(uarWithDefaults),
  }
);

trace.finishedAt = Date.now();

return {
  selected, blueprint, writerDraft, gatekeeperResult,
  astro1, spaceCampResult, astro2,
  philosopherWrite, philosopherPlaytest,
  finalAssessment, scribe: scribeResult, trace,
}};
