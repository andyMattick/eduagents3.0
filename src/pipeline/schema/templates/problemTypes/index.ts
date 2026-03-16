import { englishProblemTypes } from "./EnglishProblems";
import { historyProblemTypes } from "./HistoryProblems";
import { mathProblemTypes } from "./MathProblems";
import { scienceProblemTypes } from "./ScienceProblems";
import { stemProblemTypes } from "./STEMProblems";
import { ForeignLanguageProblemType } from "./foreignLanguage";
import { loadTemplatesForTeacher } from "../../../persistence/loadTemplate";

import { withTemplate } from "./templateCarrier";

const foreignLanguageProblemType = withTemplate(ForeignLanguageProblemType, "World Languages");

// Canonical source for all built-in templates.
export const allSystemProblemTypes = [
  ...mathProblemTypes.map((templateEntry) => templateEntry.template),
  ...englishProblemTypes.map((templateEntry) => templateEntry.template),
  ...historyProblemTypes.map((templateEntry) => templateEntry.template),
  ...scienceProblemTypes.map((templateEntry) => templateEntry.template),
  ...stemProblemTypes.map((templateEntry) => templateEntry.template),
  foreignLanguageProblemType.template,
] as const;

type SystemProblemType = (typeof allSystemProblemTypes)[number];

export const ProblemTypesRegistry = Object.fromEntries(
  allSystemProblemTypes.map((templateEntry) => [templateEntry.id, templateEntry])
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
