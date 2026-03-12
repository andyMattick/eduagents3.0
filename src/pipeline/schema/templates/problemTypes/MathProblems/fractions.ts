import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";

export const FractionsProblemType = {
  id: "fractions",
  label: "Fractions",
  itemType: ItemType.Plugin,
  pluginId: "fractions_template",

  defaultIntent: CognitiveIntent.Compute,
  defaultDifficulty: Difficulty.Medium,

  configurableFields: {
    operation: ["add", "subtract", "multiply", "divide"],
    difficulty: ["easy", "medium", "hard"]
  }
};
