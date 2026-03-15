import { UI_PROBLEM_TYPES } from "./uiProblemTypes";
import { SUBJECT_PROBLEM_TYPES } from "./subjectProblemTypeMap";

export function getProblemTypesForSubject(subject: string) {
  const allowed = SUBJECT_PROBLEM_TYPES[subject] ?? SUBJECT_PROBLEM_TYPES["general"];
  return UI_PROBLEM_TYPES.filter((pt) => allowed.includes(pt.id));
}
