export function looksLikeBinaryPayload(text: string): boolean {
  if (!text) {
    return false;
  }

  const hasZipMarkers =
    text.includes("PK\u0003\u0004") ||
    (text.includes("[Content_Types].xml") && text.includes("word/document.xml"));
  const hasControlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text);

  return hasZipMarkers || (hasControlChars && text.includes("PK"));
}

export function containsExtractionArtifacts(text: string): boolean {
  if (!text) {
    return false;
  }

  return [
    "PK",
    "��",
    "<w:document",
    "<Relationships",
    "<w:p>",
    "<w:t>",
    "<w:tab",
    "<w:rPr",
    "<w:sz",
    "<w:fonts",
    "<w:pPr",
  ].some((marker) => text.includes(marker));
}

export function isMostlyPrintable(text: string): boolean {
  if (!text) {
    return false;
  }

  const printable = text.match(/[\x20-\x7E\n\r\t]/g)?.length ?? 0;
  return printable / text.length >= 0.9;
}

export function normalizeParagraphs(paragraphs: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const paragraph of paragraphs) {
    const cleaned = paragraph
      .replace(/<[^>]+>/g, " ")
      .replace(/w:numPr|w:ilvl|w:fldSimple|w:instrText/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned || containsExtractionArtifacts(cleaned)) {
      continue;
    }

    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(cleaned);
  }

  return normalized;
}