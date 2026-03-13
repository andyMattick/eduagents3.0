import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const LiteraryAnalysisProblemType = {
  subject: "English Language Arts",
  id: "ela_literary_analysis",
  label: "Literary Analysis",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Analyze,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Passage,

  configurableFields: {
    focus: ["theme", "character", "structure", "tone", "figurative_language"],
    responseLength: ["short", "extended"],
    difficulty: ["easy", "medium", "hard"]
  }
};
