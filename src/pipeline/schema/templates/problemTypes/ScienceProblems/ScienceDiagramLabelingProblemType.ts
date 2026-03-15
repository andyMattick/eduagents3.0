import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const ScienceDiagramLabelingProblemType = {
  subject: "Science",
  id: "science_diagram_labeling",
  label: "Diagram Labeling",
  itemType: ItemType.Labeling,
  defaultIntent: CognitiveIntent.Identify,
  defaultDifficulty: Difficulty.Easy,
  sharedContext: SharedContext.Diagram,
    supports: {
    diagramLabeling: true
  },

  configurableFields: {
    diagramType: ["cell", "body_system", "circuit", "ecosystem", "earth_layers"],
    difficulty: ["easy", "medium", "hard"]
  }
};
