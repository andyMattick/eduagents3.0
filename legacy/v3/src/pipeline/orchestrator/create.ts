import { problemGeneratorRouter } from "pipeline/agents/pluginEngine/services/problemGeneratorRouter";
import { runDeriveTemplate } from "pipeline/agents/templateDeriver/index";
import { DeriveTemplateRequest } from "pipeline/contracts/UnifiedAssessmentRequest";



import { UnifiedAssessmentRequest } from "pipeline/contracts";
import { DossierManager } from "@/system/dossier/DossierManager";
import { runSummarizer } from "../agents/document/summarizer";
import { buildDocumentInsightsFromInput } from "pipeline/agents/document/insights";
// DIL Comparator + Analyzer available via:
//   import { runComparator } from "../agents/document/comparator";
//   import { runAnalyzer } from "../agents/document/analyzer";
// Agent imports (you will fill these in as you build each agent)
import { runArchitectCached } from "pipeline/agents/architect/planCache";
import { runWriter, getLastWriterTelemetry } from "pipeline/agents/writer";
import { getLastBloomAlignmentLog } from "pipeline/agents/writer/chunk/writerParallel";

/** Dispatch flag: 'build' runs Phase 1 only; 'review' continues to Phase 2. */
export type PipelineMode = "build" | "review";
// import { runGatekeeper } from "pipeline/agents/gatekeeper";
import { runAstronomerPhase1 } from "pipeline/agents/astronomer/phase1";
import { runSpaceCamp } from "pipeline/agents/spacecamp";
import { runAstronomerPhase2 } from "pipeline/agents/astronomer/phase2";
import { runPhilosopher } from "pipeline/agents/philosopher";
import { runRewriter } from "pipeline/agents/rewriter";
import { runBuilder } from "pipeline/agents/builder";
import { SCRIBE } from "pipeline/agents/scribe";
import { Gatekeeper } from "../agents/gatekeeper/Gatekeeper";
import { createTrace, logAgentStep } from "@/utils/trace";
import { runAgent } from "@/utils/runAgent";
import { PipelineTrace } from "@/types/Trace";
import { supabase } from "@/supabase/client";
import { resetLLMGate } from "pipeline/llm/gemini";
import { normalizeItems } from "pipeline/utils/itemNormalizer";
import "pipeline/agents/pluginEngine/services/problemPlugins";
import { loadPlugins, listPlugins } from "pipeline/agents/pluginEngine/services/pluginRegistry";

import {
  initContract,
  getContract,
  clearContract,
  appendGatekeeperPrescription,
  setStyleConstraints,
} from "pipeline/agents/scribe/WriterContractStore";
import { loadOrDefaultTeacherProfile } from "@/services_new/teacherProfileService";
import { injectProfileIntoUAR } from "pipeline/agents/architect/conflictResolution";
import { withConcurrencyLimit } from "pipeline/utils/concurrency";

// ── Plugin-Based Instruction Engine imports ─────────────────────────────────
import {
  getConceptGraph,
  resetConceptGraph,
} from "pipeline/agents/pluginEngine/conceptGraph";
// Bootstrap plugin registration (templates, diagrams, LLM fallback)
// (problemPlugins barrel already imported above; InputJudge is dynamically imported in the pipeline body)

console.log("[Pipeline] Loaded runPipeline.ts — Version 3.0.0 (Plugin Engine)");

// ─────────────────────────────────────────────────────────────────────────────
// Lean helpers — extract only what each downstream agent actually reads.
// Avoids passing full blueprints, drafts, and UARs where scalars suffice.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builder needs slot metadata for rendering and output enrichment.
 * Keep this object lean, but preserve slot-level governance fields.
 */
