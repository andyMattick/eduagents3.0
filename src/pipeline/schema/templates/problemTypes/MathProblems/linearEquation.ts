import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";

export const LinearEquationProblemType = {
  subject: "Mathematics",
  id: "linear_equation",
  label: "Linear Equation",
  itemType: ItemType.Plugin,
  pluginId: "linear_equation_template",

  defaultIntent: CognitiveIntent.Solve,
  defaultDifficulty: Difficulty.Medium,

  configurableFields: {
    form: ["one-step", "two-step", "multi-step"],
    difficulty: ["easy", "medium", "hard"]
  }
};
