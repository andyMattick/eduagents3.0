/**
 * FinalAssessment.ts
 *
 * The canonical output type of the Builder agent.
 * This is the Phase 1 artifact returned to the UI and persisted to history.
 */

export interface FinalAssessmentItem {
  /** 1-based display number */
  questionNumber: number;
  slotId: string;
  questionType: string;
  prompt: string;
  /** MCQ only */
  options?: string[];
  answer?: string;
  metadata?: Record<string, any>;
}

export interface FinalAssessment {
  /** Unique id for this assessment artifact */
  id: string;
  generatedAt: string; // ISO timestamp
  items: FinalAssessmentItem[];
  totalItems: number;
  /**
   * slotId → answer — optional; not computed at pipeline time.
   * Derive at export via: Object.fromEntries(items.map(i => [i.slotId, i.answer ?? ""]))
   */
  answerKey?: Record<string, string>;
  /** cognitiveDemand → count */
  metadata: {
    difficultyProfile?: string;
    orderingStrategy?: string;
    totalEstimatedTimeSeconds?: number;
    pacingSecondsPerItem?: number;
  };
}
