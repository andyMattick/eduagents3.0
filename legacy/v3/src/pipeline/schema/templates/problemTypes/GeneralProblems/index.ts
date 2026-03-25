import { GeneralMultipleChoiceProblemType } from "./GeneralMultipleChoiceProblemType";
import { GeneralMultiSelectProblemType } from "./GeneralMultiSelectProblemType";
import { GeneralShortAnswerProblemType } from "./GeneralShortAnswerProblemType";
import { GeneralTrueFalseProblemType } from "./GeneralTrueFalseProblemType";
import { GeneralEssayProblemType } from "./GeneralEssayProblemType";
import { GeneralPassageBasedProblemType } from "./GeneralPassageBasedProblemType";

export const GeneralProblemPlugins = [
  GeneralMultipleChoiceProblemType,
  GeneralMultiSelectProblemType,
  GeneralShortAnswerProblemType,
  GeneralTrueFalseProblemType,
  GeneralEssayProblemType,
  GeneralPassageBasedProblemType,
];