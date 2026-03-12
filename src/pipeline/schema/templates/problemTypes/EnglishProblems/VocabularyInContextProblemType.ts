import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const VocabularyInContextProblemType = {
  id: "ela_vocabulary_in_context",
  label: "Vocabulary in Context",
  itemType: ItemType.MultipleChoice,
  defaultIntent: CognitiveIntent.Interpret,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Passage,

  configurableFields: {
    wordSelection: ["teacher_provided", "auto_select"],
    distractorStyle: ["simple", "grade_level", "advanced"],
    difficulty: ["easy", "medium", "hard"]
  }
};
