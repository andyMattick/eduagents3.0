import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const STEMDataAnalysisProblemType = {
  subject: "STEM",
  id: "stem_data_analysis",
  label: "Data Analysis",
  itemType: ItemType.TableInterpretation,
  defaultIntent: CognitiveIntent.Analyze,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.DataTable,
    supports: {
    dataInterpretation: true,
    shortAnswer: true
  },

  configurableFields: {
    datasetType: ["numerical", "categorical", "simulation_output"],
    questionTypes: ["mcq", "short_answer"],
    difficulty: ["easy", "medium", "hard"]
  }
};
