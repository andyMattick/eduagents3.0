import { getParentStem, isLetteredLine, shouldTreatAsMultipartSubItem, stripLetteredPrefix } from "./subItemHeuristics";

export function extractSubItems(text: string): Array<{ itemNumber: number; text: string }> {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parentStem = getParentStem(text);

  return lines
    .filter((line) => isLetteredLine(line))
    .filter((line) => shouldTreatAsMultipartSubItem(line, parentStem))
    .map((line, index) => ({
      itemNumber: index + 1,
      text: stripLetteredPrefix(line),
    }));
}