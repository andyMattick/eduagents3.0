/**
 * segmentLines.ts — Deterministic hierarchical line walker for PRISM v4 ingestion.
 *
 * Produces a three-level item tree:
 *   Parent item → Sub-item (lettered) → Sub-subpart (named/roman/numbered/lettered/bullet)
 *
 * Replaces the previous flat filter/map extraction strategy.
 * `extractSubItems` is now a thin shim over this module.
 */

export interface SubSubPart {
  /** Display label: "Type I", "i.", "(1)", "Consequence", "•", etc. */
  label: string;
  text: string;
}

export interface SegmentedSubItem {
  /** Letter-derived id within its parent: "a", "b", "f", etc. */
  letter: string;
  /** Raw label as it appeared in the source: "a)", "b.", "(c)", etc. */
  label: string;
  text: string;
  subSubParts: SubSubPart[];
}

export interface SegmentedItem {
  /** Numeric id string: "1", "2", "12", etc. */
  id: string;
  /** Raw label as it appeared in the source: "1.", "12.", etc. */
  label: string;
  stem: string;
  subItems: SegmentedSubItem[];
}

// ─── Regex patterns ────────────────────────────────────────────────────────────

const PARENT_ITEM_RE = /^([0-9]+)\./;
const SUB_ITEM_RE = /^\(?([a-zA-Z])\)?[.)]/;

/**
 * Sub-subpart patterns checked in priority order.
 * First match wins.
 */
const SUB_SUB_PATTERNS: { label: string; re: RegExp }[] = [
  // Named markers — check before roman/alphanumeric to avoid false positives
  { label: "Type I",         re: /^Type\s+I(?!\s*[IVX])\b/i },
  { label: "Type II",        re: /^Type\s+II\b/i },
  { label: "Type III",       re: /^Type\s+III\b/i },
  { label: "Consequence",    re: /^Consequence\b/i },
  { label: "Reason",         re: /^Reason\b/i },
  { label: "Explanation",    re: /^Explanation\b/i },
  { label: "Interpretation", re: /^Interpretation\b/i },
  { label: "Claim",          re: /^Claim\b/i },
  { label: "Evidence",       re: /^Evidence\b/i },
  // Roman numeral with period or paren
  { label: "Roman",          re: /^(x{0,3}(?:ix|iv|v?i{0,3}))[.)]\s/i },
  // Numbered: (1), 1), 1.
  { label: "Numbered",       re: /^\([0-9]+\)\s/ },
  { label: "Numbered",       re: /^[0-9]+[.)]\s/ },
  // Single lettered: (a), a.  — narrower than sub-item to avoid confusion
  { label: "Lettered",       re: /^\([a-z]\)\s/i },
  { label: "Lettered",       re: /^[a-z]\.\s/i },
  // Bullets
  { label: "Bullet",         re: /^[•\-–—]\s+/ },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function matchSubSubPart(line: string): { label: string; rest: string } | null {
  for (const { label, re } of SUB_SUB_PATTERNS) {
    const m = line.match(re);
    if (m) {
      const matched = m[0];
      // Use the literal matched text as label (trimmed) for display fidelity
      return { label: matched.trim() || label, rest: line.slice(matched.length).trim() };
    }
  }
  return null;
}

function flushEmptySubItems(subItems: SegmentedSubItem[]): SegmentedSubItem[] {
  return subItems.filter((si) => {
    const hasText = si.text.trim().length > 0;
    const hasNested = si.subSubParts.some((ssp) => ssp.text.trim().length > 0);
    return hasText || hasNested;
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Walk lines and emit a three-level item hierarchy.
 *
 * - Lines are right-trimmed but otherwise preserved.
 * - Blank lines are treated as conceptual boundaries; parsing continues.
 * - Continuation lines (un-prefixed) are appended to the most recent
 *   open text slot: sub-subpart > sub-item > parent stem.
 */
export function segmentLines(lines: string[]): SegmentedItem[] {
  const items: SegmentedItem[] = [];

  let currentItem: SegmentedItem | null = null;
  let currentSubItem: SegmentedSubItem | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");

    if (isBlank(line)) {
      // Blank lines close the active sub-subpart accumulation but not
      // the structural parent; continuation can still follow.
      continue;
    }

    // ── Parent item ───────────────────────────────────────────────────────
    const parentMatch = line.match(PARENT_ITEM_RE);
    if (parentMatch) {
      if (currentItem) {
        currentItem.subItems = flushEmptySubItems(currentItem.subItems);
        items.push(currentItem);
      }
      const label = `${parentMatch[1]}.`;
      currentItem = {
        id: parentMatch[1],
        label,
        stem: line.slice(label.length).trim(),
        subItems: [],
      };
      currentSubItem = null;
      continue;
    }

    // ── Sub-item (lettered) ───────────────────────────────────────────────
    const subItemMatch = line.match(SUB_ITEM_RE);
    if (subItemMatch) {
      // If there's no current parent item yet, create an implicit one from
      // context accumulated so far (common when caller passes item text
      // without a leading numeric prefix).
      if (!currentItem) {
        currentItem = { id: "", label: "", stem: "", subItems: [] };
      }
      const rawLabel = subItemMatch[0];          // e.g. "a)", "(b)", "c."
      const letter = subItemMatch[1].toLowerCase();
      currentSubItem = {
        letter,
        label: rawLabel,
        text: line.slice(rawLabel.length).trim(),
        subSubParts: [],
      };
      currentItem.subItems.push(currentSubItem);
      continue;
    }

    // ── Sub-subpart ───────────────────────────────────────────────────────
    if (currentSubItem) {
      const ssp = matchSubSubPart(line);
      if (ssp) {
        currentSubItem.subSubParts.push({ label: ssp.label, text: ssp.rest });
        continue;
      }

      // Continuation: append to deepest open slot
      const lastSsp = currentSubItem.subSubParts[currentSubItem.subSubParts.length - 1];
      if (lastSsp) {
        lastSsp.text += (lastSsp.text ? " " : "") + line.trim();
      } else {
        currentSubItem.text += (currentSubItem.text ? " " : "") + line.trim();
      }
      continue;
    }

    // ── Stem continuation ─────────────────────────────────────────────────
    // Also handles the first stem line that appears before any lettered sub-item
    // when no numeric parent prefix exists.
    if (!currentItem) {
      currentItem = { id: "", label: "", stem: line.trim(), subItems: [] };
    } else {
      currentItem.stem += (currentItem.stem ? " " : "") + line.trim();
    }
  }

  // Flush last item
  if (currentItem) {
    currentItem.subItems = flushEmptySubItems(currentItem.subItems);
    items.push(currentItem);
  }

  return items;
}

/**
 * Convenience: segment raw multi-line text into items.
 */
export function segmentText(text: string): SegmentedItem[] {
  return segmentLines(text.split(/\r?\n/));
}
