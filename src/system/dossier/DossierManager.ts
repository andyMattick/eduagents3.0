// system/dossier/DossierManager.ts
//
// Unified manager for the single `dossiers` table.
// One row per user.  Each agent type has two JSONB columns:
//   - {agent}_dossier  → per-domain governance metrics (trust, stability, …)
//                        Structure: Record<domain, AgentDossierData>
//                        e.g. { "Math": { trustScore: 7, … }, "English": { trustScore: 5, … } }
//   - {agent}_history  → append-only pipeline run traces
//
// SCRIBE pulls the domain-specific dossier so each subject gets its own
// agent team with independent trust/weakness tracking.
// ───────────────────────────────────────────────────────────────────
import type { GatekeeperReport } from "@/pipeline/agents/gatekeeper/GatekeeperReport";
import type { Violation } from "@/pipeline/agents/gatekeeper/ViolationCatalog";
import { supabase } from "../../supabase/client";

/** Canonical agent type keys (prefix before the colon in "writer:Math"). */
type AgentKey = "writer" | "architect" | "astronomer";

/** Shape stored per domain inside the *_dossier JSONB column. */
export interface AgentDossierData {
  // ── Core governance (0–10 scale, used by hint budget algo) ────────────────
  trustScore: number;
  stabilityScore: number;
  weaknesses: Record<string, number>;
  strengths: Record<string, number>;
  domainMastery: { runs: number; cleanRuns: number };
  compensationProfile: Record<string, string>;
  version: number;
  updatedAt: string;

  // ── Extended health record (0–100 scale, set by updateWriterAgentDossier) ─
  alignmentScore?: number;
  trustScore100?: number;
  stabilityScore100?: number;

  topicMastery?: Record<string, number>;   // per-topic mastery 0–100

  weaknessCategories?: {
    spacing: number;
    notation: number;
    drift: number;
    hallucination: number;
    difficultyMismatch: number;
    structureViolations: number;
  };

  extendedCompensationProfile?: {
    spacingFixes: number;
    notationFixes: number;
    rewriteBias: number;
    difficultyBias: number;
    operationBias: number;
  };

  rewriteHistory?: {
    totalRewrites: number;
    last10: number[];
  };

  passFailByDomain?: Record<string, { passes: number; fails: number }>;

  errorPatterns?: {
    spacingMerges: number;
    latexBreaks: number;
    operatorConfusion: number;
    wordiness: number;
    arithmeticParaphrasing: number;
  };
}

/**
 * The full shape stored in a *_dossier column.
 * Keyed by domain (e.g. "Math", "English").
 */
export type AgentDossierMap = Record<string, AgentDossierData>;

