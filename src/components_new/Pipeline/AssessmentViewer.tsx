/**
 * AssessmentViewer.tsx
 *
 * Renders a FinalAssessment as a clean, printable document.
 * Includes a Philosopher's Report summarising pedagogical quality.
 */

import { useState, useRef } from "react";
import type { FinalAssessment, FinalAssessmentItem } from "../../pipeline/agents/builder/FinalAssessment";
import { downloadFinalAssessmentPDF, downloadFinalAssessmentWord, assessmentContainsMath } from "@/utils/exportFinalAssessment";
import { groupItemsBySection, formatSectionHeader } from "../../pipeline/agents/builder/sectionGrouper";

import { DEFAULT_PACING_SECONDS } from "../../types/teacherProfile";
import { WriterGuidelinesPanel } from "./WriterGuidelinesPanel";
import type { WriterContract } from "../../pipeline/contracts/WriterContract";
import { PlaytesterPayloadPanel } from "./PlaytesterPayloadPanel";
import "./AssessmentViewer.css";

// ── Philosopher's Report ──────────────────────────────────────────────────────

interface ReportSection { heading: string; body: string; }
interface ReportData {
  tagline: string;
  sections: ReportSection[];
  strengths: string[];
  flags: string[];
}



// ── helpers ───────────────────────────────────────────────────────────────────

