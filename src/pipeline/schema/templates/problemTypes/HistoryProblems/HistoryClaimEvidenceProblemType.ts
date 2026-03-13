import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const HistoryClaimEvidenceProblemType = {
  subject: "History",
  id: "history_claim_evidence",
  label: "Historical Argument (Claim–Evidence)",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Justify,
  defaultDifficulty: Difficulty.Hard,
  sharedContext: SharedContext.Primary_Source,

  configurableFields: {
    evidenceCount: [1, 2, 3],
    responseLength: ["short", "extended"],
    difficulty: ["medium", "hard"]
  }
};
