const STOP_WORDS = new Set([
  "because",
  "between",
  "through",
  "students",
  "question",
  "assessment",
  "worksheet",
]);

export function extractVocab(text: string): string[] {
  const words = text.match(/\b[A-Za-z]{6,}\b/g) ?? [];
  const vocab = words
    .map((word) => word.toLowerCase())
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word) => !/(?:xml|docprops|customxml|rels)/i.test(word));

  return Array.from(new Set(vocab)).slice(0, 40);
}