function totalMinutes(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

/** Human-readable pacing time: "30 sec", "1 min", "2.5 min", etc. */
function formatPacingTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = seconds / 60;
  return m === Math.floor(m) ? `${m} min` : `${m.toFixed(1)} min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Extracts the letter prefix from an MCQ option or answer string.
 * e.g. "B. Some option text" → "B"
 *      "C) Another option"   → "C"
 * Returns "" if no letter prefix is found.
 */
function extractLetter(text: string): string {
  const m = text?.match(/^([A-Da-d])[.)]\s*/);
  return m ? m[1].toUpperCase() : "";
}

// ── Inline math renderer ──────────────────────────────────────────────────────

type MathSegment =
  | { type: "text"; content: string }
  | { type: "sup"; content: string }
  | { type: "sub"; content: string }
  | { type: "sqrt"; content: string }
  | { type: "frac"; num: string; den: string };

function parseMathSegments(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  // Match \frac{num}{den}, x^{exp}, x_{sub}, \sqrt{arg}
  const regex = /\\frac\{([^}]*)\}\{([^}]*)\}|\\sqrt\{([^}]*)\}|\^{([^}]*)}_|\^{([^}]*)}|_\{([^}]*)\}|\^([\d\w]{1,4})|_([\d\w]{1,4})/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", content: text.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      // \frac{num}{den}
      segments.push({ type: "frac", num: match[1], den: match[2] });
    } else if (match[3] !== undefined) {
      // \sqrt{arg}
      segments.push({ type: "sqrt", content: match[3] });
    } else if (match[5] !== undefined) {
      // ^{exp}
      segments.push({ type: "sup", content: match[5] });
    } else if (match[6] !== undefined) {
      // _{sub}
      segments.push({ type: "sub", content: match[6] });
    } else if (match[7] !== undefined) {
      // ^X (bare)
      segments.push({ type: "sup", content: match[7] });
    } else if (match[8] !== undefined) {
      // _X (bare)
      segments.push({ type: "sub", content: match[8] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: "text", content: text.slice(last) });
  return segments.length > 0 ? segments : [{ type: "text", content: text }];
}

/** Renders a string that may contain LaTeX-style notation as readable React nodes. */
function MathText({ text }: { text: string }) {
  // Quick check — skip parsing for plain text with no math markers
  if (!/[\\^_]/.test(text)) return <>{text}</>;
  const segments = parseMathSegments(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "sup") return <sup key={i}>{seg.content}</sup>;
        if (seg.type === "sub") return <sub key={i}>{seg.content}</sub>;
        if (seg.type === "sqrt") return <span key={i}>√<span style={{ borderTop: "1px solid currentColor", paddingTop: "1px" }}>{seg.content}</span></span>;
        if (seg.type === "frac") return (
          <span key={i} style={{ display: "inline-flex", flexDirection: "column", textAlign: "center", verticalAlign: "middle", lineHeight: 1.1, fontSize: "0.9em", margin: "0 2px" }}>
            <span style={{ borderBottom: "1px solid currentColor", paddingBottom: "1px" }}>{seg.num}</span>
            <span>{seg.den}</span>
          </span>
        );
        return <span key={i}>{(seg as { type: "text"; content: string }).content}</span>;
      })}
    </>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function QuestionItem({ item, showAnswer, compact }: { item: FinalAssessmentItem; showAnswer: boolean; compact?: boolean }) {
  const isMC = item.questionType === "multipleChoice";

  // ── Compact rendering for arithmetic fluency in column layout ──────────
  if (compact) {
    return (
      <div className="av-question-compact">
        <div className="av-q-compact-number">{item.questionNumber}.</div>
        <div className="av-q-compact-expr"><MathText text={item.prompt} /></div>
        {showAnswer
          ? <div className="av-q-compact-answer"><MathText text={item.answer ?? ""} /></div>
          : <div className="av-q-compact-blank" />}
      </div>
    );
  }

  // ── Passage-based rendering ─────────────────────────────────────────────
  if (item.questionType === "passageBased") {
    const subQs = item.questions ?? [];
    return (
      <div className="av-question av-question--passage">
        <div className="av-q-number">{item.questionNumber}.</div>
        <div className="av-q-body">
          {item.passage && (
            <div className="av-passage-block">
              <span className="av-passage-label">Read the following passage:</span>
              <p className="av-passage-text">{item.passage}</p>
            </div>
          )}
          <ol className="av-passage-questions" style={{ paddingLeft: "1.2rem", marginTop: "0.75rem" }}>
            {subQs.map((q, qi) => (
              <li key={qi} className="av-passage-question" style={{ marginBottom: "0.75rem" }}>
                <p className="av-q-prompt" style={{ marginBottom: "0.25rem" }}>
                  <MathText text={q.prompt} />
                </p>
                {!showAnswer && (
                  <div className="av-answer-lines">
                    {Array.from({ length: 3 }).map((_, li) => (
                      <div key={li} className="av-answer-line" />
                    ))}
                  </div>
                )}
                {showAnswer && q.answer && (
                  <div className="av-inline-answer">
                    <span className="av-inline-answer-label">Answer:</span>
                    {" "}<MathText text={q.answer} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="av-question">
      <div className="av-q-number">{item.questionNumber}.</div>
      <div className="av-q-body">
        {/* Question prompt text — always shown */}
        <p className="av-q-prompt"><MathText text={item.prompt} /></p>

        {isMC && item.options && (
          <ul className="av-options">
            {item.options.map((opt, i) => (
              <li
                key={i}
                className="av-option"
                style={
                  showAnswer && extractLetter(opt) === extractLetter(item.answer ?? "")
                    ? { fontWeight: 700, textDecoration: "underline", color: "var(--fg)" }
                    : undefined
                }
              >
                <MathText text={opt} />
              </li>
            ))}
          </ul>
        )}

        {!isMC && item.questionType !== "trueFalse" && !showAnswer && (
          <div className="av-answer-lines">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="av-answer-line" />
            ))}
          </div>
        )}

        {!isMC && showAnswer && item.answer && (
          <div className="av-inline-answer">
            <span className="av-inline-answer-label">Answer:</span>
            {" "}<MathText text={item.answer} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface AssessmentViewerProps {
  assessment: FinalAssessment;
  /** Displayed above the question list (e.g. topic / course / grade) */
  title?: string;
  subtitle?: string;
  /** Raw UAR object from the blueprint — referenced by the Philosopher's Report */
  uar?: Record<string, any>;
  /** Free-text notes from the Philosopher agent, including 💡 Tip suggestions */
  philosopherNotes?: string;
  /** Structured analysis data from Philosopher (violations, bloom profile, redundancy, quality) */
  philosopherAnalysis?: any;
  /** Teacher feedback with summary, positives, suggestions */
  teacherFeedback?: any;
  /** Writer reliability scores (0–100) from the most recent dossier update */
  reliability?: { trust: number; alignment: number; stability: number };
  /** Writer Contract — records all guidelines, constraints, and Gatekeeper prescriptions. */
  writerContract?: WriterContract;
  /** Blueprint-level warnings (feasibility, time adjustments, plausibility). */
  blueprintWarnings?: string[];
  /**
   * Per-question-type seconds from the teacher's pacing defaults.
   * Falls back to DEFAULT_PACING_SECONDS when not provided.
   * Used to show per-section time estimates (on-screen only, not in exports).
   */
  pacingSeconds?: Record<string, number>;
}

export function AssessmentViewer({ assessment, title, subtitle, uar, philosopherNotes, philosopherAnalysis, teacherFeedback, writerContract, blueprintWarnings, pacingSeconds }: AssessmentViewerProps) {
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [wordLoading, setWordLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const displayTitle = title ?? "Assessment";
  const totalTime = totalMinutes(assessment.metadata?.totalEstimatedTimeSeconds);
  const hasMath = assessmentContainsMath(assessment);

  // Per-question-type seconds — use teacher pacing or global fallback
  const pacing = pacingSeconds ?? DEFAULT_PACING_SECONDS;

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try {
      // Answer key is always included as a separate final page.
      await downloadFinalAssessmentPDF(assessment, { title: displayTitle, subtitle, includeAnswerKey: true, version: "teacher" });
    } catch (error) {
      console.error("[AssessmentViewer] PDF download failed:", error);
      alert(`PDF download failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadWord() {
    setWordLoading(true);
    try {
      // Answer key is always included as a separate final page.
      await downloadFinalAssessmentWord(assessment, { title: displayTitle, subtitle, includeAnswerKey: true });
    } finally {
      setWordLoading(false);
    }
  }

  // handleCopyAIPrompt and handlePrint reserved for future use

  return (
    <div className="av-root" ref={printRef}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="av-header">
        <div className="av-header-top">
          <div>
            <h1 className="av-title">{displayTitle}</h1>
            {subtitle && <p className="av-subtitle">{subtitle}</p>}
          </div>
          <div className="av-actions">
            <button
              className="av-btn av-btn-primary"
              onClick={handleDownloadPDF}
              disabled={pdfLoading || hasMath}
              title={hasMath ? "This assessment contains math notation that doesn't render correctly in PDF — use \"🖨 Print\" instead" : undefined}
            >
              {pdfLoading ? "Generating…" : hasMath ? "⬇ PDF (math—use Print)" : "⬇ PDF"}
            </button>
            <button
              className="av-btn av-btn-outline"
              onClick={handleDownloadWord}
              disabled={wordLoading}
              title="Download as Word document (.docx)"
            >
              {wordLoading ? "Exporting…" : "📄 Word"}
            </button>
            <button
              className="av-btn av-btn-outline"
              disabled
              title="Print temporarily disabled while answer key ordering is being fixed"
            >
              🖨 Print
            </button>
            <button
              className="av-btn av-btn-ghost"
              disabled
              title="Playtest lets students attempt this assessment in a simulated session — coming soon"
            >
              🎮 Playtest
            </button>
            <button
                className="av-btn av-btn-outline"
                disabled
                title="Use in AI is coming soon"
              >
                📋 Use in AI
              </button>
          </div>
        </div>

        <div className="av-meta">
          <span className="av-meta-item">📋 {assessment.totalItems} questions</span>
          <span className="av-meta-item">⏱ {totalTime}</span>
          <span className="av-meta-item">📅 {formatDate(assessment.generatedAt)}</span>
        </div>

        {uar && (
          <div className="av-reliability">
            <div className="av-reliability-header">Matched to your inputs</div>
            <div className="av-match-rows">

              {/* Topic */}
              {(uar.topic || uar.unitName) && (
                <div className="av-match-row">
                  <span className="av-match-label">{uar.topic ? "Topic" : "Unit"}</span>
                  <span className="av-match-value">{uar.topic ?? uar.unitName}</span>
                  <span className="av-match-badge av-match-badge--yes">✓ Covered</span>
                </div>
              )}

              {/* Grade */}
              {(uar.grade || uar.gradeLevels?.[0]) && (
                <div className="av-match-row">
                  <span className="av-match-label">Grade</span>
                  <span className="av-match-value">{uar.grade ?? uar.gradeLevels?.[0]}</span>
                  <span className="av-match-badge av-match-badge--yes">✓ Matched</span>
                </div>
              )}

              {/* Assessment type */}
              {uar.assessmentType && (
                <div className="av-match-row">
                  <span className="av-match-label">Type</span>
                  <span className="av-match-value" style={{ textTransform: "capitalize" }}>{uar.assessmentType}</span>
                  <span className="av-match-badge av-match-badge--yes">✓ Generated</span>
                </div>
              )}

              {/* Question count */}
              {uar.questionCount != null && (() => {
                const asked = uar.questionCount as number;
                const got = assessment.totalItems;
                const exact = got === asked;
                const close = Math.abs(got - asked) <= 2;
                return (
                  <div className="av-match-row">
                    <span className="av-match-label">Questions</span>
                    <span className="av-match-value">Asked {asked} → got {got}</span>
                    <span className={`av-match-badge ${exact ? "av-match-badge--yes" : close ? "av-match-badge--partial" : "av-match-badge--no"}`}>
                      {exact ? "✓ Exact" : close ? `~${got}` : `${got}/${asked}`}
                    </span>
                  </div>
                );
              })()}

              {/* Time — compare estimated vs requested */}
              {(() => {
                const requestedMins: number | null =
                  uar.time != null ? Number(uar.time) :
                  uar.timeMinutes != null ? Number(uar.timeMinutes) :
                  null;
                const estimatedSec = assessment.metadata?.totalEstimatedTimeSeconds;
                const estimatedMins = estimatedSec ? Math.round(estimatedSec / 60) : null;
                if (estimatedMins == null && requestedMins == null) return null;
                const delta = (estimatedMins != null && requestedMins != null)
                  ? estimatedMins - requestedMins : null;
                const badgeClass =
                  delta == null ? "av-match-badge av-match-badge--yes" :
                  Math.abs(delta) <= 2 ? "av-match-badge av-match-badge--yes" :
                  delta > 0 ? "av-match-badge av-match-badge--no" :
                  "av-match-badge av-match-badge--partial";
                const badgeLabel =
                  delta == null ? "✓ Estimated" :
                  Math.abs(delta) <= 2 ? "✓ On target" :
                  delta > 0 ? `+${delta} min over` :
                  `${Math.abs(delta)} min under`;
                return (
                  <div className="av-match-row">
                    <span className="av-match-label">Time</span>
                    <span className="av-match-value">
                      {estimatedMins != null ? `~${estimatedMins} min estimated` : "—"}
                      {requestedMins != null && (
                        <span style={{ marginLeft: "0.4em", opacity: 0.65 }}>
                          ({requestedMins} min requested)
                        </span>
                      )}
                    </span>
                    <span className={badgeClass}>{badgeLabel}</span>
                  </div>
                );
              })()}

              {/* Question types */}
              {Array.isArray(uar.questionTypes) && uar.questionTypes.length > 0 && (
                <div className="av-match-row">
                  <span className="av-match-label">Question types</span>
                  <span className="av-match-value">{(uar.questionTypes as string[]).join(", ")}</span>
                  <span className="av-match-badge av-match-badge--yes">✓ Included</span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Cognitive distribution pills — hidden from on-screen view, kept in PDF only */}
      </div>

      {/* ── Student header fields ───────────────────────────────── */}
      <div className="av-student-fields">
        <div>
          <div className="av-field-line" />
          <div className="av-field-label">Name</div>
        </div>
        <div>
          <div className="av-field-line" />
          <div className="av-field-label">Date</div>
        </div>
      </div>

      {/* ── Pacing breakdown (on-screen only) ──────────────────── */}
      {(() => {
        const { sections: secMap, sectionOrder: secOrd } = groupItemsBySection(null, assessment.items);
        // Only show if there are questions and at least one type has pacing data
        if (secOrd.length === 0) return null;
        const rows = secOrd.map((type) => {
          const count = (secMap[type] ?? []).length;
          const secPerQ = pacing[type] ?? 60;
          const totalSec = count * secPerQ;
          return { type, count, secPerQ, totalSec };
        });
        const grandTotalSec = rows.reduce((s, r) => s + r.totalSec, 0);
        const grandTotalMin = Math.ceil(grandTotalSec / 60);
        return (
          <div className="av-pacing-breakdown">
            <span className="av-pacing-header">&#x23F1; Pacing</span>
            {rows.map((r) => (
              <span key={r.type} className="av-pacing-pill">
                <span className="av-pacing-pill__label">{formatSectionHeader(r.type)}</span>
                <span className="av-pacing-pill__detail">{r.count} &times; {formatPacingTime(r.secPerQ)} = <strong>{formatPacingTime(r.totalSec)}</strong></span>
              </span>
            ))}
            <span className="av-pacing-total">~{grandTotalMin} min total</span>
          </div>
        );
      })()}

      {/* ── Questions ──────────────────────────────────────────── */}
      {(() => {
        const layout = assessment.metadata?.layout ?? "singleColumn";
        const isColumns = layout === "columns";
        const { sections, sectionOrder } = groupItemsBySection(null, assessment.items);
        const hasMultipleSections = sectionOrder.length > 1;
        return (
          <div className={isColumns ? "av-questions-columns" : "av-questions"}>
            {sectionOrder.map((type) => {
              const count = (sections[type] ?? []).length;
              const secPerQ = pacing[type] ?? 60;
              const sectionSec = count * secPerQ;
              return (
                <div key={type}>
                  {hasMultipleSections && (
                    <div className="av-section-header">
                      {formatSectionHeader(type)}
                      <span className="av-section-time">
                        {count} question{count !== 1 ? "s" : ""} &middot; ~{formatPacingTime(sectionSec)}
                      </span>
                    </div>
                  )}
                  {sections[type].map((item) => (
                    <QuestionItem
                      key={item.slotId}
                      item={item}
                      showAnswer={showAnswerKey}
                      compact={isColumns && item.questionType === "arithmeticFluency"}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Answer key toggle ───────────────────────────────────── */}
      <div className="av-toggle-row">
        <input
          id="av-show-answers"
          type="checkbox"
          checked={showAnswerKey}
          onChange={(e) => setShowAnswerKey(e.target.checked)}
        />
        <label htmlFor="av-show-answers" className="av-toggle-label">
          Show answer key
        </label>
      </div>

      {/* ── Answer key section ──────────────────────────────────── */}
      {showAnswerKey && (
        <div className="av-answer-key">
          <p className="av-answer-key-title">Answer Key</p>
          <div className="av-answer-key-grid">
            {assessment.items.flatMap((item) => {
              // Passage-based: expand sub-questions as labelled entries (1a, 1b, ...)
              if (item.questionType === "passageBased") {
                return (item.questions ?? []).map((q, qi) => (
                  <div key={`${item.slotId}-${qi}`} className="av-ak-entry">
                    <span className="av-ak-num">{item.questionNumber}{String.fromCharCode(97 + qi)}.</span>
                    <span><MathText text={q.answer ?? "—"} /></span>
                  </div>
                ));
              }
              const isMC = item.questionType === "multipleChoice";
              const displayAnswer = isMC
                ? (extractLetter(item.answer ?? "") || (item.answer ?? "—"))
                : (item.answer ?? "—");
              return (
                <div key={item.slotId} className="av-ak-entry">
                  <span className="av-ak-num">{item.questionNumber}.</span>
                  <span><MathText text={displayAnswer} /></span>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* ── Blueprint warnings (feasibility, time, plausibility) ──── */}
      {blueprintWarnings && blueprintWarnings.length > 0 && (
        <div className="av-report" style={{ marginTop: "1rem" }}>
          <div className="av-report-body" style={{ paddingTop: "0.75rem" }}>
            <p className="av-report-col-heading av-report-col-heading--amber" style={{ marginBottom: "0.5rem" }}>
              ⚠ Assessment Notes
            </p>
            <ul className="av-report-list">
              {blueprintWarnings
                .filter(w => !w.startsWith("[Feasibility detail]"))
                .map((w, i) => (
                  <li key={i} style={{ fontSize: "0.9rem", marginBottom: "0.35rem" }}>{w}</li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Writer Contract (guidelines, constraints, Gatekeeper) ──── */}
      {writerContract && (
        <WriterGuidelinesPanel contract={writerContract} />
      )}

      {/* ── Playtester Payload ──────────────────────────────────── */}
      <PlaytesterPayloadPanel assessment={assessment} />
    </div>
  );
}
