export interface PreparednessAlignmentV2 {
  prep_concepts: string[];
  prep_difficulty: number;
  test_items: PreparednessTestItemV2[];
  coverage_summary: PreparednessCoverageSummaryV2;
  teacher_summary: string;
}

export interface PreparednessTestItemV2 {
  question_number: number;
  question_text: string;
  concepts: string[];
  alignment: "covered" | "uncovered" | "misaligned";
  difficulty: number;
  explanation: string;
}

export interface PreparednessCoverageSummaryV2 {
  covered_items: number[];
  misaligned_items: number[];
  uncovered_items: number[];
  overall_alignment: string;
}

export interface PreparednessReviewSnippetV2 {
  review_snippet: string;
}

export interface PreparednessRewriteQuestionV2 {
  rewritten_question: string;
}

export interface PreparednessRewriteToDifficultyV2 {
  rewritten_question: string;
}

export interface PreparednessPracticeItemV2 {
  practice_question: string;
  answer: string;
  explanation: string;
}

export interface PreparednessGeneratedReviewV2 {
  review_sections: PreparednessReviewSectionV2[];
  summary: string;
}

export interface PreparednessReviewSectionV2 {
  title: string;
  explanation: string;
  example?: string;
}

export interface PreparednessGeneratedTestV2 {
  test_items: PreparednessGeneratedTestItemV2[];
  test_summary: string;
}

export interface PreparednessGeneratedTestItemV2 {
  question_number: number;
  question_text: string;
  answer: string;
  explanation: string;
}