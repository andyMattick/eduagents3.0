const LETTERED_LINE_REGEX = /^\s*\(?([a-hA-H])\)?[\.)](?:\s+|$)/;

const MC_STEM_PHRASES = [
  "which of the following",
  "what is",
  "which statement",
  "which choice",
  "which option",
  "the correct answer",
  "is closest to",
  "is approximately",
  "is most likely",
  "is least likely",
  "best describes",
  "best explains",
  "best represents",
  "would most likely",
  "would least likely",
  "the value of",
  "the result of",
  "the effect of",
  "the outcome of",
  "the purpose of",
  "the main idea",
  "the central idea",
  "the author most likely",
  "the passage suggests",
  "the graph shows",
  "the table shows",
  "the figure shows",
] as const;

const SUBITEM_VERB_REGEX = /\b(identify|determine|interpret|explain|calculate|find|solve|justify|evaluate|compare|describe|choose|select|compute|state|write|graph|prove|show|analyze|summarize|infer|support)\b/i;

export function isLetteredLine(line: string): boolean {
  return LETTERED_LINE_REGEX.test(line.trim());
}

export function stripLetteredPrefix(line: string): string {
  return line.replace(LETTERED_LINE_REGEX, "").trim();
}

export function getParentStem(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => !isLetteredLine(line)) ?? "";
}

export function parentLooksLikeMCStem(parentStem: string): boolean {
  const normalized = parentStem.toLowerCase();
  return MC_STEM_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function shouldTreatAsMultipartSubItem(line: string, parentStem: string): boolean {
  const candidate = stripLetteredPrefix(line);
  if (!candidate) {
    return false;
  }

  if (parentLooksLikeMCStem(parentStem)) {
    return false;
  }

  const wordCount = candidate.split(/\s+/).filter(Boolean).length;

  if (SUBITEM_VERB_REGEX.test(candidate)) {
    return true;
  }

  if (wordCount > 8) {
    return true;
  }

  return false;
}
