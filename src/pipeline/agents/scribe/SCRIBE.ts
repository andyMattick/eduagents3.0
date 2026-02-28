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
  // IN-MEMORY RUN STATE  (reset each pipeline run)
  // =====================================================

  /** Prescription interface mirrored here to avoid circular writer ↔ scribe import. */
  private static _prescriptions: {
    weaknesses: string[];
    requiredBehaviors: string[];
    forbiddenBehaviors: string[];
  } = { weaknesses: [], requiredBehaviors: [], forbiddenBehaviors: [] };

  private static _currentDomain: string = "General";

  // =====================================================
  // PIPELINE-FACING METHODS (called by runPipeline.ts)
  // =====================================================

  /**
   * Selects the best agent configuration for this run.
   * Loads the teacher's dossier to derive a compensation profile.
   * Returns { domain, compensationProfile, tier }.
   */
  static async selectAgents(uar: any) {
    try {
      // Derive domain from course (last meaningful word, e.g. "Algebra 2" → "Algebra 2")
      const domain = (uar?.course ?? "General").trim() || "General";
      SCRIBE._currentDomain = domain;

      const userId = uar?.userId ?? "";
      const agentType = `writer:${domain}`;

      // Reset prescriptions for this run
      SCRIBE._prescriptions = { weaknesses: [], requiredBehaviors: [], forbiddenBehaviors: [] };

      if (userId) {
        const dossier = await DossierManager.loadAgentDossier(userId, agentType);
        const weaknesses = Object.keys(dossier.weaknesses ?? {})
          .sort((a, b) => (dossier.weaknesses[b] ?? 0) - (dossier.weaknesses[a] ?? 0))
          .slice(0, 5);

        SCRIBE._prescriptions = {
          weaknesses,
          requiredBehaviors: weaknesses.length
            ? weaknesses.map(w => `Address weakness: ${w}`)
            : [],
          forbiddenBehaviors: [],
        };

        return {
          domain,
          compensationProfile: dossier.compensationProfile ?? {},
          tier: uar?.subscriptionTier ?? "free",
        };
      }

      return { domain, compensationProfile: {}, tier: uar?.subscriptionTier ?? "free" };
    } catch (err: any) {
      console.warn("[SCRIBE.selectAgents] non-fatal:", err?.message);
      return { domain: SCRIBE._currentDomain, compensationProfile: {}, tier: "free" };
    }
  }

  /**
   * Returns the current run's writer prescriptions (populated by selectAgents).
   * Called by runPipeline before dispatching the Writer.
   */
  static getWriterPrescriptions(): {
    weaknesses: string[];
    requiredBehaviors: string[];
    forbiddenBehaviors: string[];
  } {
    return SCRIBE._prescriptions;
  }

  /**
   * Updates in-memory prescriptions from Gatekeeper violations
   * so the next retry/rewrite call benefits from the findings.
   * Non-mutating to dossier — persisted at end of run via updateAgentDossier.
   */
  static updateWriterDossier(gk: any, _telemetry?: any): void {
    const violations: any[] = gk?.violations ?? [];
    if (violations.length === 0) return;

    const newForbidden = violations
      .filter((v: any) => v.type === "bloom_mismatch" || v.type === "distractor_weak" || v.type === "format")
      .map((v: any) => v.message as string)
      .filter(Boolean);

    SCRIBE._prescriptions = {
      ...SCRIBE._prescriptions,
      forbiddenBehaviors: [
        ...new Set([...SCRIBE._prescriptions.forbiddenBehaviors, ...newForbidden]),
      ].slice(0, 6),
    };
  }

  /**
   * Analyses Bloom alignment drift from the last Writer run.
   * If drift > 30%, adds corrective prescriptions for the next run.
   * Returns a human-readable summary for logging.
   */
  static recalibrateFromBloomDrift(bloomLog: any[]): string {
    if (!bloomLog?.length) {
      return "[SCRIBE] No Bloom alignment data — prescriptions unchanged.";
    }

    const misaligned = bloomLog.filter((e: any) => !e.aligned);
    const driftRate = misaligned.length / bloomLog.length;

    if (driftRate > 0.3) {
      const driftedLevels = [...new Set(misaligned.map((e: any) => e.requested as string))];
      SCRIBE._prescriptions = {
        ...SCRIBE._prescriptions,
        requiredBehaviors: [
          ...SCRIBE._prescriptions.requiredBehaviors,
          `Bloom drift corrective: prioritise ${driftedLevels.join(", ")} questions`,
        ].slice(0, 6),
      };
      return `[SCRIBE] Bloom drift ${Math.round(driftRate * 100)}% — prescriptions updated for levels: ${driftedLevels.join(", ")}.`;
    }

    return `[SCRIBE] Bloom alignment healthy (drift: ${Math.round(driftRate * 100)}%).`;
  }

  /**
   * Public wrapper called by runPipeline after Builder completes.
   * Persists per-(user, agentType, domain) governance metrics to Supabase.
   * Non-fatal — a DB error never crashes the pipeline.
   */
  static async updateAgentDossier({
    userId,
    agentType,
    gatekeeperReport,
    finalAssessment,
    blueprint,
    uar,
  }: {
    userId: string;
    agentType: string;
    gatekeeperReport: any;
    finalAssessment: { questionCount: number; questionTypes: string[] };
    blueprint: any;
    uar: any;
  }): Promise<{ status: string }> {
    try {
      const domain = agentType.includes(":") ? agentType.split(":")[1] : "General";
      await this.updateAgent({ userId, agentType, gatekeeperReport, finalAssessment, blueprint, uar, domain });
      return { status: "ok" };
    } catch (err: any) {
      console.warn("[SCRIBE.updateAgentDossier] non-fatal:", err?.message);
      return { status: "error" };
    }
  }

  /**
   * Persists the full assessment + trace to the user's dossier writer_history.
   * Non-fatal — a DB error never crashes the pipeline.
   */
  static async updateUserDossier({
    userId,
    trace,
    finalAssessment,
  }: {
    userId: string;
    trace: any;
    finalAssessment: any;
  }): Promise<{ status: string }> {
    try {
      await DossierManager.recordPipelineRun({ userId, trace, finalAssessment });
      return { status: "ok" };
    } catch (err: any) {
      console.warn("[SCRIBE.updateUserDossier] non-fatal:", err?.message);
      return { status: "error" };
    }
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