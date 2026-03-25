const BAD_MARKERS = ["pk", "rels", "xml", "docprops", "customxml", "word/_rels", "<?xml"];

function ratio(count: number, total: number): number {
  if (total <= 0) return 0;
  return count / total;
}

export interface ValidationResult {
  cleanedText: string;
  unreadable: boolean;
  reasons: string[];
}

export function validateExtractedText(rawInput: string): ValidationResult {
  const raw = String(rawInput ?? "");
  const reasons: string[] = [];

  if (!raw.trim()) {
    return { cleanedText: "", unreadable: true, reasons: ["empty_text"] };
  }

  const chars = [...raw];
  const nonPrintableCount = chars.filter((ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 && ch !== "\n" && ch !== "\r" && ch !== "\t";
  }).length;

  if (ratio(nonPrintableCount, chars.length) > 0.2) {
    reasons.push("non_printable_ratio");
  }

  if (/<\/?[a-z][^>]*>/i.test(raw)) {
    reasons.push("xml_tags");
  }

  if (/(?:\bword\/|docprops|customxml|_rels|numbering\.xml|styles\.xml)/i.test(raw)) {
    reasons.push("docx_metadata");
  }

  if (/(.{1})\1{9,}/.test(raw)) {
    reasons.push("repeated_control_sequences");
  }

  const alphaWords = raw.match(/[A-Za-z]{2,}/g) ?? [];
  if (alphaWords.length === 0) {
    reasons.push("no_alpha_words");
  }

  const lower = raw.toLowerCase();
  const markerHits = BAD_MARKERS.reduce((count, marker) => count + (lower.includes(marker) ? 1 : 0), 0);
  if (ratio(markerHits, BAD_MARKERS.length) > 0.05) {
    reasons.push("container_marker_density");
  }

  const cleanedText = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    cleanedText,
    unreadable: reasons.length > 0,
    reasons,
  };
}
