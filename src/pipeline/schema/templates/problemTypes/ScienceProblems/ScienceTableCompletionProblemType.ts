import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const ScienceTableCompletionProblemType = {
  subject: "Science",
  id: "science_table_completion",
  label: "Table Completion",
  itemType: ItemType.TableInterpretation,
  defaultIntent: CognitiveIntent.Apply,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.DataTable,

  supports: {
    tableCompletion: true
  },

  configurableFields: {
    tableType: ["structure_function", "compare_contrast", "cause_effect", "organism_traits", "experimental_variables"],
    blanksPerRow: [1, 2],
    difficulty: ["easy", "medium", "hard"]
  }
};
