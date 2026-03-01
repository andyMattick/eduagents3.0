
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";

// Agent imports (you will fill these in as you build each agent)
import { runArchitect } from "@/pipeline/agents/architect/index";
import { runWriter, getLastWriterTelemetry } from "@/pipeline/agents/writer";
import { getLastBloomAlignmentLog } from "@/pipeline/agents/writer/chunk/writerParallel";

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
import { resetLLMGate } from "@/pipeline/llm/gemini";

console.log("[Pipeline] Loaded runPipeline.ts — Version 2.2.0");

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
    grade: uar.gradeLevels?.[0] ?? uar.grade ?? null,
    assessmentType: uar.assessmentType,
    guardrails: (uar as any).guardrails ?? null,
  };
}

/**
 * Extract the two scalars SCRIBE.updateAgentDossier reads from finalAssessment.
 * Avoids serialising the full items array into Supabase / dossier calls.
 * ~1,000 token saving per run on assessments with 5+ items.
 */
function finalAssessmentForScribe(fa: any): { questionCount: number; questionTypes: string[] } {
  return {
    questionCount: fa.items?.length ?? 0,
    questionTypes: (fa.items ?? []).map((i: any) => i.questionType).filter(Boolean) as string[],
  };
}

/**
 * Writer only reads 10 fields from the UAR; slimming this reduces the Writer
 * trace entry by ~300–500 tokens when additionalDetails or sourceDocuments are present.
 */
function uarForWriter(uar: any): Record<string, any> {
  return {
    gradeLevels: uar.gradeLevels,
    grade: uar.gradeLevels?.[0] ?? uar.grade ?? null,
    course: uar.course,
    lessonName: uar.lessonName ?? null,
    topic: uar.topic ?? null,
    unitName: uar.unitName ?? null,
    additionalDetails: uar.additionalDetails ?? null,
    time: uar.time ?? uar.timeMinutes ?? null,
    timeMinutes: uar.timeMinutes ?? uar.time ?? null,
    assessmentType: uar.assessmentType,
    studentLevel: uar.studentLevel ?? null,
  };
}

/**
 * validateSlotIntegrity — pre-Builder safety gate.
 *
 * Throws if any slot in the blueprint is missing a corresponding generated
 * item, or if the item count doesn't match the slot count.  Catches phantom
 * slots early before the Builder tries to reference them.
 */
