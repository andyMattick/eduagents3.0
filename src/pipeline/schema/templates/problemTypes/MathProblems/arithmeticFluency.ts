import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";

export const ArithmeticFluencyProblemType = {
  subject: "Mathematics",
  id: "arithmetic_fluency",
  label: "Arithmetic Fluency",
  itemType: ItemType.Plugin,

  // Default metadata for UI + Architect
  defaultIntent: CognitiveIntent.Compute,
  defaultDifficulty: Difficulty.Medium,

  // Plugin routing
  pluginId: "arithmetic_fluency_template",

  // Optional: teacher-editable fields
  configurableFields: {
    operation: ["add", "subtract", "multiply", "divide"],
    difficulty: ["easy", "medium", "hard"]
  }
};
