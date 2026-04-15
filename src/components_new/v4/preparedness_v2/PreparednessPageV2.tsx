import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AssessmentDocument, PrepDocument } from "../../../prism-v4/schema/domain/Preparedness";
import {
  generatePreparednessReviewPacket,
  generatePreparednessTestFromReview,
  generatePreparednessPracticeItem,
  generatePreparednessReviewSnippet,
  getAlignment,
  rewritePreparednessQuestion,
  rewritePreparednessQuestionToDifficulty,
  type AlignmentResponse,
} from "../../../services_new/preparednessService";
import AlignmentTableV2, { type AlignmentItemV2 } from "./AlignmentTableV2";
import PreparednessDebugPanel from "./PreparednessDebugPanel";
import ReviewBuilderPanel, {
  type GeneratedReviewPacket,
  type GeneratedTestPacket,
  type PracticeItemEntry,
  type ReviewSnippetEntry,
  type RewrittenQuestionEntry,
} from "./ReviewBuilderPanel";
import TeacherSummaryCard from "./TeacherSummaryCard";
import { type TeacherAction } from "./TeacherActionMenu";
import "../v4.css";

interface PreparednessPageV2Props {
  prep: PrepDocument;
  assessment: AssessmentDocument;
}

type AlignmentCandidate = Partial<AlignmentResponse> & {
  alignment?: Partial<AlignmentResponse> | null;
  alignmentResults?: Partial<AlignmentResponse> | null;
  preparedness?: (Partial<AlignmentResponse> & {
    alignment?: Partial<AlignmentResponse> | null;
    alignmentResults?: Partial<AlignmentResponse> | null;
  }) | null;
};

function normalizeAlignmentResponse(payload: unknown): AlignmentResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as AlignmentCandidate;
  const nestedPreparedness = candidate.preparedness ?? null;
  const base = candidate.alignment
    ?? candidate.alignmentResults
    ?? nestedPreparedness?.alignment
    ?? nestedPreparedness?.alignmentResults
    ?? nestedPreparedness
    ?? candidate;

  if (!base || typeof base !== "object") {
    return null;
  }

  const normalizedBase = base as Partial<AlignmentResponse>;
  const coveredItems = Array.isArray(normalizedBase.coveredItems) ? normalizedBase.coveredItems : [];
  const uncoveredItems = Array.isArray(normalizedBase.uncoveredItems) ? normalizedBase.uncoveredItems : [];
  const debug = normalizedBase.debug ?? candidate.debug ?? nestedPreparedness?.debug;

  if (!coveredItems.length && !uncoveredItems.length && !debug?.testItems?.length) {
    return null;
  }

  return {
    ...normalizedBase,
    coveredItems,
    uncoveredItems,
    ...(debug ? { debug } : {}),
  } as AlignmentResponse;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) {
      return message;
    }
  }

  return fallback;
}

function mapAlignmentItems(alignment: AlignmentResponse, assessment: AssessmentDocument): AlignmentItemV2[] {
  if (alignment.debug?.testItems?.length) {
    return alignment.debug.testItems.map((item) => ({
      questionNumber: item.questionNumber,
      questionText: item.questionText,
      concepts: item.concepts,
      alignment: item.alignment,
      difficulty: item.difficulty,
      explanation: item.explanation,
    }));
  }

  const covered = new Map((alignment.coveredItems ?? []).map((item) => [item.assessmentItemNumber, item]));
  const uncovered = new Set((alignment.uncoveredItems ?? []).map((item) => item.assessmentItemNumber));
  return assessment.items.map((item) => {
    const record = covered.get(item.itemNumber);
    const inferredAlignment = record
      ? record.alignment === "misaligned_above"
        ? "misaligned"
        : "covered"
      : uncovered.has(item.itemNumber)
      ? "uncovered"
      : "uncovered";
    return {
      questionNumber: item.itemNumber,
      questionText: item.text,
      concepts: record?.concepts.map((concept) => concept.label) ?? [],
      alignment: inferredAlignment,
      difficulty: record?.difficulty ?? 1,
      explanation: "",
    };
  });
}

