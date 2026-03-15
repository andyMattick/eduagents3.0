import { UI_PROBLEM_TYPES } from "./uiProblemTypes";

export function getSupportsForUIProblemType(id: string): string[] {
  const pt = UI_PROBLEM_TYPES.find((p) => p.id === id);
  return pt?.supports ?? [];
}