function baselineDossier(): AgentDossierData {
  return {
    trustScore: 5,
    stabilityScore: 5,
    weaknesses: {},
    strengths: {},
    domainMastery: { runs: 0, cleanRuns: 0 },
    compensationProfile: {},
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

/** Derive the column prefix ("writer" | "architect" | "astronomer") from "writer:Math". */
function agentKey(agentType: string): AgentKey {
  const prefix = agentType.split(":")[0] as AgentKey;
  if (!["writer", "architect", "astronomer"].includes(prefix)) {
    console.warn(`[DossierManager] Unknown agent prefix "${prefix}", falling back to "writer".`);
    return "writer";
  }
  return prefix;
}

/** Extract the domain from "writer:Math" → "Math".  Falls back to "General". */
function agentDomain(agentType: string): string {
  return agentType.split(":")[1] || "General";
}

export class DossierManager {
  static table = "dossiers";

  // ─────────────────────────────────────────────────────
  // LOAD — returns the full dossiers row for a user
  // ─────────────────────────────────────────────────────
  static async loadRow(userId: string) {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select("*")
        .eq("user_id", userId)
        .single();

      // PGRST116 = no rows found — expected on first run
      if (error && error.code !== "PGRST116") {
        console.warn("[DossierManager] Load error (non-fatal, pipeline continues):", error.message);
        return null;  // treat as missing row
      }
      return data ?? null;
    } catch (e: any) {
      console.warn("[DossierManager] Unexpected load error (non-fatal):", e?.message ?? e);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────
  // ENSURE ROW — create the dossiers row if it doesn't exist
  // ─────────────────────────────────────────────────────
  static async ensureRow(userId: string) {
    let row = await this.loadRow(userId);
    if (row) return row;

    const baseline = {
      user_id: userId,
      writer_dossier: {},
      architect_dossier: {},
      astronomer_dossier: {},
      writer_history: [],
      architect_history: [],
      astronomer_history: [],
      philosopher_history: [],
    };

    try {
      const { data, error } = await supabase
        .from(this.table)
        .insert(baseline)
        .select()
        .single();

      if (error) {
        // Non-fatal: if the dossiers table doesn't exist or RLS blocks the insert,
        // return an in-memory baseline so the pipeline can continue without persistence.
        console.warn(
          "[DossierManager] Could not persist dossier row (non-fatal, running in-memory):",
          error.message
        );
        return baseline as any;
      }

      return data;
    } catch (e: any) {
      console.warn("[DossierManager] Unexpected insert error (non-fatal):", e?.message ?? e);
      return baseline as any;
    }
  }

  // ─────────────────────────────────────────────────────
  // LOAD AGENT DOSSIER — returns governance data for one
  //   agent type + domain (e.g. "writer:Math" → Math writer)
  // ─────────────────────────────────────────────────────
  static async loadAgentDossier(userId: string, agentType: string): Promise<AgentDossierData> {
    const row = await this.ensureRow(userId);
    const key = agentKey(agentType);
    const domain = agentDomain(agentType);
    const col = `${key}_dossier`;

    const map: AgentDossierMap = (row[col] && typeof row[col] === "object") ? row[col] : {};
    const existing = map[domain];

    if (existing && typeof existing === "object" && existing.trustScore !== undefined) {
      return existing as AgentDossierData;
    }
    return baselineDossier();
  }

  // ─────────────────────────────────────────────────────
  // SAVE AGENT DOSSIER — merge-write a full dossier data
  //   object for one agent type + domain.  Used by
  //   updateWriterAgentDossier to persist extended fields.
  // ─────────────────────────────────────────────────────
  static async saveAgentDossier(
    userId: string,
    agentType: string,
    data: AgentDossierData
  ): Promise<void> {
    const row = await this.ensureRow(userId);
    const key = agentKey(agentType);
    const domain = agentDomain(agentType);
    const col = `${key}_dossier`;

    const map: AgentDossierMap =
      (row[col] && typeof row[col] === "object") ? { ...row[col] } : {};

    map[domain] = { ...data, updatedAt: new Date().toISOString() };

    const { error } = await supabase
      .from(this.table)
      .update({ [col]: map, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      console.warn("[DossierManager.saveAgentDossier] non-fatal:", error.message);
    }
  }

  // ─────────────────────────────────────────────────────
  // UPDATE AFTER RUN — apply gatekeeper findings to the
  //   domain-specific agent dossier
  // ─────────────────────────────────────────────────────
  static async updateAfterRun({
    userId,
    agentType,
    gatekeeperReport,
    questionCount,
  }: {
    userId: string;
    agentType: string;
    gatekeeperReport: GatekeeperReport;
    questionCount: number;
  }) {
    const row = await this.ensureRow(userId);
    const key = agentKey(agentType);
    const domain = agentDomain(agentType);
    const col = `${key}_dossier`;

    // Load the full domain map for this agent type
    const map: AgentDossierMap =
      (row[col] && typeof row[col] === "object") ? { ...row[col] } : {};

    // Get or create the domain-specific dossier
    const dossier: AgentDossierData =
      (map[domain] && typeof map[domain] === "object" && map[domain].trustScore !== undefined)
        ? { ...map[domain] }
        : baselineDossier();

    // Ensure nested objects exist
    dossier.weaknesses ??= {};
    dossier.strengths ??= {};
    dossier.domainMastery ??= { runs: 0, cleanRuns: 0 };

    // ── Apply gatekeeper violations ──────────────────────
    const violations: Violation[] = gatekeeperReport?.violations ?? [];
    for (const v of violations) {
      dossier.weaknesses[v.type] = (dossier.weaknesses[v.type] ?? 0) + 1;
    }

    const isCleanRun = violations.length === 0;
    const isLowFriction = violations.length <= 2;

    // Trust score — domain-specific
    if (isCleanRun) {
      dossier.trustScore = Math.min(10, (dossier.trustScore ?? 5) + 1);
    } else if (violations.length > 2) {
      const penalty = violations.length >= 5 ? 2 : 1;
      dossier.trustScore = Math.max(0, (dossier.trustScore ?? 5) - penalty);
    }

    // Stability score — domain-specific
    if (isLowFriction) {
      dossier.stabilityScore = Math.min(10, (dossier.stabilityScore ?? 5) + 1);
    } else {
      const density = questionCount > 0 ? violations.length / questionCount : 1;
      const penalty = density >= 0.5 ? 2 : 1;
      dossier.stabilityScore = Math.max(0, (dossier.stabilityScore ?? 5) - penalty);
    }

    // Domain mastery — runs/cleanRuns for this specific domain
    dossier.domainMastery.runs += 1;
    if (isCleanRun) dossier.domainMastery.cleanRuns += 1;

    dossier.version = (dossier.version ?? 0) + 1;
    dossier.updatedAt = new Date().toISOString();

    // Write the domain back into the map
    map[domain] = dossier;

    // Persist the full map
    const { error } = await supabase
      .from(this.table)
      .update({
        [col]: map,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[DossierManager] Update error:", error);
      throw error;
    }

    return dossier;
  }

  // ─────────────────────────────────────────────────────
  // APPEND HISTORY — add a pipeline run trace for an agent type
  // ─────────────────────────────────────────────────────
  static async appendHistory(userId: string, agentType: string, entry: any) {
    const row = await this.ensureRow(userId);
    const key = agentKey(agentType);
    const col = `${key}_history`;

    const existing: any[] = Array.isArray(row[col]) ? row[col] : [];
    const updatedHistory = [...existing, entry];

    const { error } = await supabase
      .from(this.table)
      .update({
        [col]: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[DossierManager] appendHistory error:", error);
      throw error;
    }

    return updatedHistory;
  }

  // ─────────────────────────────────────────────────────
  // RECORD PIPELINE RUN — convenience wrapper
  // ─────────────────────────────────────────────────────
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
    return await this.appendHistory(userId, "writer", entry);
  }
}
