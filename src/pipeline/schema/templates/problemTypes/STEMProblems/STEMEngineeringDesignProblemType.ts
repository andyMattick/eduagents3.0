import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const STEMEngineeringDesignProblemType = {
  subject: "STEM",
  id: "stem_engineering_design",
  label: "Engineering Design",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Plan,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Scenario,

  configurableFields: {
    focus: ["constraints", "criteria", "tradeoffs", "optimization"],
    responseLength: ["short", "extended"],
    difficulty: ["easy", "medium", "hard"]
  }
};
