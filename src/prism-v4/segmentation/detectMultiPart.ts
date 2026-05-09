import { getParentStem, isLetteredLine, shouldTreatAsMultipartSubItem } from "./subItemHeuristics";

export function detectMultiPart(text: string): boolean {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parentStem = getParentStem(text);

  // If lettered entries appear as separate lines after the parent stem,
  // treat them as multipart children rather than MC distractors.
  const separateParagraphChoices = lines.filter((line) => isLetteredLine(line));
  if (separateParagraphChoices.length > 0) {
    return true;
  }

  const subItemCount = lines
    .filter((line) => isLetteredLine(line))
    .filter((line) => shouldTreatAsMultipartSubItem(line, parentStem))
    .length;

  return subItemCount > 0;
}