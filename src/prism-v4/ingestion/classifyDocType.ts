/**
 * classifyDocType.ts — Heuristic document type classifier
 *
 * Classifies a document as "problem", "notes", or "mixed" based on
 * structural signals in the text.  Intentionally cheap — no LLM call.
 * Can be upgraded to an LLM pass later without changing the contract.
 */

export type DocType = "problem" | "notes" | "mixed";

/**
 * Classify a document by analysing its textual structure.
 *
 * Signals for "problem":
 *   - Dense numbered lines  (^\d+[).]\s)
 *   - Many question marks at line ends
 *   - Short average line length (< 80 chars) with repetitive structure
 *
 * Signals for "notes":
 *   - Long paragraphs (> 120 chars)
 *   - Prose-style headings (Definition, Example, Note, Theorem)
 *   - Low density of numbered problem lines
 *
 * "mixed" when both signals are present above threshold.
 */
export function classifyDocType(text: string): DocType {
  if (!text || text.trim().length === 0) return "notes";

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let numberedCount = 0;      // lines like "1. …" or "3) …"
  let questionCount = 0;      // lines ending with "?"
  let paragraphCount = 0;     // lines > 120 chars (prose)
  let headingKeywords = 0;    // prose headings

  const headingPattern = /\b(definition|example|note|theorem|proof|introduction|overview|summary|section|chapter|unit)\b/i;

  for (const line of lines) {
    if (/^\d+[\).\]]\s+/.test(line)) numberedCount++;
    if (/\?\s*$/.test(line)) questionCount++;
    if (line.length > 120) paragraphCount++;
    if (headingPattern.test(line) && line.length < 80) headingKeywords++;
  }

  const problemScore = numberedCount + questionCount;
  const notesScore = paragraphCount + headingKeywords;

  // Both signals strong → mixed
  if (problemScore >= 5 && notesScore >= 3) return "mixed";

  // Primarily problems
  if (problemScore >= 5) return "problem";

  // Primarily notes/prose
  if (notesScore >= 3) return "notes";

  // For short docs: if any numbered items exist, call it a problem
  if (numberedCount > 0 || questionCount > 1) return "problem";

  // Default: notes (safer for rewrite — sections path always works)
  return "notes";
}
