import { withTemplate } from "../templateCarrier";
import { STEMCodeDebuggingProblemType } from "./STEMCodeDebuggingProblemType";
import { STEMCodeWritingProblemType } from "./STEMCodeWritingProblemType";
import { STEMComputationalThinkingProblemType } from "./STEMComputationalThinkingProblemType .ts";
import { STEMDataAnalysisProblemType } from "./STEMDataAnalysisProblemType";
import { STEMEngineeringDesignProblemType } from "./STEMEngineeringDesignProblemType";
import { STEMModelingProblemType } from "./STEMModelingProblemType";

const rawStemProblemTypes = [
  STEMCodeDebuggingProblemType,
  STEMCodeWritingProblemType,
  STEMComputationalThinkingProblemType,
  STEMDataAnalysisProblemType,
  STEMEngineeringDesignProblemType,
  STEMModelingProblemType,
] as const;

export const stemProblemTypes = rawStemProblemTypes.map((templateEntry) =>
  withTemplate(templateEntry, "STEM")
);
