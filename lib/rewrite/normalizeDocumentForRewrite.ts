type CandidateBlock = {
  itemNumber: number;
  lines: string[];
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isLikelyItemStart(line: string): RegExpMatchArray | null {
  return line.match(/^\s*(\d+)\s*[.)]?\s*(.*)$/);
}

/** Detect multiple-choice option lines: A. / A) / (A) / a. / a) */
function isChoiceLine(line: string): boolean {
  return /^\s*(?:\([A-Da-d]\)|[A-Da-d][.)]\s)/i.test(line);
}

function hasCompletePunctuation(text: string): boolean {
  return /[.?!]["')\]]?\s*$/.test(text);
}

function hasRepeatedFragment(text: string): boolean {
  return /\b(\w+(?:\W+\w+){2,})\W+\1\b/i.test(text);
}

function hasRepeatedNumbering(text: string): boolean {
  return /(\b\d+\s*[.)]\s*){2,}/.test(text);
}

function hasMissingKeyParts(text: string): boolean {
  const withoutPrefix = text.replace(/^\s*\d+\s*[.)]?\s*/, "");
  const words = withoutPrefix.split(/\s+/).filter(Boolean);
  const hasLetters = /[a-z]/i.test(withoutPrefix);
  return !hasLetters || words.length < 4;
}

function isNumberOnly(text: string): boolean {
  const withoutPrefix = text.replace(/^\s*\d+\s*[.)]?\s*/, "").trim();
  return withoutPrefix.length === 0;
}

/**
 * Normalise a bare item number so numbering is consistent:
 * "1.", "1)", "1 " → "1."
 */
function normalizeItemNumber(raw: string): string {
  return raw.replace(/^(\d+)\s*[.)]?\s*/, (_, n) => `${n}.`);
}

function scoreCandidate(lines: string[]): number {
  const lineCount = lines.length;
  const text = normalizeWhitespace(lines.join(" "));
  let score = 0;

  if (lineCount === 1) score += 2;
  if (hasCompletePunctuation(text)) score += 2;
  if (!hasRepeatedFragment(text)) score += 1;
  if (lineCount < 3) score += 1;
  if (hasRepeatedNumbering(text)) score -= 2;
  if (hasMissingKeyParts(text)) score -= 2;
  if (isNumberOnly(text)) score -= 3;

  return score;
}

function compareCandidates(a: string[], b: string[]): number {
  const scoreA = scoreCandidate(a);
  const scoreB = scoreCandidate(b);
  if (scoreA !== scoreB) return scoreB - scoreA;

  const textA = normalizeWhitespace(a.join(" "));
  const textB = normalizeWhitespace(b.join(" "));
  if (textA.length !== textB.length) return textB.length - textA.length;

  return a.length - b.length;
}

function extractCandidateBlocks(original: string): CandidateBlock[] {
  const lines = original.split(/\r?\n/);
  const blocks: CandidateBlock[] = [];
  let current: CandidateBlock | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current) current.lines.push("");
      continue;
    }

    // Skip standalone choice lines — they belong to the current stem
    if (isChoiceLine(line)) {
      if (current) current.lines.push(line);
      continue;
    }

    const start = isLikelyItemStart(line);
    if (start) {
      const itemNumber = Number(start[1]);
      current = { itemNumber, lines: [line] };
      blocks.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  return blocks;
}

function lineSetToCandidate(lines: string[]): string[] {
  const compact = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (compact.length === 0) return [];

  return compact;
}

/**
 * Group continuation paragraph lines together when they are clearly part of
 * the same item (no new item number, no choice marker, not blank-separated
 * from a previous non-blank line).
 * This pass runs on the raw string before block extraction so multi-line stems
 * (e.g. stimulus paragraphs) are preserved as a single unit.
 */
function pregroupMultiLineStems(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let pendingItem: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      // Blank line: flush pending, emit blank
      if (pendingItem !== null) {
        out.push(pendingItem);
        pendingItem = null;
      }
      out.push("");
      continue;
    }

    if (isChoiceLine(line)) {
      // Emit choice as-is; still logically part of previous item
      if (pendingItem !== null) {
        out.push(pendingItem);
        pendingItem = null;
      }
      out.push(line);
      continue;
    }

    const isNewItem = isLikelyItemStart(line);
    if (isNewItem) {
      if (pendingItem !== null) out.push(pendingItem);
      pendingItem = normalizeItemNumber(line);
    } else {
      // Continuation of previous item's stem — append without creating a new line
      if (pendingItem !== null) {
        pendingItem = `${pendingItem} ${line}`;
      } else {
        out.push(line);
      }
    }
  }

  if (pendingItem !== null) out.push(pendingItem);
  return out.join("\n");
}

export function normalizeDocumentForRewrite(original: string): string {
  // Pre-pass 1: remove consecutive identical paragraphs (common duplication source)
  const dedupedOriginal = original
    .split(/\n{2,}/)
    .filter((para, idx, arr) => idx === 0 || para.trim() !== arr[idx - 1].trim())
    .join("\n\n");

  // Pre-pass 2: group multi-line stems and normalise numbering
  const preGrouped = pregroupMultiLineStems(dedupedOriginal);

  const blocks = extractCandidateBlocks(preGrouped);
  if (blocks.length === 0) {
    return preGrouped.trim();
  }

  const candidatesByNumber = new Map<number, string[][]>();

  for (const block of blocks) {
    const candidate = lineSetToCandidate(block.lines);
    if (candidate.length === 0) continue;

    const existing = candidatesByNumber.get(block.itemNumber) ?? [];
    const text = normalizeWhitespace(candidate.join(" "));
    const duplicate = existing.some(
      (candidateLines) => normalizeWhitespace(candidateLines.join(" ")) === text,
    );
    if (!duplicate) {
      existing.push(candidate);
    }
    candidatesByNumber.set(block.itemNumber, existing);
  }

  const orderedNumbers = Array.from(candidatesByNumber.keys()).sort((a, b) => a - b);
  const normalizedItems: string[] = [];

  for (const itemNumber of orderedNumbers) {
    const candidates = candidatesByNumber.get(itemNumber) ?? [];
    if (candidates.length === 0) continue;

    const [best] = [...candidates].sort(compareCandidates);
    const joined = normalizeWhitespace(best.join(" "));
    const body = joined.replace(/^\s*\d+\s*[.)]?\s*/, "").trim();
    if (!body) continue;

    normalizedItems.push(`${itemNumber}. ${body}`);
  }

  if (normalizedItems.length === 0) {
    return preGrouped.trim();
  }

  return normalizedItems.join("\n\n");
}
