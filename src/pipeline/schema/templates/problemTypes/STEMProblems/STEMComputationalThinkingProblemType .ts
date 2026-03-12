import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const STEMComputationalThinkingProblemType = {
  id: "stem_computational_thinking",
  label: "Computational Thinking",
  itemType: ItemType.ShortAnswer,
  defaultIntent: CognitiveIntent.Analyze,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Scenario,

  configurableFields: {
    focus: ["pattern_recognition", "decomposition", "abstraction", "algorithm_design"],
    questionTypes: ["mcq", "short_answer"],
    difficulty: ["easy", "medium", "hard"]
  }
};
