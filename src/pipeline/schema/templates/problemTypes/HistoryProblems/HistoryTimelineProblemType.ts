import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const HistoryTimelineProblemType = {
  id: "history_timeline",
  label: "Timeline Ordering",
  itemType: ItemType.Ordering,
  defaultIntent: CognitiveIntent.Sequence,
  defaultDifficulty: Difficulty.Easy,
  sharedContext: SharedContext.Timeline,

  configurableFields: {
    era: ["ancient", "medieval", "early_modern", "modern"],
    difficulty: ["easy", "medium", "hard"]
  }
};
