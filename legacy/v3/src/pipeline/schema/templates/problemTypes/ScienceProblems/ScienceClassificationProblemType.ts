import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";

export const ScienceClassificationProblemType = {
  subject: "Science",
  id: "science_classification",
  label: "Classification",
  itemType: ItemType.Matching,
  defaultIntent: CognitiveIntent.Classify,
  defaultDifficulty: Difficulty.Medium,

  supports: {
    matching: true,
    classification: true,
    shortAnswer: true
  },

  configurableFields: {
    classificationBasis: ["taxonomy", "properties", "function", "structure", "behavior"],
    categoryCount: [2, 3, 4],
    difficulty: ["easy", "medium", "hard"]
  }
};
