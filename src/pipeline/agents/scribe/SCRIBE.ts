// src/pipeline/agents/scribe/SCRIBE.ts
import { AgentSelector } from "./AgentSelector";
import { CompensationEngine } from "./CompensationEngine";
import { DossierManager } from "@/system/dossier/DossierManager";
import type { GatekeeperReport } from "@/pipeline/agents/gatekeeper/GatekeeperReport";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";
import { supabase } from "@/supabase/client";
import type { BloomAlignmentLog } from "@/pipeline/agents/gatekeeper/bloomClassifier";
import { BLOOM_ORDER } from "@/pipeline/agents/gatekeeper/bloomClassifier";

// Persistent in-memory dossier (simple, append-only)
const writerDossier = {
  weaknesses: [] as string[],
  forbiddenBehaviors: [] as string[],
  requiredBehaviors: [] as string[],
  history: [] as {
    slotId: string;
    violations: string[];
    timestamp: number;
  }[]
};


/**
 * Compute predictive defaults from a teacher's assessment history.
 * As more assessments are generated, these defaults improve.
 */
function computeDefaults(history: any[]): Record<string, any> {
  if (!history.length) return {};

  // Most common assessment type
  const typeCounts: Record<string, number> = {};
  for (const row of history) {
    const t = row.assessment_type ?? "unknown";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  const preferredAssessmentType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Average question count
  const avgQuestionCount = Math.round(
    history.reduce((sum, r) => sum + (r.question_count ?? 0), 0) / history.length
  );

  // Most common difficulty profile
  const diffCounts: Record<string, number> = {};
  for (const row of history) {
    const d = row.difficulty_profile ?? "onLevel";
    diffCounts[d] = (diffCounts[d] ?? 0) + 1;
  }
  const preferredDifficulty = Object.entries(diffCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    preferred_assessment_type: preferredAssessmentType,
    avg_question_count: avgQuestionCount,
    preferred_difficulty: preferredDifficulty,
  };
}

/**
 * Module-level helpers that mutate writerDossier in-place.
 * Hoisted here so both updateWriterDossier and recalibrateFromBloomDrift can use them.
 */
function addForbidden(b: string) {
  if (!writerDossier.forbiddenBehaviors.includes(b)) {
    writerDossier.forbiddenBehaviors.push(b);
  }
}

function addRequired(b: string) {
  if (!writerDossier.requiredBehaviors.includes(b)) {
    writerDossier.requiredBehaviors.push(b);
  }
}

export class SCRIBE {
  // -----------------------------------------------------
  // 1. PRE-RUN AGENT SELECTION
  // -----------------------------------------------------
  static async selectAgents(uar: any) {
    const userId = uar.userId;
    const domain = uar.domain ?? uar.course ?? "General";

    // Ensure the dossier row exists and load the domain-specific writer dossier for compensation
    const writer = await AgentSelector.selectAgent(userId, `writer:${domain}`);
    // Architect/Astronomer domain dossiers are auto-created at update time — no need to pre-select

    const compensationProfile = CompensationEngine.generateCompensation(
      writer.dossier,
      { domain }
    );

    return {
      compensationProfile,
      domain,   // pass through so runPipeline can forward it to updateAgentDossier
    };
  }

  // -----------------------------------------------------
  // 2. UPDATE AGENT DOSSIER
  // -----------------------------------------------------

  /**
   * S1: Accept writer telemetry alongside gatekeeper violations.
   * S2: Apply threshold gate — only escalate prescriptions when the Writer
   *     needed excessive rewrites (rewriteCount / questionCount > 0.5 or > 10).
   * S6: Prune each category to MAX_PRESCRIPTIONS_PER_CATEGORY after update.
   */
  static updateWriterDossier(
    gatekeeperResult: { violations: { slotId: string; type: string }[] },
    telemetry?: { rewriteCount?: number; finalProblemCount?: number; gatekeeperViolations?: number } | null
  ) {
  const MAX_PER_CATEGORY = 5;
  const now = Date.now();

  // S2: Two-tier rewrite threshold.
  //   > 0.75 → systemic friction (full prescription set)
  //   0.40–0.75 → mild pattern (light notes only)
  //   < 0.40 → do not log friction (clean run)
  const rewriteCount = telemetry?.rewriteCount ?? 0;
  const questionCount = telemetry?.finalProblemCount ?? Math.max(1, gatekeeperResult.violations.length);
  const rewriteRatio = rewriteCount / Math.max(1, questionCount);
  const isSystemicFriction = rewriteRatio > 0.75 || rewriteCount > 10;
  const isMildPattern = !isSystemicFriction && rewriteRatio >= 0.40;
  const isHighRewrite = isSystemicFriction; // kept for existing switch-case consumers

  // Log telemetry summary if present
  if (telemetry) {
    const tier = isSystemicFriction ? "SYSTEMIC" : isMildPattern ? "MILD" : "ok";
    console.log(
      `[SCRIBE] Writer telemetry — rewrites: ${rewriteCount}, questions: ${questionCount}, ` +
      `ratio: ${rewriteRatio.toFixed(2)}, violations: ${telemetry.gatekeeperViolations ?? 0}. ` +
      `Friction tier: ${tier}`
    );
  }

  for (const v of gatekeeperResult.violations) {
    // 1. Append history (always)
    writerDossier.history.push({
      slotId: v.slotId,
      violations: [v.type],
      timestamp: now
    });

    // 2. Learn weaknesses (always, capped by S6 pruning below)
    if (!writerDossier.weaknesses.includes(v.type)) {
      writerDossier.weaknesses.push(v.type);
    }

    // 3. Auto-generate forbidden + required behaviors
    //    S2: Only add prescriptions when run was high-rewrite, or the violation
    //    type is so severe it warrants immediate correction regardless.
    const alwaysAct = ["mcq_options_invalid", "mcq_answer_mismatch", "forbidden_content"].includes(v.type);
    if (isHighRewrite || alwaysAct) {
      switch (v.type) {
        case "topic_mismatch":
          addForbidden("drifting off-topic");
          addRequired("explicitly reference the topic in the prompt");
          break;

        case "domain_mismatch":
          addForbidden("using content outside the subject domain");
          break;

        case "mcq_options_invalid":
          addForbidden("malformed MCQ option arrays");
          addRequired("produce exactly 4 options");
          break;

        case "mcq_answer_mismatch":
          addForbidden("answer not matching options");
          break;

        case "cognitive_demand_mismatch":
          addRequired("use Bloom-aligned verbs");
          break;

        case "difficulty_mismatch":
          addForbidden("producing questions above difficulty level");
          break;

        case "forbidden_content":
          addForbidden("including teacher-forbidden content");
          break;

        case "missing_misconception_alignment":
          addRequired("address required misconceptions explicitly");
          break;

        case "pacing_violation":
          addForbidden("writing overly long prompts");
          break;

        case "scope_width_violation":
          addForbidden("integrating too many strands for narrow scope");
          break;
      }
    }
  }

  // S1: Telemetry-driven prescriptions — tiered by severity
  if (isSystemicFriction) {
    addForbidden("using generic filler phrases like \"in general mathematics\" or \"from a general perspective\"");
    addRequired("use subject-specific language that references the lesson topic directly");
    addForbidden("producing semantically redundant questions");
    addRequired("vary question angles — each item should target a distinct concept or skill");
  } else if (isMildPattern) {
    // Mild friction: just remind about topic grounding, don't flood the dossier
    addRequired("ensure every prompt references at least one keyword from the lesson topic or unit name");
  }

  // S6: Prune to max N per category (keep most recent additions = end of array)
  if (writerDossier.weaknesses.length > MAX_PER_CATEGORY) {
    writerDossier.weaknesses = writerDossier.weaknesses.slice(-MAX_PER_CATEGORY);
  }
  if (writerDossier.forbiddenBehaviors.length > MAX_PER_CATEGORY) {
    writerDossier.forbiddenBehaviors = writerDossier.forbiddenBehaviors.slice(-MAX_PER_CATEGORY);
  }
  if (writerDossier.requiredBehaviors.length > MAX_PER_CATEGORY) {
    writerDossier.requiredBehaviors = writerDossier.requiredBehaviors.slice(-MAX_PER_CATEGORY);
  }
}
  static getWriterPrescriptions() {
    return {
      weaknesses: [...writerDossier.weaknesses],
      forbiddenBehaviors: [...writerDossier.forbiddenBehaviors],
      requiredBehaviors: [...writerDossier.requiredBehaviors]
    };
  }

  // -----------------------------------------------------
  // 3. BLOOM DRIFT RECONCILIATION
  // -----------------------------------------------------
  /**
   * Analyse per-slot Bloom alignment data from the Writer run and update
   * prescriptions when drift is systematic.
   *
   * Drift taxonomy:
   *   “over-bloom”  — generated questions consistently hit higher Bloom than intended
   *                    → Writer is inflating cognitive demand (e.g. writing analyse
   *                      questions for “remember” slots). Prescription: constrain verbs.
   *   “under-bloom” — generated questions consistently hit lower Bloom than intended
   *                    → Writer is under-delivering on rigor. Prescription: require
   *                      Bloom-aligned verbs + disallow shallow substitutes.
   *
   * Thresholds:
   *   mismatch rate > 0.5 → systemic drift → full prescription injection
   *   mismatch rate 0.25–0.5 → mild drift → soft reminder only
   *   < 0.25 → acceptable variance, no action
   *
   * @returns A summary string for logging (never throws).
   */
  /**
   * Compute a writer trust score (0–10) from the in-memory dossier.
   *
   * Scoring:
   *   Base: 7
   *   -1 per unique weakness category (max -4 deductions)
   *   Clamped to [0, 10]
   *
   * A neutral writer with no known weaknesses returns 7.
   * A writer with ≥4 documented weaknesses returns 3 (high scaffolding needed).
   */
  static getWriterTrustScore(): number {
    const deductions = Math.min(writerDossier.weaknesses.length, 4);
    return Math.max(0, Math.min(10, 7 - deductions));
  }

  static recalibrateFromBloomDrift(log: BloomAlignmentLog): string {
    if (!log || log.length === 0) return "[SCRIBE Bloom] No alignment data.";

    const total    = log.length;
    const misses   = log.filter(e => !e.aligned);
    const rate     = misses.length / total;

    // Count directional mismatches
    const under    = misses.filter(e => e.direction === "under").length;
    const over     = misses.filter(e => e.direction === "over").length;
    const dominant = under >= over ? "under" : "over";

    // Compute average Bloom gap (signed; negative = under-bloom)
    const avgGap = misses.reduce((sum, e) => {
      const intentIdx   = BLOOM_ORDER.indexOf(e.writerBloom);
      const detectedIdx = e.gatekeeperBloom ? BLOOM_ORDER.indexOf(e.gatekeeperBloom) : 0;
      return sum + (detectedIdx - intentIdx);
    }, 0) / Math.max(1, misses.length);

    const tier: "systemic" | "mild" | "ok" =
      rate > 0.5  ? "systemic" :
      rate > 0.25 ? "mild"     : "ok";

    console.info(
      `[SCRIBE Bloom] drift tier=${tier}, rate=${(rate * 100).toFixed(0)}%, ` +
      `under=${under}, over=${over}, avgGap=${avgGap.toFixed(2)}`
    );

    if (tier === "ok") return `[SCRIBE Bloom] Drift within tolerance (${(rate * 100).toFixed(0)}% mismatch).`;

    if (dominant === "under") {
      // Writer is producing shallower questions than intended
      if (tier === "systemic") {
        addRequired("use explicit Bloom-aligned action verbs matching the slot's cognitiveDemand");
        addRequired("escalate question complexity — avoid recall-only phrasing on apply/analyze/evaluate slots");
        addForbidden("substituting 'what is' or 'which' for slots labelled analyze, evaluate, or apply");
        addForbidden("producing questions answerable by bare recall when the slot demands application or higher");
        writerDossier.weaknesses.push("systematic under-bloom: question depth consistently below intended level");
      } else {
        addRequired("check that every question prompt contains at least one verb from its assigned Bloom level");
      }
    } else {
      // Writer is producing deeper questions than intended (less common but happens with honors prompts)
      if (tier === "systemic") {
        addRequired("match question complexity EXACTLY to the slot cognitiveDemand — do not over-engineer remember or understand slots");
        addForbidden("using analyze/evaluate verbs for remember or understand slots");
        writerDossier.weaknesses.push("systematic over-bloom: question depth consistently above intended level");
      } else {
        addRequired("keep question stems at the specified Bloom level — avoid raising complexity beyond the slot label");
      }
    }

    // Prune after update
    const MAX = 5;
    if (writerDossier.weaknesses.length       > MAX) writerDossier.weaknesses       = writerDossier.weaknesses.slice(-MAX);
    if (writerDossier.requiredBehaviors.length > MAX) writerDossier.requiredBehaviors = writerDossier.requiredBehaviors.slice(-MAX);
    if (writerDossier.forbiddenBehaviors.length > MAX) writerDossier.forbiddenBehaviors = writerDossier.forbiddenBehaviors.slice(-MAX);

    return `[SCRIBE Bloom] ${tier} ${dominant}-bloom drift (${(rate * 100).toFixed(0)}% mismatch). Prescriptions updated.`;
  }

  
  static async updateAgentDossier({
    userId,
    agentType,
    gatekeeperReport,
    finalAssessment,
    blueprint,
    uar
  }: {
    userId: string;
    agentType: string;
    gatekeeperReport: GatekeeperReport;
    /** Slim telemetry — only what SCRIBE reads. Extracted via finalAssessmentForScribe(). */
    finalAssessment: { questionCount: number; questionTypes: string[] };
    blueprint: any;
    /** Slim object from uarForScribe() — not the full UnifiedAssessmentRequest. */
    uar: any;
  }) {

    // 2a-pre. Guarantee the teacher row exists before any FK-dependent inserts.
    // This is the safety net for sessions where ensureTeacherRow() at login
    // was skipped (e.g. existing users, server-side calls, test harnesses).
    {
      const { error: teacherUpsertError } = await supabase
        .from("teachers")
        .upsert({ id: userId }, { onConflict: "id" });
      if (teacherUpsertError) {
        console.warn("[SCRIBE] teachers upsert failed (non-fatal):", teacherUpsertError.message);
      }
    }

    // 2a. Update agent dossier — single row per user, no instanceId needed
    const dossierResult = await DossierManager.updateAfterRun({
      userId,
      agentType,
      gatekeeperReport,
      questionCount: finalAssessment.questionCount,
    });

    // 2b. Insert assessment record into Supabase
    // Non-fatal — log the error but never throw, so a schema mismatch
    // doesn't kill the pipeline and swallow the user's result.
    const { error: insertError } = await supabase.from("teacher_assessment_history").insert({
      teacher_id: userId,
      domain: uar?.course ?? null,
      grade: Array.isArray(uar?.gradeLevels)
        ? uar.gradeLevels.join(", ")
        : (uar?.grade ?? null),
      assessment_type: uar?.assessmentType ?? null,
      question_count: finalAssessment.questionCount,
      question_types: finalAssessment.questionTypes.join(", ") || null,
      difficulty_profile: blueprint?.plan?.difficultyProfile ?? null,
      guardrails: uar?.guardrails ?? null,
    });
    if (insertError) {
      console.warn("[SCRIBE] teacher_assessment_history insert failed (non-fatal):", insertError.message);
    }

    // 3. Load full history for this teacher to compute defaults
    const { data: history } = await supabase
      .from("teacher_assessment_history")
      .select("*")
      .eq("teacher_id", userId);

    // 4. Compute new predictive defaults based on history
    const defaults = computeDefaults(history ?? []);

    // 5. Upsert predictive defaults for this teacher
    const { error: upsertError } = await supabase.from("teacher_defaults").upsert(
      {
        teacher_id: userId,
        ...defaults,
        sample_size: (history ?? []).length,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "teacher_id" }
    );
    if (upsertError) {
      console.warn("[SCRIBE] teacher_defaults upsert failed (non-fatal):", upsertError.message);
    }

    return { dossierResult, defaults };
  }

  // -----------------------------------------------------
  // 3. UPDATE USER DOSSIER (pipeline run history)
  // -----------------------------------------------------
  static async updateUserDossier({
    userId,
    trace,
    finalAssessment
  }: {
    userId: string;
    trace: any;
    finalAssessment: any;
  }) {
    return await DossierManager.recordPipelineRun({
      userId,
      trace,
      finalAssessment
    });
  }

  // -----------------------------------------------------
  // 4. FINALIZE PIPELINE
  // -----------------------------------------------------
  static async finalize({
    userId,
    agentRuns,
    trace,
    finalAssessment,
    blueprint,
    uar
  }: {
    userId: string;
    agentRuns: Array<{
      agentType: string;
      gatekeeperReport: GatekeeperReport;
    }>;
    trace: any;
    finalAssessment: any;
    blueprint: any;
    uar: UnifiedAssessmentRequest;
  }) {
    // 1. Update agent dossiers
    for (const run of agentRuns) {
      await this.updateAgentDossier({
        userId,
        agentType: run.agentType,
        gatekeeperReport: run.gatekeeperReport,
        finalAssessment,
        blueprint,
        uar
      });
    }

    // 2. Update user dossier (pipeline run history)
    await this.updateUserDossier({
      userId,
      trace,
      finalAssessment
    });

    // 3. Return final trace
    return {
      status: "ok",
      trace,
      finalAssessment
    };
  }
}
