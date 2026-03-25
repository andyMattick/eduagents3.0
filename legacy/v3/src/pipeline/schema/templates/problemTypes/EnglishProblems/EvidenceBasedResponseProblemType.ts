import { ItemType } from "../../../enums/ItemType";
import { CognitiveIntent } from "../../../enums/CognitiveIntent";
import { Difficulty } from "../../../enums/Difficulty";
import { SharedContext } from "../../../enums/SharedContent";

export const EvidenceBasedResponseProblemType = {
  subject: "English Language Arts",
  id: "ela_evidence_based_response",
  label: "Evidence-Based Response",
  itemType: ItemType.Explanation,
  defaultIntent: CognitiveIntent.Justify,
  defaultDifficulty: Difficulty.Medium,
  sharedContext: SharedContext.Passage,
  supports: {
  numericEntry: true,
  shortAnswer: true,
  multiStep: true
},

  configurableFields: {
    responseLength: ["short", "medium", "long"],
    evidenceCount: [1, 2, 3],
    difficulty: ["easy", "medium", "hard"]
  }
};
