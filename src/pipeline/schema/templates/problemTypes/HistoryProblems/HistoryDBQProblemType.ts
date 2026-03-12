import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const HistoryDBQProblemType = {
  id: "history_dbq",
  label: "Document-Based Question (DBQ)",
  itemType: ItemType.MultiPart,
  defaultIntent: CognitiveIntent.Synthesize,
  defaultDifficulty: Difficulty.Hard,
  sharedContext: SharedContext.Multi_Source,

  configurableFields: {
    documentCount: [2, 3, 4, 5],
    responseLength: ["short", "extended"],
    difficulty: ["medium", "hard"]
  }
};
