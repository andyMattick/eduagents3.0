import { extractOptionsFromText, optionDedupeKey } from "./optionParsing";

export function extractDistractors(text: string): Array<{ label: string; text: string }> {
  const seen = new Set<string>();
  const options: Array<{ label: string; text: string }> = [];

  for (const parsed of extractOptionsFromText(text)) {
    const key = optionDedupeKey(parsed);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    options.push({ label: parsed.label, text: parsed.text });
  }

  return options;
}