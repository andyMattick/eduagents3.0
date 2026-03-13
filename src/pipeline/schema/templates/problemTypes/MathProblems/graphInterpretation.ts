import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty"

export const GraphInterpretationProblemType = {
  subject: "Mathematics",
  id: "graph_interpretation",
  label: "Graph Interpretation",
  itemType: ItemType.Plugin,
  pluginId: "graph_interpretation_template",

  defaultIntent: CognitiveIntent.Analyze,
  defaultDifficulty: Difficulty.Medium,

  configurableFields: {
    graphType: ["line", "bar", "scatter", "histogram"],
    difficulty: ["easy", "medium", "hard"]
  }
};
