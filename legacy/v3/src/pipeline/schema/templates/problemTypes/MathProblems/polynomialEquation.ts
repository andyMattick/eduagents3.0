import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";

export const PolynomialOperationsProblemType = {
  subject: "Mathematics",
  id: "polynomial_operations",
  label: "Polynomial Operations",
  itemType: ItemType.Plugin,
  pluginId: "polynomial_operations_template",

  defaultIntent: CognitiveIntent.Compute,
  defaultDifficulty: Difficulty.Medium,
    supports: {
    numericEntry: true,
    shortAnswer: true,
    multiStep: true
  },

  configurableFields: {
    operation: ["add", "subtract", "multiply", "divide"],
    degree: ["linear", "quadratic", "cubic"],
    difficulty: ["easy", "medium", "hard"]
  }
};
