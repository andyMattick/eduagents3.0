import { getParentStem, isLetteredLine, shouldTreatAsMultipartSubItem } from "./subItemHeuristics";

export function detectMultiPart(text: string): boolean {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parentStem = getParentStem(text);

  const subItemCount = lines
    .filter((line) => isLetteredLine(line))
    .filter((line) => shouldTreatAsMultipartSubItem(line, parentStem))
    .length;

  return subItemCount > 0;
}