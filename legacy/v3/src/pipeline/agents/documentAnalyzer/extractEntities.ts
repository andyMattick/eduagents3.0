export function extractEntities(text: string): string[] {
  const entities = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b/g) ?? [];
  return Array.from(new Set(entities)).slice(0, 35);
}
