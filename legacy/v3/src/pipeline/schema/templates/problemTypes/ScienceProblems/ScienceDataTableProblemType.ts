import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const ScienceDataTableProblemType = {
  subject: "Science",
  id: "science_data_table",
  label: "Data Table Interpretation",
  itemType: ItemType.TableInterpretation,
  defaultIntent: CognitiveIntent.Analyze,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.DataTable,
    supports: {
    tableCompletion: true,
    dataInterpretation: true,
    shortAnswer: true
  },

  configurableFields: {
    tableType: ["categorical", "numerical", "experimental_results"],
    questionTypes: ["mcq", "short_answer"],
    difficulty: ["easy", "medium", "hard"]
  }
};
