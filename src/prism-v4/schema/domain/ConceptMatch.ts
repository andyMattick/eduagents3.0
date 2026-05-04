/* ─────────────────────────────────────────────────────────
   ConceptMatch v1 — Shared data contracts
   ───────────────────────────────────────────────────────── */

// ── Assessment items ──

export interface AssessmentItem {
  itemNumber: number;
  rawText: string;
  tags?: {
    concepts?: string[];
    contentComplexity?: number; // 1-5
  };
}

// ── Intel request / response ──

export interface ConceptMatchIntelRequest {
  prep: {
    title: string;
    rawText: string;
  };
  assessment: {
    title: string;
    items: AssessmentItem[];
  };
}

export interface ConceptStat {
  count: number;
  difficulties: number[];
  averageContentComplexity: number;
  questionNumbers: number[];
}

export interface PrepConceptStat {
  count: number;
  difficulties: number[];
  averageContentComplexity: number;
}

export interface ConceptCoverage {
  covered: string[];
  tooEasy: string[];
  missing: string[];
  tooFewTimes: string[];
}

export interface ConceptMatchIntelResponse {
  prepComplexity: number;
  testComplexity: number;
  testConceptStats: Record<string, ConceptStat>;
  prepConceptStats: Record<string, PrepConceptStat>;
  conceptCoverage: ConceptCoverage;
  teacherSummary?: string;
  enrichedItems?: AssessmentItem[];
  tokenUsage?: { used: number; remaining: number; limit: number };
}

// ── Teacher actions ──

export type TeacherActionTarget = "test" | "prep";

export type TeacherActionType =
  | "removeQuestions"
  | "addToReview"
  | "lowerDifficulty"
  | "raiseDifficulty"
  | "addExample"
  | "flagAiMissedConcept"
  | "flagDifficultyIncorrect";

export interface TeacherAction {
  concept: string;
  target: TeacherActionTarget;
  action: TeacherActionType;
  questionNumbers?: number[];
  comment?: string;
}

// ── Test evidence pop-up ──

export interface TestEvidenceItem {
  itemNumber: number;
  rawText: string;
  contentComplexity: number;
  concepts: string[];
}

export interface TestEvidenceResponse {
  concept: string;
  items: TestEvidenceItem[];
}

// ── Generate request / response ──

export interface ConceptMatchGenerateRequest {
  prep: {
    title: string;
    rawText: string;
  };
  assessment: {
    title: string;
    items: AssessmentItem[];
  };
  teacherActions: TeacherAction[];
  generate: {
    review: boolean;
    test: boolean;
  };
}

export interface DeltaEntry {
  target: "test" | "prep";
  description: string;
}

export interface ConceptMatchGenerateResponse {
  deltas: DeltaEntry[];
  original: {
    prepPdfUrl?: string;
    testPdfUrl?: string;
  };
  updated: {
    prepPdfUrl?: string;
    testPdfUrl?: string;
  };
  tokenUsage?: { used: number; remaining: number; limit: number };
}
