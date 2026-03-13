import { englishProblemTypes } from "./EnglishProblems";
import { historyProblemTypes } from "./HistoryProblems";
import { mathProblemTypes } from "./MathProblems";
import { scienceProblemTypes } from "./ScienceProblems";
import { stemProblemTypes } from "./STEMProblems";
import { ForeignLanguageProblemType } from "./foreignLanguage";
import { loadTemplatesForTeacher } from "@/pipeline/persistence/loadTemplate";

import { withTemplate } from "./templateCarrier";

const foreignLanguageProblemType = withTemplate(ForeignLanguageProblemType, "World Languages");

// Canonical source for all built-in templates.
export const allSystemProblemTypes = [
  ...mathProblemTypes.map((problemType) => problemType.template),
  ...englishProblemTypes.map((problemType) => problemType.template),
  ...historyProblemTypes.map((problemType) => problemType.template),
  ...scienceProblemTypes.map((problemType) => problemType.template),
  ...stemProblemTypes.map((problemType) => problemType.template),
  foreignLanguageProblemType.template,
] as const;

type SystemProblemType = (typeof allSystemProblemTypes)[number];

export const ProblemTypesRegistry = Object.fromEntries(
  allSystemProblemTypes.map((problemType) => [problemType.id, problemType])
) as Record<SystemProblemType["id"], SystemProblemType>;

export const systemProblemTypes = ProblemTypesRegistry;

export async function getAllProblemTypesForTeacher(teacherId: string) {
  const teacherTemplates = await loadTemplatesForTeacher(teacherId);
  return {
    system: allSystemProblemTypes,
    teacher: teacherTemplates,
  };
}

export type ProblemTypeId = keyof typeof ProblemTypesRegistry;
