// src/pipeline/agents/scribe/SCRIBE.ts
import { AgentSelector } from "./AgentSelector";
import { CompensationEngine } from "./CompensationEngine";
import { DossierManager } from "@/system/dossier/DossierManager";
import { UserDossierManager } from "@/system/dossier/UserDossierManager";
import type { GatekeeperReport } from "@/pipeline/agents/gatekeeper/GatekeeperReport";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";
import { supabase } from "@/supabase/client";

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

export class SCRIBE {
  // -----------------------------------------------------
  // 1. PRE-RUN AGENT SELECTION
  // -----------------------------------------------------
  static async selectAgents(uar: any) {
    const userId = uar.userId;
    const domain = uar.domain;

    const writer = await AgentSelector.selectAgent(userId, `writer:${domain}`);
    const architect = await AgentSelector.selectAgent(userId, `architect:${domain}`);
    const astronomer = await AgentSelector.selectAgent(userId, `astronomer:${domain}`);

    const compensationProfile = CompensationEngine.generateCompensation(
      writer.dossier,
      { domain }
    );

    return {
      writerInstanceId: writer.instanceId,
      architectInstanceId: architect.instanceId,
      astronomerInstanceId: astronomer.instanceId,
      compensationProfile
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

  // S2: Only generate new prescriptions when the run was actually troubled.
  const rewriteCount = telemetry?.rewriteCount ?? 0;
  const questionCount = telemetry?.finalProblemCount ?? Math.max(1, gatekeeperResult.violations.length);
  const rewriteRatio = rewriteCount / Math.max(1, questionCount);
  const isHighRewrite = rewriteCount > 10 || rewriteRatio > 0.5;

  // Log telemetry summary if present
  if (telemetry) {
    console.log(
      `[SCRIBE] Writer telemetry — rewrites: ${rewriteCount}, questions: ${questionCount}, ` +
      `ratio: ${rewriteRatio.toFixed(2)}, violations: ${telemetry.gatekeeperViolations ?? 0}. ` +
      `High-rewrite threshold: ${isHighRewrite ? "TRIGGERED" : "ok"}`
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

  // S1: Telemetry-driven prescriptions for high-rewrite runs
  if (isHighRewrite && rewriteCount > 0) {
    addForbidden("using generic filler phrases like \"in general mathematics\" or \"from a general perspective\"");
    addRequired("use subject-specific language that references the lesson topic directly");
    if (rewriteRatio > 1.5) {
      addForbidden("producing semantically redundant questions");
      addRequired("vary question angles — each item should target a distinct concept or skill");
    }
  }

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

  
  static async updateAgentDossier({
    userId,
    agentType,
    instanceId,
    gatekeeperReport,
    finalAssessment,
    blueprint,
    uar
    
  }: {
    userId: string;
    agentType: string;
    instanceId: string;
    gatekeeperReport: GatekeeperReport;
    finalAssessment: any;
    blueprint: any;
    uar: UnifiedAssessmentRequest;
  }) {

    // 2a. Update agent dossier in memory
    const dossierResult = await DossierManager.updateAfterRun({
      userId,
      agentType,
      instanceId,
      gatekeeperReport,
      finalAssessment
    });

    // 2b. Insert assessment record into Supabase
    await supabase.from("teacher_assessment_history").insert({
      teacher_id: userId,
      domain: uar?.course ?? null, // FIXED
      grade: uar?.gradeLevels?.join(", ") ?? null,
      assessment_type: uar?.assessmentType ?? null,
      question_count: finalAssessment.items?.length ?? 0,
      question_types: finalAssessment.items?.map((item: any) => item.questionType).join(", ") ?? null,

      // SAFE JSON INSERTS
      cognitive_distribution: blueprint?.plan?.cognitiveDistribution ?? null,
      difficulty_profile: blueprint?.plan?.difficultyProfile ?? null,

      ordering_strategy: blueprint?.plan?.orderingStrategy ?? null,
      pacing_seconds_per_item: blueprint?.plan?.pacingSecondsPerItem ?? null,

      guardrails: (uar as any).guardrails ?? null,
    });


    // 3. Load full history for this teacher to compute defaults
    const { data: history } = await supabase
      .from("teacher_assessment_history")
      .select("*")
      .eq("teacher_id", userId);

    // 4. Compute new predictive defaults based on history
    const defaults = computeDefaults(history ?? []);

    // 5. Upsert predictive defaults for this teacher
    await supabase.from("teacher_defaults").upsert(
      {
        teacher_id: userId,
        ...defaults,
        sample_size: (history ?? []).length,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "teacher_id" }
    );

    return { dossierResult, defaults };
  }

  // -----------------------------------------------------
  // 3. UPDATE USER DOSSIER
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
    return await UserDossierManager.recordPipelineRun({
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
      instanceId: string;
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
        instanceId: run.instanceId,
        gatekeeperReport: run.gatekeeperReport,
        finalAssessment,
        blueprint,
        uar
      });
    }

    // 2. Update user dossier
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
