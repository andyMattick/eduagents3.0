import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const ScienceCERProblemType = {
  subject: "Science",
  id: "science_cer",
  label: "Scientific Explanation (CER)",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Justify,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Scenario,

  configurableFields: {
    evidenceCount: [1, 2, 3],
    responseLength: ["short", "medium", "extended"],
    difficulty: ["easy", "medium", "hard"]
  }
};
