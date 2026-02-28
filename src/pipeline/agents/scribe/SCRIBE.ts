// src/pipeline/agents/scribe/SCRIBE.ts

import { supabase } from "@/supabase/client";
import { DossierManager } from "@/system/dossier/DossierManager";
import type { GatekeeperReport } from "@/pipeline/agents/gatekeeper/GatekeeperReport";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";
import {
  GuardrailRule,
  mergeGuardrails,
  decayGuardrails,
  getInjectableGuardrails
} from "./GuardrailEngine";

export class SCRIBE {

  // =====================================================
  // PUBLIC API
  // =====================================================

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

    const domain = (uar?.course ?? "general").toLowerCase();

    for (const run of agentRuns) {
      await this.updateAgent({
        userId,
        agentType: run.agentType,
        gatekeeperReport: run.gatekeeperReport,
        finalAssessment,
        blueprint,
        uar,
        domain
      });
    }

    await DossierManager.recordPipelineRun({
      userId,
      trace,
      finalAssessment
    });

    return {
      status: "ok",
      trace,
      finalAssessment
    };
  }

  static async getActiveGuardrails(
    userId: string,
    agentType: string,
    domain: string
  ) {
    const { data } = await supabase
      .from("teacher_guardrails")
      .select("guardrails")
      .eq("teacher_id", userId)
      .eq("agent_type", agentType)
      .eq("domain", domain)
      .maybeSingle();

    if (!data?.guardrails) return [];

    return getInjectableGuardrails(data.guardrails);
  }

  /**
   * Compute a baseline Writer trust score (used by hint budget algorithm).
   * Base: 7/10. Could be enhanced to read from dossier if needed.
   */
  static getWriterTrustScore(): number {
    // TODO: read from teacher dossier if available; for now return baseline
    return 7;
  }

  // =====================================================
  // CORE UPDATE PIPELINE
  // =====================================================

  private static async updateAgent({
    userId,
    agentType,
    gatekeeperReport,
    finalAssessment,
    blueprint,
    uar,
    domain
  }: {
    userId: string;
    agentType: string;
    gatekeeperReport: GatekeeperReport;
    finalAssessment: { questionCount: number; questionTypes: string[] };
    blueprint: any;
    uar: any;
    domain: string;
  }) {

    await this.ensureTeacherRow(userId);

    const dossier = await DossierManager.updateAfterRun({
      userId,
      agentType,
      gatekeeperReport,
      questionCount: finalAssessment.questionCount
    });

    await this.insertAssessmentHistory({
      userId,
      finalAssessment,
      blueprint,
      uar,
      domain
    });

    await this.updateGuardrails({
      userId,
      agentType,
      gatekeeperReport,
      domain,
      trustScore: dossier.trustScore ?? 7,
      stabilityScore: dossier.stabilityScore ?? 6
    });
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private static async ensureTeacherRow(userId: string) {
    await supabase
      .from("teachers")
      .upsert({ id: userId }, { onConflict: "id" });
  }

  private static async insertAssessmentHistory({
    userId,
    finalAssessment,
    blueprint,
    uar,
    domain
  }: any) {

    await supabase
      .from("teacher_assessment_history")
      .insert({
        teacher_id: userId,
        domain,
        grade: Array.isArray(uar?.gradeLevels)
          ? uar.gradeLevels.join(", ")
          : (uar?.grade ?? null),
        assessment_type: uar?.assessmentType ?? null,
        question_count: finalAssessment.questionCount,
        question_types: finalAssessment.questionTypes.join(", ") || null,
        difficulty_profile: blueprint?.plan?.difficultyProfile ?? null
      });
  }

  private static async updateGuardrails({
    userId,
    agentType,
    gatekeeperReport,
    domain,
    trustScore,
    stabilityScore
  }: {
    userId: string;
    agentType: string;
    gatekeeperReport: GatekeeperReport;
    domain: string;
    trustScore: number;
    stabilityScore: number;
  }) {

    const newRules = this.buildRules(gatekeeperReport, domain);

    const { data: row } = await supabase
      .from("teacher_guardrails")
      .select("*")
      .eq("teacher_id", userId)
      .eq("agent_type", agentType)
      .eq("domain", domain)
      .maybeSingle();

    if (!row) {
      await supabase.from("teacher_guardrails").insert({
        teacher_id: userId,
        agent_type: agentType,
        domain,
        run_count: 1,
        version: 1,
        guardrails: newRules
      });
      return;
    }

    const currentVersion = row.version;
    const nextRun = row.run_count + 1;

    let merged = mergeGuardrails(
      row.guardrails ?? [],
      newRules,
      nextRun
    );

    merged = decayGuardrails(
      merged,
      nextRun,
      trustScore,
      stabilityScore
    );

    const { data: updateData } = await supabase
      .from("teacher_guardrails")
      .update({
        guardrails: merged,
        run_count: nextRun,
        version: currentVersion + 1
      })
      .eq("teacher_id", userId)
      .eq("agent_type", agentType)
      .eq("domain", domain)
      .eq("version", currentVersion)
      .select();

    if (!updateData || updateData.length === 0) {
      await this.retryGuardrailUpdate({
        userId,
        agentType,
        domain,
        newRules,
        trustScore,
        stabilityScore
      });
    }
  }

  private static async retryGuardrailUpdate({
    userId,
    agentType,
    domain,
    newRules,
    trustScore,
    stabilityScore
  }: any) {

    const { data: fresh } = await supabase
      .from("teacher_guardrails")
      .select("*")
      .eq("teacher_id", userId)
      .eq("agent_type", agentType)
      .eq("domain", domain)
      .maybeSingle();

    if (!fresh) return;

    const nextRun = fresh.run_count + 1;

    const reMerged = decayGuardrails(
      mergeGuardrails(fresh.guardrails ?? [], newRules, nextRun),
      nextRun,
      trustScore,
      stabilityScore
    );

    await supabase
      .from("teacher_guardrails")
      .update({
        guardrails: reMerged,
        run_count: nextRun,
        version: fresh.version + 1
      })
      .eq("teacher_id", userId)
      .eq("agent_type", agentType)
      .eq("domain", domain)
      .eq("version", fresh.version);
  }

  private static buildRules(
    gatekeeperReport: GatekeeperReport,
    domain: string
  ): GuardrailRule[] {

    if (!gatekeeperReport?.violations?.length) return [];

    return gatekeeperReport.violations.map(v => ({
      id: crypto.randomUUID(),
      category: v.type ?? "general",
      polarity: "require",
      message: v.message,
      domain,
      createdAtRun: 0,
      lastTriggeredRun: 0,
      triggerCount: 0,
      weight: 0.5
    }));
  }
}