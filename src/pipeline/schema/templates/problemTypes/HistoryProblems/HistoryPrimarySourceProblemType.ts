import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const HistoryPrimarySourceProblemType = {
  subject: "History",
  id: "history_primary_source",
  label: "Primary Source Analysis",
  itemType: ItemType.ShortAnswer,
  defaultIntent: CognitiveIntent.Analyze,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Primary_Source,
    supports: {
    primarySource: true,
    analysis: true,
    shortAnswer: true
  },

  configurableFields: {
    sourceType: ["text", "image", "political_cartoon", "speech", "letter"],
    questionTypes: ["mcq", "short_answer", "evidence"],
    difficulty: ["easy", "medium", "hard"]
  }
};
