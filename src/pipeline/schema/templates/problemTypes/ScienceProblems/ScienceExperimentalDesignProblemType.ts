import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const ScienceExperimentalDesignProblemType = {
  id: "science_experimental_design",
  label: "Experimental Design",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Plan,
  defaultDifficulty: Difficulty.Hard,
  sharedContext: SharedContext.Scenario,

  configurableFields: {
    focus: ["variables", "controls", "procedure", "prediction"],
    responseLength: ["short", "extended"],
    difficulty: ["medium", "hard"]
  }
};
