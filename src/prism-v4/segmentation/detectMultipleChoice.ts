import { extractOptionsFromText } from "./optionParsing";

export function detectMultipleChoice(text: string): boolean {
  const labels = new Set<string>();

  for (const parsed of extractOptionsFromText(text)) {
    labels.add(parsed.label);
  }

  return labels.size >= 3;
}