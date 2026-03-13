import { withTemplate } from "../templateCarrier";
import { HistoryCauseEffectProblemType } from "./HistoryCauseAndEffectReasoning";
import { HistoryClaimEvidenceProblemType } from "./HistoryClaimEvidenceProblemType";
import { HistoryDBQProblemType } from "./HistoryDBQProblemType";
import { HistoryMapInterpretationProblemType } from "./HistoryMapInterpretationProblemType";
import { HistoryPrimarySourceProblemType } from "./HistoryPrimarySourceProblemType";
import { HistoryTimelineProblemType } from "./HistoryTimelineProblemType";

const rawHistoryProblemTypes = [
  HistoryCauseEffectProblemType,
  HistoryClaimEvidenceProblemType,
  HistoryDBQProblemType,
  HistoryMapInterpretationProblemType,
  HistoryPrimarySourceProblemType,
  HistoryTimelineProblemType,
] as const;

export const historyProblemTypes = rawHistoryProblemTypes.map((problemType) =>
  withTemplate(problemType, "Social Studies")
);
