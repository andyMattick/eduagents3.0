/**
 * sectionGrouper.ts
 *
 * Groups generated items in the same order as the final printed document,
 * bucketed by question type (section).
 *
 * The grouping order follows the blueprint's slots array so the preview
 * always matches what will appear on paper — MCQ first if the Architect
 * put MCQ first, etc.
 *
 * Usage:
 *   const sections = groupItemsBySection(blueprint, items);
 *   // sections = { multipleChoice: [...], shortAnswer: [...], ... }
 */

import type { FinalAssessmentItem } from "./FinalAssessment";

/** A section bucket: an ordered list of items belonging to one questionType. */
export type SectionMap = Record<string, FinalAssessmentItem[]>;

/**
 * The ordered list of section names, mirroring blueprint slot order so the
 * preview renders sections in the same sequence as the printed document.
 */
export type SectionOrder = string[];

export interface GroupedSections {
  /** Map from questionType → items (in slot order). */
  sections: SectionMap;
  /** questionType names in the order they first appear in the blueprint. */
  sectionOrder: SectionOrder;
  /** Total slot count per questionType — used for progress denominators. */
  totalPerSection: Record<string, number>;
}

/**
 * Minimal blueprint shape consumed by this function — accepts either the
 * full Blueprint contract or the stripped-down builder input.
 */
interface BlueprintLike {
  plan?: {
    slots?: Array<{ id: string; questionType: string }>;
  };
  slots?: Array<{ id: string; questionType: string }>;
}

function getSlots(blueprint: BlueprintLike): Array<{ id: string; questionType: string }> {
  return blueprint?.plan?.slots ?? blueprint?.slots ?? [];
}

/**
 * Group `items` into sections ordered by their position in the blueprint.
 *
 * Items that don't match a slot (e.g. arrived before blueprint was set) are
 * appended to their questionType bucket at the end.
 */
export function groupItemsBySection(
  blueprint: BlueprintLike | null | undefined,
  items: FinalAssessmentItem[]
): GroupedSections {
  const slots = blueprint ? getSlots(blueprint) : [];

  // Build an ordered list of unique section names from blueprint slots
  const sectionOrder: string[] = [];
  const totalPerSection: Record<string, number> = {};
  for (const slot of slots) {
    const type = slot.questionType;
    if (!sectionOrder.includes(type)) sectionOrder.push(type);
    totalPerSection[type] = (totalPerSection[type] ?? 0) + 1;
  }

  // Build a slotId → index map for ordering items within each section
  const slotIndexMap = new Map(slots.map((s, i) => [s.id, i]));

  // Bucket items by questionType, preserving slot order within each section
  const sections: SectionMap = {};
  for (const type of sectionOrder) {
    sections[type] = [];
  }

  for (const item of items) {
    const type = item.questionType;
    if (!sections[type]) {
      // Type not in blueprint (shouldn't happen, but be safe)
      sections[type] = [];
      if (!sectionOrder.includes(type)) sectionOrder.push(type);
      totalPerSection[type] = totalPerSection[type] ?? 0;
    }
    sections[type].push(item);
  }

  // Sort items within each section by slot order
  for (const type of sectionOrder) {
    sections[type].sort((a, b) => {
      const idxA = slotIndexMap.get(a.slotId) ?? Infinity;
      const idxB = slotIndexMap.get(b.slotId) ?? Infinity;
      return idxA - idxB;
    });
  }

  return { sections, sectionOrder, totalPerSection };
}

/** Human-readable section header for a questionType camelCase key. */
export function formatSectionHeader(type: string): string {
  switch (type) {
    case "multipleChoice":      return "Multiple Choice";
    case "shortAnswer":         return "Short Answer";
    case "freeResponse":        return "Free Response";
    case "constructedResponse": return "Constructed Response";
    case "trueFalse":            return "True / False";
    case "arithmeticFluency":   return "Arithmetic Fluency";
    case "passageBased":        return "Reading Passage";
    case "graphInterpretation": return "Graph Interpretation";
    case "fillInTheBlank":      return "Fill in the Blank";
    case "matching":            return "Matching";
    default:
      // camelCase → Title Case fallback
      return type
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
  }
}
