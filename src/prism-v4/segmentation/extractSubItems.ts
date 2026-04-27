import { segmentText } from "./segmentLines";
import { getParentStem, parentLooksLikeMCStem } from "./subItemHeuristics";

/**
 * Extract flat sub-items from a multi-line item text.
 * Shim over segmentLines; preserves the { itemNumber, text } contract
 * consumed by buildItemTree.
 *
 * If the text contains explicit parent-item numbering ("1.") we take
 * sub-items from the first segmented item; otherwise we treat the whole
 * block as a single un-numbered parent and return its sub-items.
 */
export function extractSubItems(text: string): Array<{ itemNumber: number; text: string }> {
  // Guard: if parent looks like an MC stem, delegate to legacy path to
  // avoid treating answer choices as sub-items.
  const parentStem = getParentStem(text);
  if (parentLooksLikeMCStem(parentStem)) {
    return [];
  }

  const items = segmentText(text);

  let subItems: { letter: string; text: string; subSubParts: { label: string; text: string }[] }[];

  if (items.length > 0) {
    // Use sub-items from the first parsed parent block.
    subItems = items[0].subItems;
  } else {
    return [];
  }

  return subItems
    .filter((si) => si.text.trim().length > 0 || si.subSubParts.some((ssp) => ssp.text.trim().length > 0))
    .map((si, index) => ({
      itemNumber: index + 1,
      // Include sub-subpart text appended to the sub-item text so that
      // downstream metric computation sees the full item body.
      text: buildSubItemFullText(si),
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
  subSubParts: Array<{ label: string; text: string }>;
}> {
  const parentStem = getParentStem(text);
  if (parentLooksLikeMCStem(parentStem)) {
    return [];
  }

  const items = segmentText(text);
  if (items.length === 0) return [];

  return items[0].subItems
    .filter((si) => si.text.trim().length > 0 || si.subSubParts.some((ssp) => ssp.text.trim().length > 0))
    .map((si, index) => ({
      itemNumber: index + 1,
      text: si.text,
      letter: si.letter,
      subSubParts: si.subSubParts,
    }));
}