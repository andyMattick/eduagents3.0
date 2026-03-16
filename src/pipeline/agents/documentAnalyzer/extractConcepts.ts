function cleanPhrase(value: string): string {
  return value
    .replace(/[^A-Za-z0-9\s-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isSemanticPhrase(value: string): boolean {
  const cleaned = cleanPhrase(value);
  if (!cleaned) return false;
  if (/[<>]/.test(cleaned)) return false;
  if (/(?:word\/|docprops|customxml|_rels|xml)/i.test(cleaned)) return false;
  const symbolRatio = (cleaned.match(/[^A-Za-z0-9\s]/g) ?? []).length / Math.max(cleaned.length, 1);
  if (symbolRatio > 0.3) return false;
  return /[A-Za-z]{3,}/.test(cleaned);
}

export function extractConcepts(text: string): string[] {
  const candidates = text
    .split(/\r?\n|\.|\?|!/)
    .map((line) => cleanPhrase(line))
    .filter((line) => line.length >= 8 && line.length <= 100)
    .filter(isSemanticPhrase);

  return Array.from(new Set(candidates)).slice(0, 30);
}
