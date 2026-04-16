import { useCallback, useEffect, useMemo, useState } from "react";
import type { AssessmentDocument, PrepDocument } from "../../../prism-v4/schema/domain/Preparedness";
import type {
  ConceptMatchIntelResponse,
  ConceptMatchGenerateResponse,
  TeacherAction as CMTeacherAction,
  TestEvidenceResponse,
  AssessmentItem as CMAssessmentItem,
} from "../../../prism-v4/schema/domain/ConceptMatch";
import {
  fetchConceptMatchIntel,
  fetchTestEvidence,
  fetchConceptMatchGenerate,
} from "../../../services_new/conceptMatchService";
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
import { TestConceptProfilePanel } from "../concept-match/TestConceptProfilePanel";
import { PrepCoveragePanel } from "../concept-match/PrepCoveragePanel";
import { TeacherActionPanel } from "../concept-match/TeacherActionPanel";
import { TestEvidenceModal } from "../concept-match/TestEvidenceModal";
import { GenerateActionsBar } from "../concept-match/GenerateActionsBar";
import { DeltaReportPanel } from "../concept-match/DeltaReportPanel";
import "../concept-match/conceptMatch.css";
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

  /* ── ConceptMatch state ── */
  const [cmIntel, setCmIntel] = useState<ConceptMatchIntelResponse | null>(null);
  const [cmLoading, setCmLoading] = useState(false);
  const [cmTeacherActions, setCmTeacherActions] = useState<CMTeacherAction[]>([]);
  const [cmEvidenceData, setCmEvidenceData] = useState<TestEvidenceResponse | null>(null);
  const [cmGenerating, setCmGenerating] = useState(false);
  const [cmGenerateResult, setCmGenerateResult] = useState<ConceptMatchGenerateResponse | null>(null);

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

    /* ── ConceptMatch intel (runs in parallel with alignment) ── */
    const runCmIntel = async () => {
      setCmLoading(true);
      try {
        const cmItems = assessment.items.map((item) => ({
          itemNumber: item.itemNumber,
          rawText: item.text,
        }));

        const result = await fetchConceptMatchIntel({
          prep: { title: prep.title ?? "Prep Material", rawText: prep.rawText },
          assessment: { title: assessment.title ?? "Assessment", items: cmItems },
        });
        if (active) setCmIntel(result);
      } catch (err) {
        // Non-fatal: ConceptMatch panels just won't show
        console.warn("[ConceptMatch] Intel call failed:", err);
      } finally {
        if (active) setCmLoading(false);
      }
    };

    void run();
    void runCmIntel();
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

  /* ── ConceptMatch handlers ── */

  const cmAssessmentItems: CMAssessmentItem[] = useMemo(() => {
    // Use enriched items from intel response (LLM-extracted concepts+difficulty)
    if (cmIntel?.enrichedItems?.length) {
      return cmIntel.enrichedItems;
    }
    // Fallback to alignment debug data
    if (alignment?.debug?.testItems?.length) {
      return alignment.debug.testItems.map((item): CMAssessmentItem => ({
        itemNumber: item.questionNumber,
        rawText: item.questionText,
        tags: {
          concepts: item.concepts ?? [],
          difficulty: item.difficulty ?? 3,
        },
      }));
    }
    // Last resort: raw assessment items (no tags)
    return assessment.items.map((item): CMAssessmentItem => ({
      itemNumber: item.itemNumber,
      rawText: item.text,
    }));
  }, [assessment, alignment, cmIntel]);

  const handleCmViewEvidence = useCallback(async (concept: string) => {
    try {
      const result = await fetchTestEvidence(concept, cmAssessmentItems);
      setCmEvidenceData(result);
    } catch {
      // Fallback: build evidence from local items
      const matched = cmAssessmentItems
        .filter((i) => (i.tags?.concepts ?? []).some((c: string) => c.toLowerCase() === concept.toLowerCase()))
        .map((i) => ({
          itemNumber: i.itemNumber,
          rawText: i.rawText,
          difficulty: i.tags?.difficulty ?? 3,
          concepts: i.tags?.concepts ?? [],
        }));
      setCmEvidenceData({ concept, items: matched });
    }
  }, [cmAssessmentItems]);

  const handleCmAddAction = useCallback((action: CMTeacherAction) => {
    setCmTeacherActions((prev) => [...prev, action]);
  }, []);

  const handleCmGenerate = useCallback(async (type: "review" | "test" | "both") => {
    setCmGenerating(true);
    setError(null);
    try {
      const result = await fetchConceptMatchGenerate({
        prep: { title: prep.title ?? "Prep Material", rawText: prep.rawText },
        assessment: { title: assessment.title ?? "Assessment", items: cmAssessmentItems },
        teacherActions: cmTeacherActions,
        generate: {
          review: type === "review" || type === "both",
          test: type === "test" || type === "both",
        },
      });
      setCmGenerateResult(result);
    } catch (err) {
      setError(getErrorMessage(err, "ConceptMatch generation failed"));
    } finally {
      setCmGenerating(false);
    }
  }, [prep, assessment, cmAssessmentItems, cmTeacherActions]);

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

          {/* ── ConceptMatch panels (ABOVE alignment table) ── */}
          {cmIntel && (
            <>
              <TestConceptProfilePanel
                testConceptStats={cmIntel.testConceptStats}
                testDifficulty={cmIntel.testDifficulty}
                onViewEvidence={handleCmViewEvidence}
              />
              <PrepCoveragePanel
                testConceptStats={cmIntel.testConceptStats}
                prepConceptStats={cmIntel.prepConceptStats}
                conceptCoverage={cmIntel.conceptCoverage}
              />
            </>
          )}
          {cmLoading && (
            <div className="cm-loading">
              <div className="cm-spinner" />
              <p>Analyzing concepts…</p>
            </div>
          )}

          {/* ── Main grid: Alignment (left) + Action Panels (right) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: "1rem" }}>
            <AlignmentTableV2
              items={items}
              loadingByQuestion={loadingByQuestion}
              onAction={handleAction}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* ConceptMatch Teacher Action Panel (new) */}
              {cmIntel && (
                <TeacherActionPanel
                  testConceptStats={cmIntel.testConceptStats}
                  prepConceptStats={cmIntel.prepConceptStats}
                  conceptCoverage={cmIntel.conceptCoverage}
                  teacherActions={cmTeacherActions}
                  onAddAction={handleCmAddAction}
                />
              )}
              {/* Existing Review Builder (kept until new generation is ready) */}
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
          </div>

          {/* ── ConceptMatch Generate Bar (below main grid) ── */}
          {cmIntel && (
            <GenerateActionsBar
              hasActions={cmTeacherActions.length > 0}
              generating={cmGenerating}
              onGenerate={handleCmGenerate}
            />
          )}

          {/* ── ConceptMatch Delta Report ── */}
          {cmGenerateResult && (
            <DeltaReportPanel result={cmGenerateResult} />
          )}

          <PreparednessDebugPanel debug={alignment.debug ?? null} />
        </>
      ) : null}

      {/* ── ConceptMatch Evidence Modal ── */}
      {cmEvidenceData && (
        <TestEvidenceModal
          evidence={cmEvidenceData}
          onClose={() => setCmEvidenceData(null)}
          onAddAction={handleCmAddAction}
        />
      )}
    </div>
  );
}
