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

export function normalizeDocumentForRewrite(original: string): string {
  // Pre-pass: remove consecutive identical paragraphs (common duplication source)
  const dedupedOriginal = original
    .split(/\n{2,}/)
    .filter((para, idx, arr) => idx === 0 || para.trim() !== arr[idx - 1].trim())
    .join("\n\n");

  const blocks = extractCandidateBlocks(dedupedOriginal);
  if (blocks.length === 0) {
    return dedupedOriginal.trim();
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
    return dedupedOriginal.trim();
  }

  return normalizedItems.join("\n\n");
}
