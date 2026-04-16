/* ─────────────────────────────────────────────────────────
   ConceptMatch v1 — Shared data contracts
   ───────────────────────────────────────────────────────── */

// ── Assessment items ──

export interface AssessmentItem {
  itemNumber: number;
  rawText: string;
  tags?: {
    concepts?: string[];
    difficulty?: number; // 1–5
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
  avgDifficulty: number;
  questionNumbers: number[];
}

export interface PrepConceptStat {
  count: number;
  difficulties: number[];
  avgDifficulty: number;
}

export interface ConceptCoverage {
  covered: string[];
  tooEasy: string[];
  missing: string[];
  tooFewTimes: string[];
}

export interface ConceptMatchIntelResponse {
  prepDifficulty: number;
  testDifficulty: number;
  testConceptStats: Record<string, ConceptStat>;
  prepConceptStats: Record<string, PrepConceptStat>;
  conceptCoverage: ConceptCoverage;
  enrichedItems?: AssessmentItem[];
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
  difficulty: number;
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
}