export default function PreparednessPageV2({ prep, assessment }: PreparednessPageV2Props) {
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingByQuestion, setLoadingByQuestion] = useState<Record<number, boolean>>({});
  const [reviewSnippets, setReviewSnippets] = useState<ReviewSnippetEntry[]>([]);
  const [rewrittenQuestions, setRewrittenQuestions] = useState<RewrittenQuestionEntry[]>([]);
  const [practiceItems, setPracticeItems] = useState<PracticeItemEntry[]>([]);
  const [generatedReview, setGeneratedReview] = useState<GeneratedReviewPacket | null>(null);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTestPacket | null>(null);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = normalizeAlignmentResponse(await getAlignment(prep, assessment));
        if (!active) return;

        if (!result) {
          setAlignment(null);
          setError("Preparedness alignment is still loading or returned an unexpected shape.");
          return;
        }

        setAlignment(result);
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err, "Failed to load preparedness alignment"));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [prep, assessment]);

  const items = useMemo(() => (alignment ? mapAlignmentItems(alignment, assessment) : []), [alignment, assessment]);
  const hasAlignment = items.length > 0;

  const handleAction = useCallback(async (item: AlignmentItemV2, action: TeacherAction) => {
    if (action === "keep") {
      return;
    }

    setLoadingByQuestion((prev) => ({ ...prev, [item.questionNumber]: true }));
    setError(null);

    try {
      if (action === "add_review") {
        const result = await generatePreparednessReviewSnippet(item.questionText, item.concepts);
        setReviewSnippets((prev) => [
          ...prev.filter((entry) => entry.questionNumber !== item.questionNumber),
          { questionNumber: item.questionNumber, reviewSnippet: result.review_snippet },
        ]);
      }

      if (action === "rewrite") {
        const teacherNotes = window.prompt("Teacher instructions for rewrite:", "Keep objective, improve clarity") ?? "";
        if (!teacherNotes.trim()) {
          return;
        }
        const result = await rewritePreparednessQuestion(item.questionText, teacherNotes);
        setRewrittenQuestions((prev) => [
          ...prev.filter((entry) => entry.questionNumber !== item.questionNumber),
          { questionNumber: item.questionNumber, rewrittenQuestion: result.rewritten_question },
        ]);
      }

      if (action === "rewrite_to_prep") {
        const prepDifficulty = Math.min(5, Math.max(1, Math.round(alignment?.debug?.prepDifficulty ?? 3)));
        const result = await rewritePreparednessQuestionToDifficulty(item.questionText, prepDifficulty);
        setRewrittenQuestions((prev) => [
          ...prev.filter((entry) => entry.questionNumber !== item.questionNumber),
          { questionNumber: item.questionNumber, rewrittenQuestion: result.rewritten_question },
        ]);
      }

      if (action === "rewrite_easier") {
        const targetDifficulty = Math.max(1, item.difficulty - 1);
        const result = await rewritePreparednessQuestionToDifficulty(item.questionText, targetDifficulty);
        setRewrittenQuestions((prev) => [
          ...prev.filter((entry) => entry.questionNumber !== item.questionNumber),
          { questionNumber: item.questionNumber, rewrittenQuestion: result.rewritten_question },
        ]);
      }

      if (action === "rewrite_harder") {
        const targetDifficulty = Math.min(5, item.difficulty + 1);
        const result = await rewritePreparednessQuestionToDifficulty(item.questionText, targetDifficulty);
        setRewrittenQuestions((prev) => [
          ...prev.filter((entry) => entry.questionNumber !== item.questionNumber),
          { questionNumber: item.questionNumber, rewrittenQuestion: result.rewritten_question },
        ]);
      }

      if (action === "practice") {
        const result = await generatePreparednessPracticeItem(item.questionText, item.concepts);
        setPracticeItems((prev) => [
          ...prev.filter((entry) => entry.questionNumber !== item.questionNumber),
          {
            questionNumber: item.questionNumber,
            practiceQuestion: result.practice_question,
            answer: result.answer,
            explanation: result.explanation,
          },
        ]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Preparedness teacher action failed"));
    } finally {
      setLoadingByQuestion((prev) => ({ ...prev, [item.questionNumber]: false }));
    }
  }, []);

  const handleGenerateReview = useCallback(async () => {
    if (!items.length) {
      return;
    }

    setIsGeneratingReview(true);
    setError(null);
    try {
      const result = await generatePreparednessReviewPacket(
        items.map((item) => ({
          question_number: item.questionNumber,
          question_text: item.questionText,
          concepts: item.concepts,
          alignment: item.alignment,
          difficulty: item.difficulty,
          explanation: item.explanation,
        }))
      );
      setGeneratedReview(result);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to generate review packet"));
    } finally {
      setIsGeneratingReview(false);
    }
  }, [items]);

  const handleGenerateTest = useCallback(async () => {
    setIsGeneratingTest(true);
    setError(null);
    try {
      const reviewConcepts = generatedReview?.review_sections?.length
        ? generatedReview.review_sections
        : (alignment?.debug?.prepConcepts ?? []);

      if (!reviewConcepts.length) {
        setError("Generate a review packet first, or run alignment with detectable prep concepts.");
        return;
      }

      const result = await generatePreparednessTestFromReview(reviewConcepts);
      setGeneratedTest(result);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to generate test"));
    } finally {
      setIsGeneratingTest(false);
    }
  }, [alignment?.debug?.prepConcepts, generatedReview?.review_sections]);

  return (
    <div className="prep-pipeline-shell">

      {error ? <div className="prep-error-banner">✗ {error}</div> : null}
      {!hasAlignment && isLoading ? <div className="prep-loading">Running alignment…</div> : null}
      {!isLoading && !error && !hasAlignment ? <div className="prep-loading">Loading alignment…</div> : null}

      {hasAlignment && alignment ? (
        <>
          <TeacherSummaryCard
            summary={alignment.debug?.teacherSummary ?? alignment.debug?.coverageSummary?.overallAlignment ?? ""}
            prepDifficulty={alignment.debug?.prepDifficulty}
          />

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: "1rem" }}>
            <AlignmentTableV2
              items={items}
              loadingByQuestion={loadingByQuestion}
              onAction={handleAction}
            />
            <ReviewBuilderPanel
              reviewSnippets={reviewSnippets}
              rewrittenQuestions={rewrittenQuestions}
              practiceItems={practiceItems}
              generatedReview={generatedReview}
              generatedTest={generatedTest}
              isGeneratingReview={isGeneratingReview}
              isGeneratingTest={isGeneratingTest}
              onGenerateReview={handleGenerateReview}
              onGenerateTest={handleGenerateTest}
              onClearAll={() => {
                setReviewSnippets([]);
                setRewrittenQuestions([]);
                setPracticeItems([]);
                setGeneratedReview(null);
                setGeneratedTest(null);
              }}
            />
          </div>

          <PreparednessDebugPanel debug={alignment.debug ?? null} />
        </>
      ) : null}
    </div>
  );
}
