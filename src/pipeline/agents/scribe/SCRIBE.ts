import { AgentSelector } from "./AgentSelector";
import { CompensationEngine } from "./CompensationEngine";
import { DossierManager } from "@/system/dossier/DossierManager";
import type { GatekeeperReport } from "@/pipeline/agents/gatekeeper/GatekeeperReport";


export class SCRIBE {
  // 1. Pre-run agent selection
  static async selectAgents(uar: any) {
    const userId = uar.userId;
    const domain = uar.domain;

    // Load the best agent instances for this domain
    const writer = await AgentSelector.selectAgent(userId, `writer:${domain}`);
    const architect = await AgentSelector.selectAgent(userId, `architect:${domain}`);
    const astronomer = await AgentSelector.selectAgent(userId, `astronomer:${domain}`);

    // Build a unified compensation profile
    const compensationProfile = CompensationEngine.generateCompensation(
      writer.dossier,
      { domain }
    );

    return {
      writerInstanceId: writer.instanceId,
      architectInstanceId: architect.instanceId,
      astronomerInstanceId: astronomer.instanceId,
      compensationProfile
    };
  }

  // 2. Post-run dossier update
static async updateDossier({
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
  return DossierManager.updateAfterRun({
    userId,
    agentType,
    instanceId,
    gatekeeperReport,
    finalAssessment
  });
}

}
