import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";

export const AlgebraicFluencyProblemType = {
  id: "algebraic_fluency",
  label: "Algebraic Fluency",
  itemType: ItemType.Plugin,
  pluginId: "algebraic_fluency_template",

  defaultIntent: CognitiveIntent.Compute,
  defaultDifficulty: Difficulty.Medium,

  configurableFields: {
    difficulty: ["easy", "medium", "hard"]
  }
};
