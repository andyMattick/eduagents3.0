import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";

export const ScienceSequencingProblemType = {
  subject: "Science",
  id: "science_sequencing",
  label: "Process Sequencing",
  itemType: ItemType.Ordering,
  defaultIntent: CognitiveIntent.Sequence,
  defaultDifficulty: Difficulty.Medium,

  supports: {
    sequencing: true,
    shortAnswer: true
  },

  configurableFields: {
    processType: ["biological_cycle", "experimental_procedure", "life_cycle", "chemical_reaction", "body_system"],
    difficulty: ["easy", "medium", "hard"]
  }
};
