import { UI_PROBLEM_TYPES } from "./uiProblemTypes";
import { SUBJECT_GRADE_PROBLEM_TYPES } from "./subjectGradeProblemTypeMap";

export function getProblemTypesForSubjectAndGrade(
  subject: string,
  grade: string
) {
  const subjectMap = SUBJECT_GRADE_PROBLEM_TYPES[subject];
  if (!subjectMap) return [];

  const allowed = subjectMap[grade] ?? [];
  return UI_PROBLEM_TYPES.filter((pt) => allowed.includes(pt.id));
}
