import type { ViolationType } from "@/pipeline/agents/gatekeeper/ViolationCatalog";

export interface WriterDossier {
  agentType: "writer";

  // core governance metrics
  trustScore: number;        // how often Writer passes Gatekeeper
  stabilityScore: number;    // variance in performance across runs

  // violation tracking
  weaknesses: Partial<Record<ViolationType, number>>;
  strengths: string[];

  // domain + metadata
  domainMastery: Record<string, number>; // e.g., { "ELA": 0.8, "Math": 0.6 }
  inputSensitivity: number;              // how sensitive Writer is to prompt noise

  // lifecycle
  version: number;
  updatedAt: string;
}
