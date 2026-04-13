/**
 * Preparedness report models for reverse alignment and final report synthesis.
 *
 * Option B: concept frequency + difficulty distribution, no Bloom, no long text.
 */

import type { ConceptItem } from "./PreparednessAlignment";

export type ReverseAlignmentStatus =
  | "aligned"
  | "review_above_test"
  | "review_below_test"
  | "not_used_in_test";

export interface ReverseAlignmentEvidence {
  assessmentItemNumber: number;
  difficulty: number;  // 1–5 test difficulty
  alignment: ReverseAlignmentStatus;
}

export interface ReverseAlignmentRecord {
  prepItemNumber: number;
  concepts: ConceptItem[];
  prepDifficulty: number; // 1–5
  testEvidence: ReverseAlignmentEvidence[];
}

export type ReverseAlignmentResult = ReverseAlignmentRecord[];

export interface PreparednessReportResult {
  section1: unknown[];
  section2: unknown[];
  section3: unknown[];
  section4: string[];
  fullText: string;
}
