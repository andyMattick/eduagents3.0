// pipeline/agents/scribe/AgentSelector.ts

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
