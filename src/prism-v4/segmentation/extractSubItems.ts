import { segmentText } from "./segmentLines";
import { generateItemId } from "./generateItemId";
import { getParentStem, parentLooksLikeMCStem } from "./subItemHeuristics";

type ExtractedSubItem = {
  itemNumber: number;
  text: string;
  letter: string;
  partIndex: number;
  groupId: string;
  logicalLabel: string;
  itemId: string;
  subSubParts: { label: string; text: string }[];
};

function partIndexFromLetter(letter: string): number {
  const normalized = letter.trim().toLowerCase();
  if (!/^[a-z]$/.test(normalized)) {
    return 0;
  }
  return normalized.charCodeAt(0) - 96;
}

function extractStableSubItems(text: string): ExtractedSubItem[] {
  const items = segmentText(text);
  if (items.length === 0) return [];

  const parent = items[0]!;
  const groupId = parent.id.trim() || "unlabeled";

  return parent.subItems
    .filter((si) => si.text.trim().length > 0 || si.subSubParts.some((ssp) => ssp.text.trim().length > 0))
    .map((si, index) => ({
      itemNumber: index + 1,
      text: buildSubItemFullText(si),
      letter: si.letter,
      partIndex: partIndexFromLetter(si.letter),
      groupId,
      logicalLabel: `${groupId}${si.letter}`,
      itemId: generateItemId(groupId, si.letter),
      subSubParts: si.subSubParts,
    }));
}

/**
 * Extract flat sub-items from a multi-line item text.
 * Shim over segmentLines; preserves the { itemNumber, text } contract
 * consumed by buildItemTree.
 *
 * If the text contains explicit parent-item numbering ("1.") we take
 * sub-items from the first segmented item; otherwise we treat the whole
 * block as a single un-numbered parent and return its sub-items.
 */
export function extractSubItems(text: string): Array<{ itemNumber: number; text: string; logicalLabel: string; itemId: string }> {
  // Guard: if parent looks like an MC stem, delegate to legacy path to
  // avoid treating answer choices as sub-items.
  const parentStem = getParentStem(text);
  if (parentLooksLikeMCStem(parentStem)) {
    return [];
  }

  return extractStableSubItems(text).map((sub) => ({
    itemNumber: sub.itemNumber,
    text: sub.text,
    logicalLabel: sub.logicalLabel,
    itemId: sub.itemId,
  }));
}

function buildSubItemFullText(si: { text: string; subSubParts: { label: string; text: string }[] }): string {
  if (si.subSubParts.length === 0) {
    return si.text;
  }
  const parts = si.subSubParts.map((ssp) => `${ssp.label} ${ssp.text}`.trim()).join(" ");
  return si.text ? `${si.text} ${parts}` : parts;
}

/**
 * Extended extraction that also returns nested sub-subpart structure.
 * Used by buildItemTree when richer tree data is needed.
 */
export function extractSubItemsWithNesting(text: string): Array<{
  itemNumber: number;
  text: string;
  letter: string;
  partIndex: number;
  groupId: string;
  logicalLabel: string;
  itemId: string;
  subSubParts: Array<{ label: string; text: string }>;
}> {
  const parentStem = getParentStem(text);
  if (parentLooksLikeMCStem(parentStem)) {
    return [];
  }

  return extractStableSubItems(text).map((sub) => ({
    itemNumber: sub.itemNumber,
    text: sub.text,
    letter: sub.letter,
    partIndex: sub.partIndex,
    groupId: sub.groupId,
    logicalLabel: sub.logicalLabel,
    itemId: sub.itemId,
    subSubParts: sub.subSubParts,
  }));
}