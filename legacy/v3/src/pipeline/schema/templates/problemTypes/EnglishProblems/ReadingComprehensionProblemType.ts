import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const ReadingComprehensionProblemType = {
  subject: "English Language Arts",
  id: "ela_reading_comprehension",
  label: "Reading Comprehension",
  itemType: ItemType.ShortAnswer, // parts can override
  defaultIntent: CognitiveIntent.Analyze,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Passage,
    supports: {
    requiresPassage: true,
    mcq: true
  },

  configurableFields: {
    genre: ["informational", "narrative", "argumentative", "poetry"],
    questionTypes: ["mcq", "short_answer", "evidence"],
    difficulty: ["easy", "medium", "hard"]
  }
};
