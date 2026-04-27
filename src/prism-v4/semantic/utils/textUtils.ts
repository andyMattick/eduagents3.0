const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "what",
  "which",
  "with",
]);

export function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function splitSentences(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function extractKeywords(text: string): string[] {
  const counts = new Map<string, number>();

  for (const token of normalizeWhitespace(text).toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length < 3 || STOP_WORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 20)
    .map(([token]) => token);
}

export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) {
    return 1;
  }

  const withoutTrailingE = cleaned.endsWith("e") ? cleaned.slice(0, -1) : cleaned;
  const matches = withoutTrailingE.match(/[aeiouy]+/g);
  return Math.max(1, matches ? matches.length : 1);
}

export function estimateReadingLevel(text: string): number | null {
  const sentences = splitSentences(text);
  const words = normalizeWhitespace(text).split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) {
    return null;
  }

  const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0);
  const fleschKincaid = 0.39 * (words.length / sentences.length) + 11.8 * (syllableCount / words.length) - 15.59;
  return Number(Math.max(0, Math.min(18, fleschKincaid)).toFixed(2));
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

