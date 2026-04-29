import type { SimulationItem } from "./SimulationItem";

export interface SubSubPartEntry {
  label: string;
  text: string;
}

export interface SimulationSubItem extends SimulationItem {
  /** Stable identifier for a sub-item, e.g. item-1a. */
  itemId?: string;
  /** Multipart group identifier, usually the parent item number. */
  groupId?: string;
  /** Stable per-group part index where a=1, b=2, etc. */
  partIndex?: number;
  /**
   * Single letter identifier for this sub-item ("a", "b", ..., "f").
   * Present when produced by the hierarchical line walker.
   */
  letter?: string;
  /**
   * Nested sub-subparts (Type I/II, roman numerals, named blocks, bullets).
   * Present only when the source document has sub-sub-level structure.
   */
  subSubParts?: SubSubPartEntry[];
}

export interface SimulationItemTree {
  item: SimulationItem;
  /** Backward-compatible flat array; elements may carry subSubParts metadata. */
  subItems?: SimulationSubItem[];
  distractors?: { label: string; text: string }[];
}