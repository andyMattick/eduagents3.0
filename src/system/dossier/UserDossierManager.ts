// src/system/dossier/UserDossierManager.ts
import { supabase } from "@/supabase/client";

export class UserDossierManager {
  static table = "dossiers";

  // -----------------------------
  // LOAD USER DOSSIER
  // -----------------------------
  static async load(userId: string) {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[UserDossierManager] Load error:", error);
      throw error;
    }

    return data ?? null;
  }

  // -----------------------------
  // CREATE BASELINE USER DOSSIER
  // -----------------------------
  static async createBaseline(userId: string) {
    const baseline = {
      user_id: userId,
      writer_history: [],
      architect_history: [],
      astronomer_history: [],
      philosopher_history: [],
    };

    const { data, error } = await supabase
      .from(this.table)
      .insert(baseline)
      .select()
      .single();

    if (error) {
      console.error("[UserDossierManager] Baseline create error:", error);
      throw error;
    }

    return data;
  }

  // -----------------------------
  // APPEND HISTORY ENTRY
  // -----------------------------
  static async appendHistory(userId: string, agentType: string, entry: any) {
    let dossier = await this.load(userId);

    // Auto-create if missing
    if (!dossier) {
      dossier = await this.createBaseline(userId);
    }

    const field = `${agentType}_history`;

    if (!dossier[field]) {
      dossier[field] = [];
    }

    const updatedHistory = [...dossier[field], entry];

    const { error } = await supabase
      .from(this.table)
      .update({
        [field]: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[UserDossierManager] Update error:", error);
      throw error;
    }

    return updatedHistory;
  }

  // -----------------------------
  // RECORD A PIPELINE RUN
  // -----------------------------
  static async recordPipelineRun({
    userId,
    trace,
    finalAssessment,
  }: {
    userId: string;
    trace: any;
    finalAssessment: any;
  }) {
    const entry = {
      timestamp: new Date().toISOString(),
      trace,
      finalAssessment,
    };

    // Store under writer_history for now (or create a new field later)
    return await this.appendHistory(userId, "writer", entry);
  }
}
