import { ItemType, CognitiveIntent, Difficulty, SharedContext } from "./Blueprint";

export interface DerivedTemplate {
  id: string;
  label: string;
  subject: string;
  itemType: ItemType;
  cognitiveIntent: CognitiveIntent;
  difficulty: Difficulty;
  sharedContext: SharedContext;
  configurableFields: Record<string, unknown>;
  examples: string[];
  inferred: {
    itemType: boolean;
    cognitiveIntent: boolean;
    difficulty: boolean;
    sharedContext: boolean;
  };
  previewItems: unknown[];
}
