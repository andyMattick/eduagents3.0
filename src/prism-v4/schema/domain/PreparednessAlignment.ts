/**
 * Preparedness Alignment — Domain model for assessment-to-prep document alignment analysis.
 *
 * Option B: concept frequency + difficulty distribution, fully hardened.
 * No sentences, no Bloom labels, no long text.
 */

export type AlignmentStatus =
  | "aligned"
  | "slightly_above"
  | "misaligned_above"
  | "missing_in_prep";

/**
 * A concept occurrence with frequency count and difficulty distribution.
 */
export interface ConceptItem {
  label: string;
  count: number;
  difficulties: number[]; // 1–5 per occurrence
}

/**
 * Alignment analysis for a single assessment item.
 */
export interface AlignmentRecord {
  assessmentItemNumber: number;
  concepts: ConceptItem[];
  difficulty: number; // 1–5 test difficulty
  prepDifficulty: number; // 1–5 prep difficulty
  alignment: AlignmentStatus;
}

/**
 * Complete alignment analysis result.
 */
export interface AlignmentResult {
  coveredItems: AlignmentRecord[];
  uncoveredItems: AlignmentRecord[];
}

/**
 * Input documents for alignment analysis.
 */
export interface AssessmentItem {
  itemNumber: number;
  text: string;
}

export interface AssessmentDocument {
  title?: string;
  items: AssessmentItem[];
}

export interface PrepDocument {
  title?: string;
  rawText: string; // full prep text
}
