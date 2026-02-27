// pipeline/agents/scribe/AgentSelector.ts
//
// Simplified: one dossier per (user, agentType) stored in the unified
// `dossiers` table.  No more instance-based selection or multi-row queries.
// ─────────────────────────────────────────────────────────────────────
type SubscriptionTier = "free" | "tier1" | "tier2" | "admin";
import { SupabaseClient } from "@supabase/supabase-js";

const tierMap: Record<SubscriptionTier, string[]> = {
  admin: ["free", "tier1", "tier2"],
  tier2: ["free", "tier1", "tier2"],
  tier1: ["free", "tier1"],
  free: ["free"]
};

export async function selectAgents(supabase: SupabaseClient, userId: string) {
  const { data: account } = await supabase
    .from("teacher_account")
    .select("subscription_tier")
    .eq("user_id", userId)
    .single();

  const tier = (account?.subscription_tier ?? "free") as SubscriptionTier;

  const allowedTiers = tierMap[tier];

  const { data: agents } = await supabase
    .from("agent_capabilities")
    .select("*")
    .in("tier", allowedTiers);

  return agents;
}

import { DossierManager } from "@/system/dossier/DossierManager";

export class AgentSelector {
  /**
   * Returns the governance dossier for a single agent type.
   * There is exactly one dossier per (userId, agentType) now —
   * no instance proliferation.
   */
  static async selectAgent(userId: string, agentType: string) {
    const dossier = await DossierManager.loadAgentDossier(userId, agentType);
    return { dossier };
  }
}
