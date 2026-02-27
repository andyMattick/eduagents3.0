// pipeline/agents/scribe/AgentSelector.ts
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
  static async selectAgent(userId: string, agentType: string) {
    // Load all dossier instances for this agent type
    const dossiers = await DossierManager.load(userId, agentType);

    // If none exist, create a baseline instance
    if (!dossiers || dossiers.length === 0) {
      const baseline = await DossierManager.createBaseline(userId, agentType);
      return baseline;
    }

    // Sort by trustScore (highest first)
    const sorted = dossiers.sort((a, b) => {
      const da = a.dossier;
      const db = b.dossier;
      return (db.trustScore ?? 0) - (da.trustScore ?? 0);
    });

    const best = sorted[0];

    return {
      instanceId: best.instance_id,
      dossier: best.dossier,
      version: best.version
    };
  }
}