function validateSlotIntegrity(
  slots: { id: string }[],
  items: { slotId: string }[]
): void {
  const itemsMap = new Map<string, { slotId: string }>();
  for (const item of items) {
    itemsMap.set(item.slotId, item);
  }

  for (const slot of slots) {
    if (!itemsMap.has(slot.id)) {
      throw new Error(
        `[validateSlotIntegrity] Phantom slot: "${slot.id}" has no generated item. ` +
        `Available slot IDs: [${[...itemsMap.keys()].join(", ")}]`
      );
    }
  }

  if (itemsMap.size !== slots.length) {
    throw new Error(
      `[validateSlotIntegrity] Item count mismatch: ${itemsMap.size} items for ${slots.length} slots. ` +
      `Item slot IDs: [${[...itemsMap.keys()].join(", ")}]`
    );
  }
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

  // Bloom drift reconciliation — analyse per-slot Bloom alignment and update
  // prescriptions if drift is systematic (under- or over-bloom).
  const bloomLog = getLastBloomAlignmentLog();
  const bloomDriftSummary = SCRIBE.recalibrateFromBloomDrift(bloomLog);
  console.info(bloomDriftSummary);

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

export async function runPipeline(uar: UnifiedAssessmentRequest, _depth = 0) {
  // ── Recursion guard ────────────────────────────────────────────────────────
  if (_depth >= 2) {
    throw new Error(
      "[Pipeline] Maximum retry depth (2) reached. Assessment could not complete — " +
      "Philosopher severity >= 7 on repeated attempts. Please try again."
    );
  }

  // ── Security: re-arm the LLM gate so the first LLM call in this run
  //    triggers the server-side daily-limit check.
  resetLLMGate();

  // ── Ensure required UAR fields have safe defaults ─────────────────────────
  // mode and subscriptionTier may not be set by convertMinimalToUAR.
  const safeUar: UnifiedAssessmentRequest = {
    ...uar,
    mode: uar.mode ?? "write",
    subscriptionTier: uar.subscriptionTier ?? "free",
  };

  // ── Tier gate (before any DB/LLM calls) ───────────────────────────────────
  if (safeUar.mode === "playtest" && safeUar.subscriptionTier !== "tier2" && safeUar.subscriptionTier !== "admin") {
    throw new Error("Playtesting is only available for Tier 2 users.");
  }

  // ── Step 0a: load predictive teacher defaults ────────────────────────────
  const { data: defaultsRows } = await supabase
    .from("teacher_defaults")
    .select("*")
    .eq("teacher_id", safeUar.userId)
    .limit(1);
  const defaults = defaultsRows?.[0] ?? null;

  // ── Step 0b: merge predictive defaults into the UAR ───────────────────────
  const uarWithDefaults: UnifiedAssessmentRequest = {
    ...safeUar,
    questionTypes:        safeUar.questionTypes,
    questionCount:        defaults?.avg_question_count ?? safeUar.questionCount,
    difficultyPreference: defaults?.preferred_difficulty ?? safeUar.difficultyPreference,
    assessmentType:       safeUar.assessmentType ?? defaults?.preferred_assessment_type,
  };

  console.log(`[Pipeline] Version 2.2.0 — mode: ${uarWithDefaults.mode}, depth: ${_depth}`);

  const trace: PipelineTrace = createTrace(
    ["write", "playtest", "compare"] // capabilities for this run
  );
  // ── Step 1: SCRIBE selects best agents for this run ──────────────────────
  const selected = await runAgent( trace, "SCRIBE.selectAgents", SCRIBE.selectAgents, uarWithDefaults );
  console.log("[Pipeline] Selected Agents:", selected);

  // ── Step 2: Architect — build the blueprint ───────────────────────────────
  const blueprint = await runAgent(trace, "Architect", runArchitect, {
    uar: uarWithDefaults,
    compensation: selected.compensationProfile
  });

  // ── Step 3: Writer — generate the initial draft ───────────────────────────
  const writerPrescriptions = SCRIBE.getWriterPrescriptions();

const writerDraft = await runAgent(trace, "Writer", runWriter, {
  blueprint: blueprint.plan,
  uar: uarForWriter(blueprint.uar), // slim: only the 10 fields writerParallel.ts reads
  scribePrescriptions: writerPrescriptions,
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

// token_usage column is integer — WriterTelemetry has no raw API token count yet.
// Set to null until a token counter is wired into writerParallel.
const actualTokenCount: number | null = null;

// 3+4. ValidateAndScore — Gatekeeper + Philosopher write-mode merged (no full-object echoing)
const { gatekeeperResult, philosopherWrite } = await validateAndScore(
  blueprint, writerDraft, trace, writerTelemetry
);

// WRITE MODE BRANCHING
if (philosopherWrite.status === "complete" && philosopherWrite.severity <= 2) {
  // Skip playtest, skip compare → go straight to Builder
  validateSlotIntegrity(blueprint.plan?.slots ?? [], writerDraft);
  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: writerDraft, blueprint: blueprintForBuilder(blueprint) });

  await SCRIBE.saveAssessmentVersion({
    userId: uar.userId,
    uar: uarForScribe(uarWithDefaults),
    domain: selected.domain,
    finalAssessment,
    blueprint: blueprintForScribe(blueprint),
    qualityScore: philosopherWrite.analysis?.qualityScore ?? undefined,
    tokenUsage: actualTokenCount ?? null,

    previousVersionId: uar.previousVersionId ?? null,
    templateId: uar.templateId ?? null,
  });

  const scribeResult = await runAgent(
    trace, "SCRIBE.updateAgentDossier", SCRIBE.updateAgentDossier,
    {
      userId: uar.userId, agentType: `writer:${selected.domain}`,
      gatekeeperReport: gatekeeperResult,
      finalAssessment: finalAssessmentForScribe(finalAssessment),
      blueprint: blueprintForScribe(blueprint), uar: uarForScribe(uarWithDefaults),
      writerTelemetry,
    }
  );

  // Persist the full assessment + trace to writer_history
  await SCRIBE.updateUserDossier({ userId: uar.userId, trace, finalAssessment });

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

  validateSlotIntegrity(blueprint.plan?.slots ?? [], rewritten);
  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: rewritten, blueprint: blueprintForBuilder(blueprint) });

  await SCRIBE.saveAssessmentVersion({
    userId: uar.userId,
    uar: uarForScribe(uarWithDefaults),
    domain: selected.domain,
    finalAssessment,
    blueprint: blueprintForScribe(blueprint),
    qualityScore: philosopherWrite.analysis?.qualityScore ?? undefined,
    tokenUsage: actualTokenCount ?? null,

    previousVersionId: uar.previousVersionId ?? null,
    templateId: uar.templateId ?? null,
  });

  const scribeResult = await runAgent(
    trace, "SCRIBE.updateAgentDossier", SCRIBE.updateAgentDossier,
    {
      userId: uar.userId, agentType: `writer:${selected.domain}`,
      gatekeeperReport: gatekeeperFinal,
      finalAssessment: finalAssessmentForScribe(finalAssessment),
      blueprint: blueprintForScribe(blueprint), uar: uarForScribe(uarWithDefaults),
      writerTelemetry,
    }
  );

  // Persist the full assessment + trace to writer_history
  await SCRIBE.updateUserDossier({ userId: uar.userId, trace, finalAssessment });

  trace.finishedAt = Date.now();
  return {
    selected, blueprint, writerDraft, gatekeeperResult,
    astro1: null, spaceCampResult: null, astro2: null,
    philosopherWrite, rewritten, gatekeeperFinal, finalAssessment, scribe: scribeResult, trace,
  };
}

