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

interface ReviewBuilderPanelProps {
  reviewSnippets: ReviewSnippetEntry[];
  rewrittenQuestions: RewrittenQuestionEntry[];
  practiceItems: PracticeItemEntry[];
  generatedReview: GeneratedReviewPacket | null;
  generatedTest: GeneratedTestPacket | null;
  isGeneratingReview: boolean;
  isGeneratingTest: boolean;
  onGenerateReview: () => void;
  onGenerateTest: () => void;
  onClearAll: () => void;
}

export default function ReviewBuilderPanel({
  reviewSnippets,
  rewrittenQuestions,
  practiceItems,
  generatedReview,
  generatedTest,
  isGeneratingReview,
  isGeneratingTest,
  onGenerateReview,
  onGenerateTest,
  onClearAll,
}: ReviewBuilderPanelProps) {
  return (
    <aside className="prep-detail-box" style={{ margin: 0 }}>
      <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem" }}>Review Builder</h3>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={onGenerateReview} disabled={isGeneratingReview}>
          {isGeneratingReview ? "Generating Review..." : "Generate New Review"}
        </button>
        <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={onGenerateTest} disabled={isGeneratingTest}>
          {isGeneratingTest ? "Generating Test..." : "Generate New Test"}
        </button>
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <section>
          <h4 style={{ margin: "0 0 0.35rem 0" }}>Review Snippets</h4>
          {reviewSnippets.length === 0 ? <p style={{ margin: 0, color: "#94a3b8" }}>No snippets yet.</p> : null}
          {reviewSnippets.map((entry) => <p key={`snippet-${entry.questionNumber}`} style={{ margin: "0.35rem 0", color: "#334155" }}><strong>Q{entry.questionNumber}:</strong> {entry.reviewSnippet}</p>)}
        </section>

        <section>
          <h4 style={{ margin: "0 0 0.35rem 0" }}>Rewritten Questions</h4>
          {rewrittenQuestions.length === 0 ? <p style={{ margin: 0, color: "#94a3b8" }}>No rewritten questions yet.</p> : null}
          {rewrittenQuestions.map((entry) => <p key={`rewrite-${entry.questionNumber}`} style={{ margin: "0.35rem 0", color: "#334155" }}><strong>Q{entry.questionNumber}:</strong> {entry.rewrittenQuestion}</p>)}
        </section>

        <section>
          <h4 style={{ margin: "0 0 0.35rem 0" }}>Practice Items</h4>
          {practiceItems.length === 0 ? <p style={{ margin: 0, color: "#94a3b8" }}>No practice items yet.</p> : null}
          {practiceItems.map((entry) => (
            <div key={`practice-${entry.questionNumber}`} style={{ marginBottom: "0.5rem" }}>
              <p style={{ margin: "0.2rem 0", color: "#334155" }}><strong>Q{entry.questionNumber}:</strong> {entry.practiceQuestion}</p>
              <p style={{ margin: "0.2rem 0", color: "#475569" }}><strong>Answer:</strong> {entry.answer}</p>
              <p style={{ margin: "0.2rem 0", color: "#475569" }}><strong>Explanation:</strong> {entry.explanation}</p>
            </div>
          ))}
        </section>

        <section>
          <h4 style={{ margin: "0 0 0.35rem 0" }}>Generated Review Packet</h4>
          {!generatedReview ? <p style={{ margin: 0, color: "#94a3b8" }}>No generated review packet yet.</p> : null}
          {generatedReview ? (
            <>
              <p style={{ margin: "0.3rem 0", color: "#334155" }}><strong>Summary:</strong> {generatedReview.summary || "No summary provided."}</p>
              {generatedReview.review_sections.map((section, index) => (
                <div key={`generated-review-${index}`} style={{ marginBottom: "0.5rem" }}>
                  <p style={{ margin: "0.2rem 0", color: "#334155" }}><strong>{section.title}</strong></p>
                  <p style={{ margin: "0.2rem 0", color: "#475569" }}>{section.explanation}</p>
                  {section.example ? <p style={{ margin: "0.2rem 0", color: "#64748b" }}><strong>Example:</strong> {section.example}</p> : null}
                </div>
              ))}
            </>
          ) : null}
        </section>

        <section>
          <h4 style={{ margin: "0 0 0.35rem 0" }}>Generated Test</h4>
          {!generatedTest ? <p style={{ margin: 0, color: "#94a3b8" }}>No generated test yet.</p> : null}
          {generatedTest ? (
            <>
              <p style={{ margin: "0.3rem 0", color: "#334155" }}><strong>Summary:</strong> {generatedTest.test_summary || "No summary provided."}</p>
              {generatedTest.test_items.map((item) => (
                <div key={`generated-test-${item.question_number}`} style={{ marginBottom: "0.5rem" }}>
                  <p style={{ margin: "0.2rem 0", color: "#334155" }}><strong>Q{item.question_number}:</strong> {item.question_text}</p>
                  <p style={{ margin: "0.2rem 0", color: "#475569" }}><strong>Answer:</strong> {item.answer}</p>
                  <p style={{ margin: "0.2rem 0", color: "#64748b" }}><strong>Explanation:</strong> {item.explanation}</p>
                </div>
              ))}
            </>
          ) : null}
        </section>
      </div>

      <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={onClearAll}>
          Clear All
        </button>
      </div>
    </aside>
  );
}
