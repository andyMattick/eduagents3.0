import React from "react";

export interface ReviewSnippetEntry {
  questionNumber: number;
  reviewSnippet: string;
}

export interface RewrittenQuestionEntry {
  questionNumber: number;
  rewrittenQuestion: string;
}

export interface PracticeItemEntry {
  questionNumber: number;
  practiceQuestion: string;
  answer: string;
  explanation: string;
}

export interface GeneratedReviewPacket {
  review_sections: Array<{
    title: string;
    explanation: string;
    example?: string;
  }>;
  summary: string;
}

export interface GeneratedTestPacket {
  test_items: Array<{
    question_number: number;
    question_text: string;
    answer: string;
    explanation: string;
  }>;
  test_summary: string;
}
