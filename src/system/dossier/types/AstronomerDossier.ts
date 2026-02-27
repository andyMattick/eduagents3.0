import type { ViolationType } from "@/pipeline/agents/gatekeeper/ViolationCatalog";

export interface AstronomerDossier {
  agentType: "astronomer";

  // core governance metrics
  predictionAccuracy: number; // how well Astronomer predicts student behavior
  stabilityScore: number;

  // violation tracking
  weaknesses: Partial<Record<ViolationType, number>>;
  strengths: string[];

  // domain + metadata
  modelSelectionHistory: string[]; // which LLMs it chose and why
  signalSensitivity: number;       // how sensitive it is to Writer signals

  // lifecycle
  version: number;
  updatedAt: string;
}