function blueprintForBuilder(blueprint: any): { plan: { slots: any[] } } {
  return {
    plan: {
      slots: (blueprint.plan?.slots ?? []).map((s: any) => ({
        id: s.id,
        questionType: s.questionType,
        cognitiveDemand: s.cognitiveDemand,
        difficulty: s.difficulty,
        pacing: s.pacing,
        topicAngle: s.topicAngle,
        generationMethod: s.generationMethod,
        templateId: s.templateId ?? null,
        diagramType: s.diagramType ?? null,
        imageReferenceId: s.imageReferenceId ?? null,
        constraints: s.constraints ?? null,
        media: s.media ?? null,
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
 * Full telemetry snapshot stored in assessment_versions.blueprint_json.
 * Richer than blueprintForScribe — includes Writer telemetry, Gatekeeper
 * violation log, and a WriterContract snapshot for incident report assembly.
 */
function blueprintForStorage(
  blueprint: any,
  writerTelemetry: any | null,
  gatekeeperResult: any,
): Record<string, any> {
  const p = blueprint.plan ?? {};
  const c = getContract();
  return {
    plan: {
      cognitiveDistribution: p.cognitiveDistribution,
      difficultyProfile:     p.difficultyProfile,
      orderingStrategy:      p.orderingStrategy,
      pacingSecondsPerItem:  p.pacingSecondsPerItem,
      targetSlots:           p.targetSlots ?? p.slotCount ?? null,
      adjustedQuestionCount: p.adjustedCount ?? null,
    },
    // Writer adaptive-chunking telemetry
    rewriteCount:    writerTelemetry?.rewriteCount    ?? 0,
    itemsGenerated:  writerTelemetry?.itemsGenerated  ?? null,
    chunksGenerated: writerTelemetry?.chunksGenerated ?? null,
    // Gatekeeper per-item violation log (needed for incident report)
    gatekeeperViolations: (gatekeeperResult?.violations ?? []).map((v: any) => ({
      type:    v.type,
      message: v.message ?? null,
      itemId:  v.itemId  ?? null,
    })),
    constraintWarnings: blueprint.constraintWarnings ?? [],
    truncationEvents:   blueprint.truncationEvents   ?? [],
    feasibilityRisk:    blueprint.feasibilityRisk    ?? blueprint.riskLevel ?? "safe",
    topicRejected:      blueprint.topicRejected      ?? false,
    gradeTextWarning:   blueprint.gradeTextWarning   ?? null,
    // Writer Contract snapshot — preserved for incident report reconstruction
    writerContract: c ? {
      teacherIntent:           c.teacherIntent,
      systemConstraints:       c.systemConstraints,
      styleConstraints:        c.styleConstraints ?? null,
      gatekeeperPrescriptions: c.gatekeeperPrescriptions,
      finalWriterGuidelines:   c.finalWriterGuidelines,
    } : null,
    // SCRIBE writer prescriptions (if any were active this run)
    scribePrescriptions: (blueprint as any).scribePrescriptions ?? null,
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
function finalAssessmentForScribe(fa: any): {
  questionCount: number;
  questionTypes: string[];
  templateSlotsUsed: number;
  diagramSlotsUsed: number;
  imageSlotsUsed: number;
  sectionCount: number;
} {
  const items = fa.items ?? [];
  const templateSlotsUsed = items.filter((i: any) => !!(i.metadata?.templateId)).length;
  const diagramSlotsUsed = items.filter((i: any) => !!(i.metadata?.diagramType)).length;
  const imageSlotsUsed = items.filter((i: any) => !!(i.metadata?.imageReferenceId)).length;
  const sectionCount = Object.keys(fa.metadata?.sectionInstructions ?? {}).length;

  return {
    questionCount: items.length,
    questionTypes: items.map((i: any) => i.questionType).filter(Boolean) as string[],
    templateSlotsUsed,
    diagramSlotsUsed,
    imageSlotsUsed,
    sectionCount,
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
    // ── Summarizer-extracted fields (populated when sourceDocuments were present) ──
    extractedConcepts:   uar.extractedConcepts   ?? null,
    extractedVocabulary: uar.extractedVocabulary  ?? null,
    extractedDifficulty: uar.extractedDifficulty  ?? null,
    extractedAngles:     uar.extractedAngles      ?? null,
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
  // Read style constraints from the active WriterContract
  const styleConstraints = getContract()?.styleConstraints ?? null;
  const gk = Gatekeeper.validate(blueprint.plan, writerDraft, styleConstraints);

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

// ── Concept Graph tagging helper ─────────────────────────────────────────────
// Called after Builder to tag every generated item into the Concept Graph.
function tagConceptGraph(finalAssessment: any): void {
  try {
    const graph = getConceptGraph();
    const items = finalAssessment?.items ?? [];
    for (const item of items) {
      const meta = item.metadata ?? item.pluginMetadata ?? {};
      graph.tagProblem({
        problemId: item.slotId ?? item.id ?? "unknown",
        concepts: meta.concepts ?? [],
        skills: meta.skills ?? [],
        standards: meta.standards ?? [],
        pluginId: meta.pluginId ?? meta.plugin_id ?? undefined,
        generationMethod: meta.generationMethod ?? meta.generation_method ?? undefined,
      });
    }
    const snapshot = graph.getSnapshot();
    console.info(
      `[ConceptGraph] Tagged ${items.length} items — ` +
      `${snapshot.coverage.assessedConcepts} concepts, ` +
      `coverage: ${(snapshot.coverage.coverageRatio * 100).toFixed(0)}%`
    );
  } catch (err) {
    console.warn("[ConceptGraph] Tagging failed (non-fatal):", err);
  }
}

// ── Blueprint snapshot (for live preview) ─────────────────────────────────────
// Set immediately after Architect runs so the UI can retrieve slot info while
// items are still streaming in from the Writer.
let _lastPipelineBlueprint: any = null;

/** Return the most recently built blueprint (set after Architect step). */
export function getLastPipelineBlueprint(): any {
  return _lastPipelineBlueprint;
}

export async function create(request: UnifiedAssessmentRequest) {
  switch (request.mode) {
    case "create":
      return runCreatePipeline({ ...request, mode: "write" } as UnifiedAssessmentRequest);
    case "write":
    case "compare":
    case "review":
      return runCreatePipeline(request);
    case "deriveTemplate":
      return runDeriveTemplate(request as DeriveTemplateRequest);
    default:
      throw new Error(`Unsupported mode: ${request.mode}`);
  }
}

export async function runCreatePipeline(
  uar: UnifiedAssessmentRequest,
  _depth = 0,
  onItemsProgress?: (partialItems: import("pipeline/agents/writer/types").GeneratedItem[]) => void
) {
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

  // ── Clear any contract from a previous run ────────────────────────────
  clearContract();

  // ── Reset Concept Graph for this run ──────────────────────────────────
  resetConceptGraph();

  await loadPlugins(); console.log("[Pipeline] Plugins loaded");
  console.log("[PluginRegistry] Loaded plugins:", listPlugins());


  // ── Ensure required UAR fields have safe defaults ─────────────────────────
  // mode and subscriptionTier may not be set by convertMinimalToUAR.
  const safeUar: UnifiedAssessmentRequest = {
    ...uar,
    mode: uar.mode ?? "write",
    subscriptionTier: uar.subscriptionTier ?? "free",
  };

  // ── Admin override: admins always get pro-level access ──────────────────
  // Read from supabase user role or treat subscriptionTier === "admin" as override.
  if (safeUar.subscriptionTier === "admin") {
    (safeUar as any).subscriptionTier = "admin";
    (safeUar as any)._isAdminOverride = true;
  }

  // ── Tier gate (before any DB/LLM calls) ───────────────────────────────────
  if (safeUar.mode === "review" && safeUar.subscriptionTier !== "tier2" && safeUar.subscriptionTier !== "admin") {
    throw new Error("Learner review is only available for Tier 2 users.");
  }

  // ── Step 0a: load predictive teacher defaults ────────────────────────────
  const { data: defaultsRows } = await supabase
    .from("teacher_defaults")
    .select("*")
    .eq("teacher_id", safeUar.userId)
    .limit(1);
  const defaults = defaultsRows?.[0] ?? null;

  // ── Step 0a2: load teacher profile (stable defaults) ────────────────────
  // Non-fatal — if Supabase is unavailable the pipeline continues with runtime values.
  let teacherProfile = null;
  try {
    teacherProfile = safeUar.userId
      ? await loadOrDefaultTeacherProfile(safeUar.userId)
      : null;
  } catch (err) {
    console.warn("[Pipeline] TeacherProfile load failed — proceeding without profile defaults:", err);
  }

  // ── Step 0b: merge predictive defaults into the UAR ───────────────────────
  let uarWithDefaults: UnifiedAssessmentRequest = {
    ...safeUar,
    questionTypes:        safeUar.questionTypes,
    questionCount:        defaults?.avg_question_count ?? safeUar.questionCount,
    difficultyPreference: defaults?.preferred_difficulty ?? safeUar.difficultyPreference,
    assessmentType:       safeUar.assessmentType ?? defaults?.preferred_assessment_type,
  };

  // ── Step 0b2: inject teacher profile defaults into UAR ────────────────────
  // Profile fills in any field the teacher left unspecified (assessment type,
  // question types, question count derived from pacing). This is the primary
  // mechanism for reducing the number of questions asked in the conversation.
  if (teacherProfile) {
    uarWithDefaults = injectProfileIntoUAR(uarWithDefaults, teacherProfile);
    console.log(
      "[Pipeline] TeacherProfile injected:",
      `assessmentType=${uarWithDefaults.assessmentType},`,
      `questionTypes=${(uarWithDefaults.questionTypes ?? []).join(",")},`,
      `questionCount=${uarWithDefaults.questionCount ?? "derived"}`
    );
  }

  // ── Step 0c: Document enrichment via Summarizer ───────────────────────────
  // If the teacher uploaded source documents, run the Summarizer to extract
  // concepts, vocabulary, difficulty, and question angles. These are merged
  // into the UAR so the Architect and Writer can use them without re-parsing.
  if (uarWithDefaults.sourceDocuments?.length) {
    try {
      const docSummary = await runSummarizer(
        uarWithDefaults.sourceDocuments.map((d) => d.content)
      );
      uarWithDefaults = {
        ...uarWithDefaults,
        extractedConcepts:    docSummary.keyConcepts,
        extractedVocabulary:  docSummary.vocabulary,
        extractedDifficulty:  docSummary.difficulty,
        extractedAngles:      docSummary.questionAngles,
      };
      console.log(
        `[Pipeline] Summarizer: ${docSummary.keyConcepts.length} concepts, ` +
        `${docSummary.vocabulary.length} vocab terms, difficulty=${docSummary.difficulty}, ` +
        `${docSummary.questionAngles.length} question angles extracted.`
      );
    } catch (err) {
      // Non-fatal — pipeline continues without enrichment rather than failing
      console.warn("[Pipeline] Summarizer failed — proceeding without document enrichment:", err);
    }
  }

  const documentInsights = buildDocumentInsightsFromInput({
    sourceDocuments: uarWithDefaults.sourceDocuments,
    topic: uarWithDefaults.topic ?? uarWithDefaults.unitName,
    course: uarWithDefaults.course,
    additionalDetails: uarWithDefaults.additionalDetails,
  });

  console.log(`[Pipeline] Version 2.2.0 — mode: ${uarWithDefaults.mode}, depth: ${_depth}`);

  const trace: PipelineTrace = createTrace(
    ["write", "review", "compare"] // capabilities for this run
  );
  // ── Step 1: SCRIBE selects best agents for this run ──────────────────────
  const selected = await runAgent( trace, "SCRIBE.selectAgents", SCRIBE.selectAgents, uarWithDefaults );
  console.log("[Pipeline] Selected Agents:", selected);

  // ── Step 2: Architect — build the blueprint ───────────────────────────────
  const blueprint = await runAgent(trace, "Architect", runArchitectCached, {
    
    uar: uarWithDefaults,
    compensation: selected.compensationProfile,
    teacherProfile,
  });

  // ── Step 2: Convert Architect slots → ProblemSlots ─────────────────────────
const problemSlots = (blueprint.plan?.slots ?? []).map((s: any) => ({
  slot_id: s.id,
  problem_source:
    s.templateId ? "template" :
    s.diagramType ? "diagram" :
    s.imageReferenceId ? "image_analysis" :
    "llm",
  questionType: s.questionType,
  problem_type: s.questionType,
  template_id: s.templateId ?? null,
  diagram_type: s.diagramType ?? null,
  image_reference_id: s.imageReferenceId ?? null,
  topic: s.topicAngle ?? blueprint.uar?.topic ?? "",
  subtopic: null,
  difficulty: s.difficulty ?? "medium",
  pacing_seconds: s.pacingSeconds ?? null,
  question_format: s.questionType,
  cognitive_demand: s.cognitiveDemand ?? null,
  sharedContext: s.sharedContext ?? null,
  itemType: s.itemType ?? null,
}));
blueprint.problemSlots = problemSlots; // Attach to blueprint for downstream agents

// ── Step 3: Enforce Slot → Plugin Mapping Rules ─────────────────────────────
for (const slot of blueprint.problemSlots) {
  if (slot.problem_source === "template") {
    slot.diagram_type = null;
    slot.image_reference_id = null;
  }
  if (slot.problem_source === "diagram") {
    slot.template_id = null;
    slot.image_reference_id = null;
  }
  if (slot.problem_source === "image_analysis") {
    slot.template_id = null;
    slot.diagram_type = null;
  }
  if (slot.problem_source === "llm") {
    slot.template_id = null;
    slot.diagram_type = null;
    slot.image_reference_id = null;
  }
}




  // Snapshot for live preview — readable by getLastPipelineBlueprint()
  _lastPipelineBlueprint = blueprint;

  // ── Log feasibility analysis into the trace ────────────────────────────────
  if (blueprint.feasibilityReport) {
    const fr = blueprint.feasibilityReport;
    logAgentStep(
      trace,
      "Architect.feasibility",
      { requestedSlots: fr.loadRatio > 0 ? Math.round(fr.conceptualSurfaceScore * fr.loadRatio) : 0 },
      {
        feasibilityScore: fr.feasibilityScore,
        riskLevel: fr.riskLevel,
        loadRatio: fr.loadRatio,
        conceptualSurface: fr.conceptualSurfaceScore,
        recommendedRange: fr.recommendedSlotRange,
        bloomRisk: fr.bloomRisk,
        adjustedTo: fr.adjustedQuestionCount,
        uniqueTerms: fr.conceptProfile.uniqueTerms.length,
        bigramCount: fr.conceptProfile.bigramConcepts.length,
        docTokens: fr.conceptProfile.documentTokenCount,
      }
    );
  }


  // ── Create Writer Contract ─────────────────────────────────────────────────
  // Captures teacher intent + system constraints derived by the Architect.
  // Gatekeeper violations will be appended below; guidelines are read by the Writer.
  {
    const slots = blueprint.plan?.slots ?? [];
    const typeDist = slots.reduce((acc: Record<string, number>, s: any) => {
      const t = s.questionType ?? "unknown";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    const topicAngles: string[] = slots.map((s: any) => s.topicAngle ?? "");

    initContract({
      id: `${uarWithDefaults.userId ?? "anon"}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      teacherIntent: {
        course: uarWithDefaults.course ?? "",
        topic: uarWithDefaults.topic ?? uarWithDefaults.unitName ?? "",
        grade: String(uarWithDefaults.gradeLevels?.[0] ?? (uarWithDefaults as any).grade ?? ""),
        timeMinutes: (uarWithDefaults as any).timeMinutes ?? (uarWithDefaults as any).time ?? 0,
        questionCount: slots.length,
        questionTypes: uarWithDefaults.questionTypes ?? [],
        assessmentType: uarWithDefaults.assessmentType ?? "",
        additionalDetails: uarWithDefaults.additionalDetails ?? null,
      },
      systemConstraints: {
        bloomFloor: blueprint.plan?.depthFloor ?? "",
        bloomCeiling: blueprint.plan?.depthCeiling ?? "",
        difficultyProfile: blueprint.plan?.difficultyProfile ?? "onLevel",
        slotCount: slots.length,
        pacingSecondsPerItem: blueprint.plan?.pacingSecondsPerItem ?? 60,
        mathFormat: (uarWithDefaults as any).mathFormat ?? "unicode",
        uniquenessRequired: true,
        jsonSafety: true,
        questionTypeDistribution: typeDist,
        preferMultipleChoiceActivated:
          !!(blueprint as any).derivedStructuralConstraints?.preferMultipleChoice,
        topicAngles,
        // Feasibility context — Writer can see if slots were constrained
        feasibilityRiskLevel: blueprint.feasibilityReport?.riskLevel ?? "safe",
        feasibilitySurface: blueprint.feasibilityReport?.conceptualSurfaceScore ?? null,
      } as any,
      gatekeeperPrescriptions: { violations: [], addedConstraints: [] },
      revisionHistory: [],
      studentPerformanceAdjustments: [],
      finalWriterGuidelines: [],
    });

    console.info(
      `[WriterContract] Created for run. Types: ${JSON.stringify(typeDist)}. Slots: ${slots.length}.`
    );

    // ── Inject teacher profile style constraints into the contract ─────────
    // styleConstraints are forwarded from the Architect (which read them from
    // the blueprint.styleConstraints field set by the Teacher Profile Engine).
    if ((blueprint as any).styleConstraints) {
      setStyleConstraints((blueprint as any).styleConstraints);
      console.info("[WriterContract] Style constraints injected from teacher profile.");
    }
  }

  // ── Step 3: Writer — generate the initial draft ───────────────────────────
  const writerPrescriptions = SCRIBE.getWriterPrescriptions();
// ── Step 5: Router-first generation with Writer fallback ────────────────────
/** Max concurrent plugin router calls — keeps template lookups bounded. */
const PLUGIN_ROUTER_CONCURRENCY = 4;

const pluginContext = {
  gradeLevels: uarWithDefaults.gradeLevels,
  course: uarWithDefaults.course,
  topic: uarWithDefaults.topic ?? blueprint.uar?.topic ?? "",
  assessmentType: uarWithDefaults.assessmentType,
  difficultyPreference: uarWithDefaults.difficultyPreference,
  studentLevel: uarWithDefaults.studentLevel,
  extractedConcepts: uarWithDefaults.extractedConcepts,
  extractedVocabulary: uarWithDefaults.extractedVocabulary,
  extractedDifficulty: uarWithDefaults.extractedDifficulty,
  extractedAngles: uarWithDefaults.extractedAngles,
  blueprint,
};

const routerTasks = (blueprint.problemSlots ?? []).map((slot: any) => async () => {
  try {
    // Try plugin engine
    const problem = await problemGeneratorRouter(slot, pluginContext);
    return {
      slotId: slot.slot_id,
      ...problem,
      pluginMetadata: {
        pluginId: problem._pluginId,
        generationMethod: "plugin",
      },
    };
  } catch (err) {
    console.warn(
      `[Pipeline] Router failed for slot ${slot.slot_id}, falling back to Writer:`,
      err
    );
    // Mark slot for Writer fallback
    return { slotId: slot.slot_id, _fallbackToWriter: true };
  }
});

const routedItems: any[] = await withConcurrencyLimit(PLUGIN_ROUTER_CONCURRENCY, routerTasks);

// ── Step 5b: Writer fallback for any slots Router could not handle ─────────
const writerFallbackSlots = routedItems.filter(i => i._fallbackToWriter);

let writerDraft: any[] = [];

if (writerFallbackSlots.length > 0) {
  console.log(
    `[Pipeline] Writer fallback activated for ${writerFallbackSlots.length} slots`
  );

  writerDraft = await runAgent(trace, "Writer", runWriter, {
    blueprint: {
      slots: blueprint.plan.slots.filter((s: any) =>
        writerFallbackSlots.some((i: any) => i.slotId === s.id)
      ),
    },
    uar: uarForWriter({
      ...blueprint.uar,
      extractedConcepts: uarWithDefaults.extractedConcepts,
      extractedVocabulary: uarWithDefaults.extractedVocabulary,
      extractedDifficulty: uarWithDefaults.extractedDifficulty,
      extractedAngles: uarWithDefaults.extractedAngles,
    }),
    scribePrescriptions: writerPrescriptions,
    compensation: selected.compensationProfile,
    onItemsProgress,
  });
}

// ── Step 5c: Merge plugin items + Writer fallback items ─────────────────────
const mergedDraft = routedItems.map((item) => {
  if (!item._fallbackToWriter) return item;

  const writerItem = writerDraft.find((w: any) => w.slotId === item.slotId);
  return {
    ...writerItem,
    pluginMetadata: {
      pluginId: "llm_default",
      generationMethod: "writer_fallback",
    },
  };
});


// 2b. Count invariant — warn if Writer dropped any of the fallback slots it was
// responsible for, but continue rather than aborting the entire run.
if (writerDraft.length !== writerFallbackSlots.length) {
  console.error(
    `[Pipeline] Warning: Writer returned ${writerDraft.length} items but was given ${writerFallbackSlots.length} fallback slot(s). ` +
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
  blueprint, mergedDraft, trace, writerTelemetry
);


// ── Update Writer Contract with Gatekeeper violations ─────────────────────
// Maps each violation type to a concrete prescription that the Writer will
// receive on the next generation call.
{
  const VIOLATION_PRESCRIPTIONS: Record<string, string> = {
    question_type_mismatch:
      "Each slot has a fixed questionType — generate exactly that type with no hybrid formatting.",
    mcq_options_invalid:
      "Multiple-choice options must be exactly 4 strings, each prefixed 'A. ', 'B. ', 'C. ', 'D. '.",
    mcq_answer_mismatch:
      "The 'answer' field must be the FULL option string, copied exactly from 'options' — not just the letter.",
    mcq_options_unexpected:
      "Non-multiple-choice slots must NOT include an 'options' array.",
    arithmetic_format_invalid:
      "Arithmetic items must be a bare expression only (e.g. '7 × 4') — no prose.",
    passage_missing:
      "passageBased items must include a non-empty top-level 'passage' string field.",
    passage_contains_raw_newlines:
      "Never use raw newlines inside JSON string fields — replace with a space.",
    topic_mismatch:
      "Every question must explicitly reference the lesson topic — do not write generic or off-topic prompts.",
    domain_mismatch:
      "Every question must belong to the specified subject domain.",
    cognitive_demand_mismatch:
      "Use verbs that match the slot's cognitiveDemand Bloom level (see Bloom definitions in the prompt).",
    forbidden_phrase:
      "Avoid generic filler phrases such as 'in general mathematics' — anchor every question to the lesson topic.",
    duplicate_item:
      "Do not reuse the same scenario, numbers, or stem wording across slots — use each slot's unique topicAngle.",
    json_error:
      'Escape every double-quote inside JSON string values as \\". Never use raw newlines in strings.',
    forbidden_content:
      "Avoid sensitive, violent, or politically contentious content — keep questions school-appropriate.",
  };

  for (const v of gatekeeperResult.violations ?? []) {
    const prescription =
      VIOLATION_PRESCRIPTIONS[v.type] ??
      `Violation "${v.type}" detected: ${v.message}`;
    appendGatekeeperPrescription(v.type, prescription);
  }

  if ((gatekeeperResult.violations ?? []).length > 0) {
    console.info(
      `[WriterContract] Appended ${gatekeeperResult.violations.length} gatekeeper prescription(s).`
    );
  }
}
if (philosopherWrite.status === "complete" && philosopherWrite.severity <= 2) {
  // Skip learner review, skip compare -> go straight to Builder
  validateSlotIntegrity(blueprint.plan?.slots ?? [], mergedDraft);
  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: mergedDraft, blueprint: blueprintForBuilder(blueprint) });

  // ── Concept Graph tagging ──────────────────────────────────────────────
  tagConceptGraph(finalAssessment);

  await SCRIBE.saveAssessmentVersion({
    userId: uar.userId,
    uar: uarForScribe(uarWithDefaults),
    domain: selected.domain,
    finalAssessment,
    blueprint: blueprintForStorage(blueprint, writerTelemetry, gatekeeperResult),
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

  // ── Log pipeline decisions + process student performance (non-fatal) ──────────
  const _perfData = (uarWithDefaults as any).studentPerformance;
  if (_perfData) {
    DossierManager.processStudentPerformance(uar.userId, `writer:${selected.domain}`, _perfData).catch(() => {});
  }
  DossierManager.logPipelineDecisions(uar.userId, `writer:${selected.domain}`, {
    layout: finalAssessment.metadata?.layout
      ? { layout: finalAssessment.metadata.layout, reason: "Builder auto-determined" }
      : undefined,
    sectionOrdering: finalAssessment.metadata?.sectionInstructions
      ? { sections: Object.keys(finalAssessment.metadata.sectionInstructions) }
      : undefined,
    operandRange: (uarWithDefaults as any).range
      ? { operation: (uarWithDefaults as any).operation ?? "multiply", ...(uarWithDefaults as any).range }
      : undefined,
  }).catch(() => {});

  trace.finishedAt = Date.now();
  return {
    selected, blueprint, writerDraft, gatekeeperResult,
    astro1: null, spaceCampResult: null, astro2: null,
    philosopherWrite, finalAssessment, scribe: scribeResult, trace,
    writerContract: getContract(),
  };
}

if (philosopherWrite.status === "rewrite" && philosopherWrite.severity <= 6) {
  const rewritten = await runAgent(trace, "Rewriter", runRewriter, {
    writerDraft: mergedDraft,
    rewriteInstructions: philosopherWrite.rewriteInstructions,
    mathFormat: (uarWithDefaults as any).mathFormat,
  });

  // Normalize template plugin output BEFORE Gatekeeper sees it
  // NOTE: Using itemNormalizer from utils to ensure single source of truth
  const normalizedForGK = normalizeItems(rewritten);

const gatekeeperFinal = Gatekeeper.validate(
  blueprint.plan,
  normalizedForGK
);

  logAgentStep(trace, "Gatekeeper (Final)",
    { slotCount: blueprint.plan?.slots?.length ?? 0, itemCount: rewritten.length },
    { ok: gatekeeperFinal.ok, violationCount: gatekeeperFinal.violations?.length ?? 0 });

  validateSlotIntegrity(blueprint.plan?.slots ?? [], rewritten);
  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: rewritten, blueprint: blueprintForBuilder(blueprint) });

  // ── Concept Graph tagging ──────────────────────────────────────────────
  tagConceptGraph(finalAssessment);

  await SCRIBE.saveAssessmentVersion({
    userId: uar.userId,
    uar: uarForScribe(uarWithDefaults),
    domain: selected.domain,
    finalAssessment,
    blueprint: blueprintForStorage(blueprint, writerTelemetry, gatekeeperFinal),
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

  // ── Log pipeline decisions + process student performance (non-fatal) ──────────
  { const _p = (uarWithDefaults as any).studentPerformance;
    if (_p) DossierManager.processStudentPerformance(uar.userId, `writer:${selected.domain}`, _p).catch(() => {});
    DossierManager.logPipelineDecisions(uar.userId, `writer:${selected.domain}`, {
      layout: finalAssessment.metadata?.layout ? { layout: finalAssessment.metadata.layout, reason: "Builder auto-determined" } : undefined,
      sectionOrdering: finalAssessment.metadata?.sectionInstructions ? { sections: Object.keys(finalAssessment.metadata.sectionInstructions) } : undefined,
      operandRange: (uarWithDefaults as any).range ? { operation: (uarWithDefaults as any).operation ?? "multiply", ...(uarWithDefaults as any).range } : undefined,
    }).catch(() => {}); }

  trace.finishedAt = Date.now();
  return {
    selected, blueprint, writerDraft, gatekeeperResult,
    astro1: null, spaceCampResult: null, astro2: null,
    philosopherWrite, rewritten, gatekeeperFinal, finalAssessment, scribe: scribeResult, trace,
    writerContract: getContract(),
    documentInsights,
  };
}

if (philosopherWrite.status === "rewrite" && philosopherWrite.severity >= 7) {
  // Structural failure → restart pipeline with depth counter
  return await runCreatePipeline(uar, _depth + 1, onItemsProgress);
}

// ===============================
// 5. ASTRONOMER PHASE 1 — analyze the draft
// ===============================

const astro1 = await runAgent(
  trace,
  "Astronomer Phase 1",
  runAstronomerPhase1,
  {
    writerDraft: mergedDraft,
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
// 8. PHILOSOPHER — REVIEW MODE
// ===============================

const philosopherReview = await runAgent(
  trace,
  "Philosopher (review)",
  runPhilosopher,
  {
    mode: "review",
    payload: astro2,
  }
);

// REVIEW BRANCHING
if (philosopherReview.status === "rewrite" && philosopherReview.severity <= 6) {
  const rewritten = await runAgent(trace, "Rewriter", runRewriter, {
    writerDraft: mergedDraft,
    rewriteInstructions: philosopherReview.rewriteInstructions,
    mathFormat: (uarWithDefaults as any).mathFormat,
  });

  const gatekeeperFinal = Gatekeeper.validate(blueprint.plan, rewritten);
  logAgentStep(trace, "Gatekeeper (Final)",
    { slotCount: blueprint.plan?.slots?.length ?? 0, itemCount: rewritten.length },
    { ok: gatekeeperFinal.ok, violationCount: gatekeeperFinal.violations?.length ?? 0 });

  validateSlotIntegrity(blueprint.plan?.slots ?? [], rewritten);
  const finalAssessment = await runAgent(trace, "Builder", runBuilder,
    { items: rewritten, blueprint: blueprintForBuilder(blueprint) });

  // ── Concept Graph tagging ──────────────────────────────────────────────────
  tagConceptGraph(finalAssessment);

  await SCRIBE.saveAssessmentVersion({
    userId: uar.userId,
    uar: uarForScribe(uarWithDefaults),
    domain: selected.domain,
    finalAssessment,
    blueprint: blueprintForStorage(blueprint, writerTelemetry, gatekeeperFinal),
    qualityScore: philosopherReview.analysis?.qualityScore ?? undefined,
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

  // ── Log pipeline decisions + process student performance (non-fatal) ──────
  { const _p = (uarWithDefaults as any).studentPerformance;
    if (_p) DossierManager.processStudentPerformance(uar.userId, `writer:${selected.domain}`, _p).catch(() => {});
    DossierManager.logPipelineDecisions(uar.userId, `writer:${selected.domain}`, {
      layout: finalAssessment.metadata?.layout ? { layout: finalAssessment.metadata.layout, reason: "Builder auto-determined" } : undefined,
      sectionOrdering: finalAssessment.metadata?.sectionInstructions ? { sections: Object.keys(finalAssessment.metadata.sectionInstructions) } : undefined,
      operandRange: (uarWithDefaults as any).range ? { operation: (uarWithDefaults as any).operation ?? "multiply", ...(uarWithDefaults as any).range } : undefined,
    }).catch(() => {}); }

  trace.finishedAt = Date.now();
  return {
    selected, blueprint, writerDraft, gatekeeperResult,
    astro1, spaceCampResult, astro2,
    philosopherWrite, philosopherReview, rewritten, gatekeeperFinal,
    finalAssessment, scribe: scribeResult, trace,
    writerContract: getContract(),
    documentInsights,
  };
}

if (philosopherReview.status === "rewrite" && philosopherReview.severity >= 7) {
  return await runCreatePipeline(uar, _depth + 1, onItemsProgress);
}

// ===============================
// 9. BUILDER — FINAL ASSEMBLY (no rewrites needed)
// ===============================

validateSlotIntegrity(blueprint.plan?.slots ?? [], mergedDraft);
const finalAssessment = await runAgent(trace, "Builder", runBuilder,
  { items: mergedDraft, blueprint: blueprintForBuilder(blueprint) });

// ── Concept Graph tagging ──────────────────────────────────────────────
tagConceptGraph(finalAssessment);

await SCRIBE.saveAssessmentVersion({
  userId: uar.userId,
  uar: uarForScribe(uarWithDefaults),
  domain: selected.domain,
  finalAssessment,
  blueprint: blueprintForStorage(blueprint, writerTelemetry, gatekeeperResult),
  qualityScore: philosopherReview.analysis?.qualityScore ?? undefined,
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
  philosopherWrite, philosopherReview,
  finalAssessment, scribe: scribeResult, trace,
  writerContract: getContract(),
  documentInsights,
};
}
