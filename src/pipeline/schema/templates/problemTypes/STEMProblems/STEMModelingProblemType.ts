import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const STEMModelingProblemType = {
  subject: "STEM",
  id: "stem_modeling",
  label: "Modeling and Simulation",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Explain,
  defaultDifficulty: Difficulty.Hard,
  sharedContext: SharedContext.Scenario,

  configurableFields: {
    modelType: ["population", "physics", "ecosystem", "financial"],
    taskType: ["interpret", "modify", "predict"],
    difficulty: ["medium", "hard"]
  }
};
