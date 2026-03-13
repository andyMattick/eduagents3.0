import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const HistoryCauseEffectProblemType = {
  subject: "History",
  id: "history_cause_effect",
  label: "Cause and Effect",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Explain,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Scenario,

  configurableFields: {
    focus: ["cause", "effect", "both"],
    responseLength: ["short", "extended"],
    difficulty: ["easy", "medium", "hard"]
  }
};
