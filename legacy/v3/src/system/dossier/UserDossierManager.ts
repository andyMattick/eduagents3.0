// src/system/dossier/UserDossierManager.ts
//
// DEPRECATED — all logic has been consolidated into DossierManager.
// This file re-exports the same API surface so existing consumers
// continue to compile.  New code should import DossierManager directly.
// ───────────────────────────────────────────────────────────────────
import { DossierManager } from "./DossierManager";

export class UserDossierManager {
  /** @deprecated Use DossierManager.loadRow() */
  static async load(userId: string) {
    return DossierManager.loadRow(userId);
  }

  /** @deprecated Use DossierManager.ensureRow() */
  static async createBaseline(userId: string) {
    return DossierManager.ensureRow(userId);
  }

  /** @deprecated Use DossierManager.appendHistory() */
  static async appendHistory(userId: string, agentType: string, entry: any) {
    return DossierManager.appendHistory(userId, agentType, entry);
  }

  /** @deprecated Use DossierManager.recordPipelineRun() */
  static async recordPipelineRun(args: {
    userId: string;
    trace: any;
    finalAssessment: any;
  }) {
    return DossierManager.recordPipelineRun(args);
  }
}
