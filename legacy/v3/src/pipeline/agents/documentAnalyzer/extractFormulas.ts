export function extractFormulas(text: string): string[] {
  const matches = text.match(/\b(?:\d+\s*[+\-*/=]\s*\d+|[A-Za-z]\^\d|sqrt\([^)]*\)|\b\w+\s*=\s*\w+)\b/g) ?? [];
  const filtered = matches
    .map((value) => value.trim())
    .filter((value) => !/(?:xml|docprops|customxml|rels)/i.test(value))
    .filter((value) => /[A-Za-z0-9]/.test(value));

  return Array.from(new Set(filtered)).slice(0, 25);
}
