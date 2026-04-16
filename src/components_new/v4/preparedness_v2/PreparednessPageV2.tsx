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
  fetchConceptMatchGenerate,
} from "../../../services_new/conceptMatchService";
import {
  getAlignment,
  type AlignmentResponse,
} from "../../../services_new/preparednessService";
import TeacherSummaryCard from "./TeacherSummaryCard";
import { TestConceptProfilePanel } from "../concept-match/TestConceptProfilePanel";
import { PrepCoveragePanel } from "../concept-match/PrepCoveragePanel";
import { TeacherActionPanel } from "../concept-match/TeacherActionPanel";
import { TestEvidenceModal } from "../concept-match/TestEvidenceModal";
import { GenerateActionsBar } from "../concept-match/GenerateActionsBar";
import { DeltaReportPanel } from "../concept-match/DeltaReportPanel";
import "../concept-match/conceptMatch.css";
import "../v4.css";

const TOKEN_LIMIT_CODE = "TOKEN_LIMIT_REACHED";

function isTokenLimitError(err: unknown): boolean {
  if (!err) return false;
  const msg = typeof err === "string" ? err : (err as { message?: string }).message ?? "";
  if (msg.includes("Daily token limit") || msg.includes(TOKEN_LIMIT_CODE)) return true;
  const raw = (err as { raw?: { code?: string } }).raw;
  return raw?.code === TOKEN_LIMIT_CODE;
}

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

export default function PreparednessPageV2({ prep, assessment }: PreparednessPageV2Props) {
  const [alignment, setAlignment] = useState<AlignmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* ── Token budget state ── */
  const [tokenExhausted, setTokenExhausted] = useState(false);

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
      setCmLoading(true);
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

        /* ── ConceptMatch intel — reuse alignment's rich concepts ── */
        const testItems = result.debug?.testItems;
        if (testItems?.length) {
          const taggedItems: CMAssessmentItem[] = testItems.map((item) => ({
            itemNumber: item.questionNumber,
            rawText: item.questionText,
            tags: {
              concepts: item.concepts ?? [],
              difficulty: item.difficulty ?? 3,
            },
          }));

          try {
            const cmResult = await fetchConceptMatchIntel({
              prep: { title: prep.title ?? "Prep Material", rawText: prep.rawText },
              assessment: { title: assessment.title ?? "Assessment", items: taggedItems },
            });
            if (active) setCmIntel(cmResult);
          } catch (cmErr) {
            console.warn("[ConceptMatch] Intel call failed:", cmErr);
          }
        }
      } catch (err) {
        if (!active) return;
        if (isTokenLimitError(err)) setTokenExhausted(true);
        setError(getErrorMessage(err, "Failed to load preparedness alignment"));
      } finally {
        if (active) {
          setIsLoading(false);
          setCmLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [prep, assessment]);

  const hasAlignment = alignment !== null;

  /* ── ConceptMatch handlers ── */

  const cmAssessmentItems: CMAssessmentItem[] = useMemo(() => {
    // Primary: alignment debug items (rich QA concepts — single source of truth)
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
    // Fallback: raw assessment items (no tags)
    return assessment.items.map((item): CMAssessmentItem => ({
      itemNumber: item.itemNumber,
      rawText: item.text,
    }));
  }, [assessment, alignment]);

  const handleCmViewEvidence = useCallback((concept: string) => {
    // Build evidence client-side from the same tagged items — no server round-trip.
    const matched = cmAssessmentItems
      .filter((i) => (i.tags?.concepts ?? []).some((c: string) => c.toLowerCase() === concept.toLowerCase()))
      .map((i) => ({
        itemNumber: i.itemNumber,
        rawText: i.rawText,
        difficulty: i.tags?.difficulty ?? 3,
        concepts: i.tags?.concepts ?? [],
      }));
    setCmEvidenceData({ concept, items: matched });
  }, [cmAssessmentItems]);

  const handleCmAddAction = useCallback((action: CMTeacherAction) => {
    setCmTeacherActions((prev) => [...prev, action]);
  }, []);

  const handleCmGenerate = useCallback(async (type: "review" | "test" | "both") => {
    if (tokenExhausted) {
      setError("Daily token limit reached — AI actions are disabled.");
      return;
    }
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
      if (isTokenLimitError(err)) setTokenExhausted(true);
      setError(getErrorMessage(err, "ConceptMatch generation failed"));
    } finally {
      setCmGenerating(false);
    }
  }, [prep, assessment, cmAssessmentItems, cmTeacherActions]);

  return (
    <div className="prep-pipeline-shell">

      {error ? <div className="prep-error-banner">✗ {error}</div> : null}
      {tokenExhausted && (
        <div className="prep-error-banner" style={{ background: "#fff3cd", color: "#856404", borderColor: "#ffc107" }}>
          ⚠ You've reached your daily token limit. Actions that use AI are disabled until tomorrow.
        </div>
      )}
      {!hasAlignment && isLoading ? <div className="prep-loading">Running alignment…</div> : null}
      {!isLoading && !error && !hasAlignment ? <div className="prep-loading">Loading alignment…</div> : null}

      {hasAlignment && alignment ? (
        <>
          <TeacherSummaryCard
            summary={
              cmIntel?.teacherSummary ??
              alignment.debug?.teacherSummary ??
              alignment.debug?.coverageSummary?.overallAlignment ??
              ""
            }
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

          {/* ── Main grid: Action Panel (full-width, no old alignment table) ── */}
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
          </div>

          {/* ── ConceptMatch Generate Bar (below main grid) ── */}
          {cmIntel && (
            <GenerateActionsBar
              hasActions={cmTeacherActions.length > 0}
              generating={cmGenerating}
              disabled={tokenExhausted}
              onGenerate={handleCmGenerate}
            />
          )}

          {/* ── ConceptMatch Delta Report ── */}
          {cmGenerateResult && (
            <DeltaReportPanel result={cmGenerateResult} />
          )}
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
