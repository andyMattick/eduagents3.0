import { withTemplate } from "../templateCarrier";
import { ScienceCERProblemType } from "./ScienceCERProblemType";
import { ScienceDataTableProblemType } from "./ScienceDataTableProblemType";
import { ScienceDiagramLabelingProblemType } from "./ScienceDiagramLabelingProblemType";
import { ScienceExperimentalDesignProblemType } from "./ScienceExperimentalDesignProblemType";
import { ScienceGraphInterpretationProblemType } from "./ScienceGraphInterpretationProblemType";
import { SciencePhenomenaProblemType } from "./SciencePhenomenaProblemType";
import { ScienceSequencingProblemType } from "./ScienceSequencingProblemType";
import { ScienceClassificationProblemType } from "./ScienceClassificationProblemType";
import { ScienceTableCompletionProblemType } from "./ScienceTableCompletionProblemType";

const rawScienceProblemTypes = [
  ScienceCERProblemType,
  ScienceDataTableProblemType,
  ScienceDiagramLabelingProblemType,
  ScienceExperimentalDesignProblemType,
  ScienceGraphInterpretationProblemType,
  SciencePhenomenaProblemType,
  ScienceSequencingProblemType,
  ScienceClassificationProblemType,
  ScienceTableCompletionProblemType,
] as const;

export const scienceProblemTypes = rawScienceProblemTypes.map((templateEntry) =>
  withTemplate(templateEntry, "Science")
);
