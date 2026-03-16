import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const PairedPassagesProblemType = {
  subject: "English Language Arts",
  id: "ela_paired_passages",
  label: "Paired Passages",
  itemType: ItemType.ShortAnswer,
  defaultIntent: CognitiveIntent.Compare,
  defaultDifficulty: Difficulty.Hard,
  sharedContext: SharedContext.Passage,
    supports: {
    requiresPassage: true,
    pairedPassage: true,
    mcq: true,
    shortAnswer: true
  },
  

  configurableFields: {
    pairingType: ["same_topic", "opposing_claims", "different_genres"],
    questionTypes: ["mcq", "short_answer", "evidence"],
    difficulty: ["medium", "hard"]
  }
};
