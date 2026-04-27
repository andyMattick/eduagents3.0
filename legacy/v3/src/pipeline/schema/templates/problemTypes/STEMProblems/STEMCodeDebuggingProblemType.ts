import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const STEMCodeDebuggingProblemType = {
  subject: "STEM",
  id: "stem_code_debugging",
  label: "Code Debugging",
  itemType: ItemType.Code,
  defaultIntent: CognitiveIntent.Evaluate,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.CodeSnippet,
    supports: {
    codeDebugging: true,
    shortAnswer: true
  },

  configurableFields: {
    language: ["python", "javascript", "java", "c++"],
    bugType: ["syntax", "logic", "runtime", "off_by_one"],
    difficulty: ["easy", "medium", "hard"]
  }
};
