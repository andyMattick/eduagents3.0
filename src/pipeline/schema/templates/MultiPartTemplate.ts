import { CognitiveIntent } from "../enums/CognitiveIntent";
import { ItemType } from "../enums/ItemType";
import { Difficulty } from "../enums/Difficulty";
import { SharedContext } from "../enums/SharedContent";

export interface MultiPartTemplate {
  id: string;
  label: string;
  sharedContext: SharedContext;

  parts: MultiPartTemplatePart[];
}

export interface MultiPartTemplatePart {
  id: string;
  label: string;

  itemType: ItemType;
  cognitiveIntent: CognitiveIntent;
  difficulty: Difficulty;

  // Optional fields for future extensibility
  maxPoints?: number;
  rubric?: string;
  metadata?: Record<string, any>;
}
