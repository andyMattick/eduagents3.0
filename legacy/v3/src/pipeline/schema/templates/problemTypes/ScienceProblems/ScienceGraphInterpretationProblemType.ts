import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const ScienceGraphInterpretationProblemType = {
  subject: "Science",
  id: "science_graph_interpretation",
  label: "Graph Interpretation",
  itemType: ItemType.GraphInterpretation,
  defaultIntent: CognitiveIntent.Analyze,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Graph,
    supports: {
    graphInterpretation: true,
    dataInterpretation: true,
    shortAnswer: true
  },

  configurableFields: {
    graphType: ["line", "bar", "scatter", "multi_series"],
    questionTypes: ["mcq", "short_answer"],
    difficulty: ["easy", "medium", "hard"]
  }
};
