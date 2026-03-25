import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const SciencePhenomenaProblemType = {
  subject: "Science",
  id: "science_phenomena",
  label: "Phenomena-Based Question",
  itemType: ItemType.ShortAnswer,
  defaultIntent: CognitiveIntent.Explain,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Scenario,
    supports: {
    shortAnswer: true,
    extendedResponse: true
  },

  configurableFields: {
    phenomenonType: ["physical", "chemical", "biological", "earth_science"],
    questionTypes: ["mcq", "short_answer", "explanation"],
    difficulty: ["easy", "medium", "hard"]
  }
};
