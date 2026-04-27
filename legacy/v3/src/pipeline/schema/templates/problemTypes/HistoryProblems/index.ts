import { withTemplate } from "../templateCarrier";
import { HistoryCauseEffectProblemType } from "./HistoryCauseAndEffectReasoning";
import { HistoryClaimEvidenceProblemType } from "./HistoryClaimEvidenceProblemType";
import { HistoryDBQProblemType } from "./HistoryDBQProblemType";
import { HistoryMapInterpretationProblemType } from "./HistoryMapInterpretationProblemType";
import { HistoryPrimarySourceProblemType } from "./HistoryPrimarySourceProblemType";
import { HistoryTimelineProblemType } from "./HistoryTimelineProblemType";

const rawHistoryProblemTypes: Array<Parameters<typeof withTemplate>[0]> = [
  HistoryCauseEffectProblemType,
  HistoryClaimEvidenceProblemType,
  HistoryDBQProblemType,
  HistoryMapInterpretationProblemType,
  HistoryPrimarySourceProblemType,
  HistoryTimelineProblemType,
];

export const historyProblemTypes = rawHistoryProblemTypes.map((templateEntry) =>
  withTemplate(templateEntry, "Social Studies")
);
