import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const STEMCodeWritingProblemType = {
  subject: "STEM",
  id: "stem_code_writing",
  label: "Code Writing",
  itemType: ItemType.Code,
  defaultIntent: CognitiveIntent.Create,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.CodeSnippet,
   supports: {
    codeWriting: true,
    extendedResponse: true
  },

  configurableFields: {
    language: ["python", "javascript", "java", "c++"],
    taskType: ["complete_function", "write_from_scratch", "fill_in_blanks"],
    difficulty: ["easy", "medium", "hard"]
  }
};
