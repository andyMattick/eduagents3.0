import { withTemplate } from "../templateCarrier";
import { ScienceCERProblemType } from "./ScienceCERProblemType";
import { ScienceDataTableProblemType } from "./ScienceDataTableProblemType";
import { ScienceDiagramLabelingProblemType } from "./ScienceDiagramLabelingProblemType";
import { ScienceExperimentalDesignProblemType } from "./ScienceExperimentalDesignProblemType";
import { ScienceGraphInterpretationProblemType } from "./ScienceGraphInterpretationProblemType";
import { SciencePhenomenaProblemType } from "./SciencePhenomenaProblemType";

const rawScienceProblemTypes = [
  ScienceCERProblemType,
  ScienceDataTableProblemType,
  ScienceDiagramLabelingProblemType,
  ScienceExperimentalDesignProblemType,
  ScienceGraphInterpretationProblemType,
  SciencePhenomenaProblemType,
] as const;

export const scienceProblemTypes = rawScienceProblemTypes.map((problemType) =>
  withTemplate(problemType, "Science")
);
