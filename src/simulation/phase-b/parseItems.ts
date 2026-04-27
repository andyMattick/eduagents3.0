export type ParsedItemType = "mc" | "free_response" | "multipart_parent" | "multipart_child" | "other";

export type ParsedItem = {
  id: string;
  itemNumber: number | null;
  logicalLabel: string;
  groupId: number;
  isParent: boolean;
  partIndex: number;
  text: string;
  type: ParsedItemType;
  confidence: number;
  children?: ParsedItem[];
};

export type PhaseBResult = {
  documentId: string;
  items: ParsedItem[];
  documentConfidence: number;
};

export const PARENT_REGEX = /^\s*(\d+)[\.)](?:\s+|$)/;
export const LETTERED_REGEX = /^\s*\(?([a-zA-Z])\)?[\.)](?:\s+|$)/;
export const VERB_REGEX = /\b(identify|determine|interpret|explain|calculate|find|solve|justify|evaluate|compare|describe|choose|select|compute|state|write|graph|prove|show|analyze|summarize|infer|support)\b/i;

export const MC_STEM_PHRASES = [
  "which of the following",
  "what is",
  "which statement",
  "which choice",
  "which option",
  "the correct answer",
  "is closest to",
  "is approximately",
  "is most likely",
  "is least likely",
  "best describes",
  "best explains",
  "best represents",
  "would most likely",
  "would least likely",
  "the value of",
  "the result of",
  "the effect of",
  "the outcome of",
  "the purpose of",
  "the main idea",
  "the central idea",
  "the author most likely",
  "the passage suggests",
  "the graph shows",
  "the table shows",
  "the figure shows",
] as const;

function sanitizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function shouldIgnoreLine(line: string): boolean {
  const t = line.trim().toLowerCase();
  return t.length === 0
    || /^notes?[:\-]?/.test(t)
    || /^table\s*\d*/.test(t);
}

function makeId(seed: string, index: number): string {
  return `${seed}-${index}`;
}

export function parentLooksLikeMCStem(parentText: string): boolean {
  const t = parentText.toLowerCase();
  return MC_STEM_PHRASES.some((phrase) => t.includes(phrase));
}

export function isSubItem(line: string, parent: { text: string } | null): boolean {
  const text = sanitizeLine(line);
  const candidateText = text.replace(LETTERED_REGEX, "").trim();
  const wordCount = candidateText.split(/\s+/).filter(Boolean).length;

  if (parent && parentLooksLikeMCStem(parent.text)) {
    return false;
  }

  if (VERB_REGEX.test(candidateText)) {
    return true;
  }

  if (wordCount > 8) {
    return true;
  }

  if (wordCount <= 8 && !VERB_REGEX.test(candidateText)) {
    if (parent && /[?]/.test(parent.text)) {
      return false;
    }
    if (parent && VERB_REGEX.test(parent.text)) {
      return false;
    }
  }

  return true;
}

export function refineItemTypes(items: ParsedItem[]): ParsedItem[] {
  return items.map((item) => {
    if (item.isParent && (item.children?.length ?? 0) > 0) {
      return { ...item, type: "multipart_parent" };
    }

    if (!item.isParent && item.type === "multipart_child") {
      return item;
    }

    if (item.isParent && parentLooksLikeMCStem(item.text)) {
      return { ...item, type: "mc" };
    }

    if (item.isParent) {
      return { ...item, type: "free_response" };
    }

    return item;
  });
}

export function computeItemConfidence(item: ParsedItem): number {
  let score = 1.0;

  if (!item.itemNumber) {
    score -= 0.2;
  }

  if (!parentLooksLikeMCStem(item.text) && (item.children?.length ?? 0) === 0 && item.isParent) {
    score -= 0.1;
  }

  if (item.text.split(/\s+/).length < 3) {
    score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

export function computeDocumentConfidence(items: ParsedItem[]): number {
  if (items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + computeItemConfidence(item), 0);
  return total / items.length;
}

export function parseItems(lines: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  let currentParent: ParsedItem | null = null;
  let groupCounter = 0;
  let idCounter = 0;
  let inAnswerKeyBlock = false;

  for (const rawLine of lines) {
    const line = sanitizeLine(rawLine);
    if (!line) {
      continue;
    }

    if (/^answer key[:\-]?/i.test(line) || /^answers?[:\-]?/i.test(line)) {
      inAnswerKeyBlock = true;
      continue;
    }

    if (inAnswerKeyBlock || shouldIgnoreLine(line)) {
      continue;
    }

    const parentMatch = line.match(PARENT_REGEX);
    const letterMatch = line.match(LETTERED_REGEX);

    if (parentMatch) {
      const number = Number(parentMatch[1]);
      groupCounter += 1;

      currentParent = {
        id: makeId("item", idCounter++),
        itemNumber: Number.isFinite(number) ? number : null,
        logicalLabel: Number.isFinite(number) ? String(number) : "",
        groupId: groupCounter,
        isParent: true,
        partIndex: 0,
        text: line,
        type: "mc",
        confidence: 1,
        children: [],
      };

      items.push(currentParent);
      continue;
    }

    if (letterMatch && currentParent) {
      if (isSubItem(line, currentParent)) {
        const letter = letterMatch[1].toLowerCase();
        const child: ParsedItem = {
          id: makeId("item", idCounter++),
          itemNumber: currentParent.itemNumber,
          logicalLabel: `${currentParent.itemNumber ?? ""}${letter}`,
          groupId: currentParent.groupId,
          isParent: false,
          partIndex: (currentParent.children?.length ?? 0) + 1,
          text: line,
          type: "multipart_child",
          confidence: 1,
        };

        currentParent.type = "multipart_parent";
        currentParent.children = [...(currentParent.children ?? []), child];
        items.push(child);
      }
      continue;
    }

    if (items.length > 0) {
      const tail = items[items.length - 1];
      if (tail) {
        tail.text = `${tail.text} ${line}`;
      }
    }
  }

  const refined = refineItemTypes(items);
  return refined.map((item) => ({ ...item, confidence: computeItemConfidence(item) }));
}

export function parsePhaseBResult(documentId: string, lines: string[]): PhaseBResult {
  const items = parseItems(lines);
  return {
    documentId,
    items,
    documentConfidence: computeDocumentConfidence(items),
  };
}
