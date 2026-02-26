// system/dossier/DossierManager.ts
import type { GatekeeperReport } from "@/pipeline/agents/gatekeeper/GatekeeperReport";
import type { Violation } from "@/pipeline/agents/gatekeeper/ViolationCatalog";
import { supabase } from "../../supabase/client";



export class DossierManager {
  static table = "system_agent_dossiers";

  // -----------------------------
  // LOAD
  // -----------------------------
  static async load(userId: string, agentType: string) {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("user_id", userId)
      .eq("agent_type", agentType);

    if (error) {
      console.error("[DossierManager] Load error:", error);
      throw error;
    }

    return data ?? [];
  }

  // -----------------------------
  // CREATE BASELINE
  // -----------------------------
  static async createBaseline(userId: string, agentType: string) {
    const baseline = {
      trustScore: 5,
      stabilityScore: 5,
      weaknesses: {},
      strengths: {},
      domainMastery: {},
      compensationProfile: {},
      version: 1,
      updatedAt: new Date().toISOString()
    };

    const instanceId = crypto.randomUUID();

    const { error } = await supabase
      .from(this.table)
      .insert({
        user_id: userId,
        agent_type: agentType,
        instance_id: instanceId,
        dossier: baseline,
        version: 1
      });

    if (error) {
      console.error("[DossierManager] Baseline create error:", error);
      throw error;
    }

    return {
      instanceId,
      dossier: baseline,
      version: 1
    };
  }

  // -----------------------------
  // UPDATE AFTER RUN
  // -----------------------------
  static async updateAfterRun({
    userId,
    agentType,
    instanceId,
    gatekeeperReport,
    finalAssessment
  }: {
    userId: string;
    agentType: string;
    instanceId: string;
    gatekeeperReport: GatekeeperReport;
    finalAssessment: any;
  }) {
    // Load existing dossier(s)
    let dossiers = await this.load(userId, agentType);

    // Auto-create if missing
    if (!dossiers || dossiers.length === 0) {
      const created = await this.createBaseline(userId, agentType);
      dossiers = [
        {
          instance_id: created.instanceId,
          dossier: created.dossier,
          version: created.version
        }
      ];
    }

    // Find the correct instance
    let entry = dossiers.find((d: any) => d.instance_id === instanceId);

    // If instanceId doesn't exist, create a new one
    if (!entry) {
      const created = await this.createBaseline(userId, agentType);
      entry = {
        instance_id: created.instanceId,
        dossier: created.dossier,
        version: created.version
      };
    }

    const dossier = entry.dossier;

    // Ensure weaknesses exists
    dossier.weaknesses ??= {};

    // Update weaknesses based on Gatekeeper
    const violations: Violation[] = gatekeeperReport?.violations ?? [];
    for (const v of violations) {
      dossier.weaknesses[v.type] = (dossier.weaknesses[v.type] ?? 0) + 1;
    }

    // ── Success + failure tracking ──────────────────────────────────────────
    // Previously only decremented on failures. Now clean runs earn increases
    // and domain performance is recorded (strengths + domainMastery).

    const rewriteCount = finalAssessment?.rewriteCount ?? 0;
    const questionCount = finalAssessment?.items?.length ?? 0;
    const isCleanRun = violations.length === 0;
    const isLowFriction = violations.length <= 2 && rewriteCount <= 3;
    const domain = finalAssessment?.domain ?? agentType.split(":")[1] ?? "unknown";

    // Trust: subtract 1 per violation, add 1 for clean run (clamp 0–10)
    if (isCleanRun) {
      dossier.trustScore = Math.min(10, (dossier.trustScore ?? 5) + 1);
    } else {
      dossier.trustScore = Math.max(0, (dossier.trustScore ?? 5) - violations.length);
    }

    // Stability: subtract proportional to rewrite ratio, add 1 for low-friction (clamp 0–10)
    if (isLowFriction) {
      dossier.stabilityScore = Math.min(10, (dossier.stabilityScore ?? 5) + 1);
    } else {
      const penalty = Math.ceil(rewriteCount / Math.max(1, questionCount));
      dossier.stabilityScore = Math.max(0, (dossier.stabilityScore ?? 5) - penalty);
    }

    // Strengths: record successful domains (clean or low-friction)
    dossier.strengths ??= {};
    if (isLowFriction && domain !== "unknown") {
      dossier.strengths[domain] = (dossier.strengths[domain] ?? 0) + 1;
    }

    // Domain mastery: track run count + success rate per domain
    dossier.domainMastery ??= {};
    if (domain !== "unknown") {
      const dm = dossier.domainMastery[domain] ?? { runs: 0, cleanRuns: 0 };
      dm.runs += 1;
      if (isCleanRun) dm.cleanRuns += 1;
      dossier.domainMastery[domain] = dm;
    }

    // Save updated dossier
    const { error } = await supabase
      .from(this.table)
      .update({
        dossier,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("agent_type", agentType)
      .eq("instance_id", entry.instance_id);

    if (error) {
      console.error("[DossierManager] Update error:", error);
      throw error;
    }

    return dossier;
  }
}
