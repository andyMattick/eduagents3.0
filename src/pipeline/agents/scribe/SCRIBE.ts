// src/pipeline/agents/scribe/SCRIBE.ts
import { AgentSelector } from "./AgentSelector";
import { CompensationEngine } from "./CompensationEngine";
import { DossierManager } from "@/system/dossier/DossierManager";
import { UserDossierManager } from "@/system/dossier/UserDossierManager";
import type { GatekeeperReport } from "@/pipeline/agents/gatekeeper/GatekeeperReport";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";
import { supabase } from "@/supabase/client";

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
      domain: blueprint?.plan?.domain ?? null,
      grade: uar?.gradeLevels?.join(", ") ?? null,
      assessment_type: uar?.assessmentType ?? null,
      question_count: finalAssessment.items?.length ?? 0,
      question_types: finalAssessment.items?.map((item: any) => item.questionType).join(", ") ?? null,
      cognitive_distribution: blueprint?.plan?.cognitiveDistribution
        ? JSON.stringify(blueprint.plan.cognitiveDistribution)
        : null,
      difficulty_profile: blueprint?.plan?.difficultyProfile
        ? (typeof blueprint.plan.difficultyProfile === "object"
            ? JSON.stringify(blueprint.plan.difficultyProfile)
            : blueprint.plan.difficultyProfile)
        : null,
      ordering_strategy: blueprint?.plan?.orderingStrategy ?? null,
      pacing_seconds_per_item: blueprint?.plan?.pacingSecondsPerItem ?? null,
      guardrails: (uar as any).guardrails
        ? JSON.stringify((uar as any).guardrails)
        : null,
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
