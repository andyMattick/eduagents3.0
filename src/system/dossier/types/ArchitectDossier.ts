import type { ViolationType } from "@/pipeline/agents/gatekeeper/ViolationCatalog";

export interface ArchitectDossier {
  agentType: "architect";

  // core governance metrics
  reliabilityScore: number;  // how often Architect produces valid blueprints
  stabilityScore: number;

  // violation tracking
  weaknesses: Partial<Record<ViolationType, number>>;
  strengths: string[];

  // domain + metadata
  schemaMastery: Record<string, number>; // blueprint schema categories
  planningDepth: number;                 // how complex Architect’s plans are

  // lifecycle
  version: number;
  updatedAt: string;
}
