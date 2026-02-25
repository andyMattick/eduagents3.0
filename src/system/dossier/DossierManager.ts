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

    // Update trust/stability
    dossier.trustScore = Math.max(0, dossier.trustScore - violations.length);
    dossier.stabilityScore = Math.max(
      0,
      dossier.stabilityScore - (finalAssessment?.rewriteCount ?? 0)
    );

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