if (philosopherWrite.status === "rewrite" && philosopherWrite.severity >= 7) {
  // Structural failure → restart pipeline with depth counter
  return await runPipeline(uar, _depth + 1);
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

  validateSlotIntegrity(blueprint.plan?.slots ?? [], rewritten);
  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: rewritten, blueprint: blueprintForBuilder(blueprint) });

  await SCRIBE.saveAssessmentVersion({
    userId: uar.userId,
    uar: uarForScribe(uarWithDefaults),
    domain: selected.domain,
    finalAssessment,
    blueprint: blueprintForScribe(blueprint),
    qualityScore: philosopherPlaytest.analysis?.qualityScore ?? undefined,
    tokenUsage: actualTokenCount ?? null,

    previousVersionId: uar.previousVersionId ?? null,
    templateId: uar.templateId ?? null,
  });

  const scribeResult = await runAgent(
    trace, "SCRIBE.updateAgentDossier", SCRIBE.updateAgentDossier,
    {
      userId: uar.userId, agentType: `writer:${selected.domain}`,
      gatekeeperReport: gatekeeperFinal,
      finalAssessment: finalAssessmentForScribe(finalAssessment),
      blueprint: blueprintForScribe(blueprint), uar: uarForScribe(uarWithDefaults),
      writerTelemetry,
    }
  );

  // Persist the full assessment + trace to writer_history
  await SCRIBE.updateUserDossier({ userId: uar.userId, trace, finalAssessment });

  trace.finishedAt = Date.now();
  return {
    selected, blueprint, writerDraft, gatekeeperResult,
    astro1, spaceCampResult, astro2,
    philosopherWrite, philosopherPlaytest, rewritten, gatekeeperFinal,
    finalAssessment, scribe: scribeResult, trace,
  };
}

if (philosopherPlaytest.status === "rewrite" && philosopherPlaytest.severity >= 7) {
  return await runPipeline(uar, _depth + 1);
}

// ===============================
// 9. BUILDER — FINAL ASSEMBLY (no rewrites needed)
// ===============================

validateSlotIntegrity(blueprint.plan?.slots ?? [], writerDraft);
const finalAssessment = await runAgent(trace, "Builder", runBuilder,
  { items: writerDraft, blueprint: blueprintForBuilder(blueprint) });

await SCRIBE.saveAssessmentVersion({
  userId: uar.userId,
  uar: uarForScribe(uarWithDefaults),
  domain: selected.domain,
  finalAssessment,
  blueprint: blueprintForScribe(blueprint),
  qualityScore: philosopherPlaytest.analysis?.qualityScore ?? undefined,
  tokenUsage: actualTokenCount ?? null,

  previousVersionId: uar.previousVersionId ?? null,
  templateId: uar.templateId ?? null,
});

const scribeResult = await runAgent(
  trace, "SCRIBE.updateAgentDossier", SCRIBE.updateAgentDossier,
  {
    userId: uar.userId, agentType: `writer:${selected.domain}`,
    gatekeeperReport: gatekeeperResult,
    finalAssessment: finalAssessmentForScribe(finalAssessment),
    blueprint: blueprintForScribe(blueprint), uar: uarForScribe(uarWithDefaults),
    writerTelemetry,
  }
);

// Persist the full assessment + trace to writer_history
await SCRIBE.updateUserDossier({ userId: uar.userId, trace, finalAssessment });

trace.finishedAt = Date.now();

return {
  selected, blueprint, writerDraft, gatekeeperResult,
  astro1, spaceCampResult, astro2,
  philosopherWrite, philosopherPlaytest,
  finalAssessment, scribe: scribeResult, trace,
}};
