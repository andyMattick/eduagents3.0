import { ItemType } from "../../enums/ItemType";
import { CognitiveIntent } from "../../enums/CognitiveIntent";
import { Difficulty } from "../../enums/Difficulty";

export const ForeignLanguageProblemType = {
  Subject: "Foreign Language",
  id: "foreign_language",
  label: "Foreign Language",
  itemType: ItemType.Plugin,
  pluginId: "foreign_language_template",

  defaultIntent: CognitiveIntent.Apply,
  defaultDifficulty: Difficulty.Medium,
    supports: {
    shortAnswer: true,
    vocabulary: true,
    translation: true
  },

  configurableFields: {
    task: ["vocabulary", "grammar", "translation"],
    language: ["spanish", "french", "german", "latin", "mandarin"],
    difficulty: ["easy", "medium", "hard"]
  }
};
