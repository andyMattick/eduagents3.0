import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { ItemType, CognitiveIntent, Difficulty, SharedContext } from "@/pipeline/contracts/Blueprint";
import { DeriveTemplateRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";

export interface TemplateDeriverContext {
  request: DeriveTemplateRequest;
}

export interface TemplateAnalysis {
  subject: string;
  itemType: ItemType;
  cognitiveIntent: CognitiveIntent;
  difficulty: Difficulty;
  sharedContext: SharedContext;
  structure: Record<string, unknown>;
}

export interface DeriveTemplateResult {
  template: DerivedTemplate;
  analysis?: TemplateAnalysis;
}
