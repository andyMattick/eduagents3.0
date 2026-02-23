// system/dossier/DossierManager.ts
import type { GatekeeperReport } from "@/pipeline/agents/gatekeeper/GatekeeperReport";
import type { Violation } from "@/pipeline/agents/gatekeeper/ViolationCatalog";
import type { WriterDossier } from "./types/WriterDossier";
import type { ArchitectDossier } from "./types/ArchitectDossier";
import type { AstronomerDossier } from "./types/AstronomerDossier";
import { supabase } from "../../supabase/client";

type _AnyDossier =
  | WriterDossier
  | ArchitectDossier
  | AstronomerDossier;

export class DossierManager {
  // -----------------------------
  // LOAD
  // -----------------------------
  static async load(userId: string, agentType: string) {
    const { data, error } = await supabase
      .from("system_agent_dossiers")
      .select("*")
      .eq("user_id", userId)
      .eq("agent_type", agentType);

    if (error) throw error;
    return data ?? [];
  }

  // -----------------------------
  // BASELINE
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
      .from("system_agent_dossiers")
      .insert({
        user_id: userId,
        agent_type: agentType,
        instance_id: instanceId,
        dossier: baseline,
        version: 1
      });

    if (error) throw error;

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
    // Load existing dossier
    const dossiers = await this.load(userId, agentType);
    const entry = dossiers.find(d => d.instance_id === instanceId);

    if (!entry) throw new Error("Dossier not found for update.");

    const dossier = entry.dossier;

    // Ensure weaknesses exists
    dossier.weaknesses ??= {};

    // Update weaknesses based on Gatekeeper
    const violations: Violation[] = gatekeeperReport.violations ?? [];
    for (const v of violations) {
      dossier.weaknesses[v.type] = (dossier.weaknesses[v.type] ?? 0) + 1;
    }

    // Update trust/stability
    dossier.trustScore = Math.max(0, dossier.trustScore - violations.length);
    dossier.stabilityScore = Math.max(0, dossier.stabilityScore - (finalAssessment?.rewriteCount ?? 0));

    // Save updated dossier
    const { error } = await supabase
      .from("system_agent_dossiers")
      .update({
        dossier,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("agent_type", agentType)
      .eq("instance_id", instanceId);

    if (error) throw error;

    return dossier;
  }
}
