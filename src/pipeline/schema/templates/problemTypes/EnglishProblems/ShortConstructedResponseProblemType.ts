import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const ShortConstructedResponseProblemType = {
  subject: "English Language Arts",
  id: "ela_short_constructed_response",
  label: "Short Constructed Response",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Explain,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Passage,

  configurableFields: {
    promptType: ["analysis", "explanation", "summary"],
    responseLength: ["short", "medium"],
    difficulty: ["easy", "medium", "hard"]
  }
};
