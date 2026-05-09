import { extractOptionsFromText } from "./optionParsing";
import { getParentStem, isLetteredLine } from "./subItemHeuristics";

export function detectMultipleChoice(text: string): boolean {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parentStem = getParentStem(text);

  // Lettered options in separate paragraphs are treated as multipart sub-items.
  const separateParagraphChoices = lines.filter((line) => isLetteredLine(line));
  if (separateParagraphChoices.length > 0) {
    return false;
  }

  const sameParagraphChoices = parentStem.match(/\b\(?[A-Ea-e]\)?[\.)]\s+/g);
  if (sameParagraphChoices && sameParagraphChoices.length > 0) {
    return true;
  }

  const labels = new Set<string>();

  for (const parsed of extractOptionsFromText(text)) {
    labels.add(parsed.label);
  }

  return labels.size >= 3;
}