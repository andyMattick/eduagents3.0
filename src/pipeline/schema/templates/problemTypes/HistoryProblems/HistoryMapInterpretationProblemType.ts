import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const HistoryMapInterpretationProblemType = {
  id: "history_map_interpretation",
  label: "Map Interpretation",
  itemType: ItemType.GraphInterpretation,
  defaultIntent: CognitiveIntent.Interpret,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Map,

  configurableFields: {
    mapType: ["political", "physical", "thematic", "historical_event"],
    questionTypes: ["mcq", "short_answer"],
    difficulty: ["easy", "medium", "hard"]
  }
};
