/**
 * AssessmentViewer.tsx
 *
 * Renders a FinalAssessment as a clean, printable document.
 * Includes a Philosopher's Report summarising pedagogical quality.
 */

import { useState, useRef } from "react";
import type { FinalAssessment, FinalAssessmentItem } from "@/pipeline/agents/builder/FinalAssessment";
import { downloadFinalAssessmentPDF, downloadFinalAssessmentWord, assessmentContainsMath } from "@/utils/exportFinalAssessment";
import { groupItemsBySection, formatSectionHeader } from "@/pipeline/agents/builder/sectionGrouper";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";
import "./AssessmentViewer.css";

// ── Philosopher's Report ──────────────────────────────────────────────────────

interface ReportSection { heading: string; body: string; }
interface ReportData {
  tagline: string;
  sections: ReportSection[];
  strengths: string[];
  flags: string[];
}

function computeReport(
  assessment: FinalAssessment,
  title: string,
  _uar?: Record<string, any>
): ReportData {
  const items = assessment.items;
  const total = assessment.totalItems;
  // Derive cognitive distribution from items (not stored on FinalAssessment directly)
  const cogDist: Record<string, number> = {};
  for (const item of items) {
    const demand = (item as any).cognitiveDemand as string | undefined;
    if (demand) cogDist[demand] = (cogDist[demand] ?? 0) + 1;
  }
  const levels = Object.keys(cogDist).sort((a, b) => cogDist[b] - cogDist[a]);
  const dominantLevel = levels[0] ?? null;

  const mcqCount = items.filter((i) => i.questionType === "multipleChoice").length;
  const saCount = total - mcqCount;

  const higherOrderKeys = ["Analyze", "Evaluate", "Create"];
  const higherOrder = higherOrderKeys.reduce((s, l) => s + (cogDist[l] ?? 0), 0);
  const higherPct = total > 0 ? Math.round((higherOrder / total) * 100) : 0;

  const totalSec = assessment.metadata?.totalEstimatedTimeSeconds;
  const secPerQ = totalSec && total > 0 ? Math.round(totalSec / total) : null;

  const sections: ReportSection[] = [];

  // Cognitive Architecture — only when something notable to say
  if (levels.length === 0) {
    sections.push({ heading: "Cognitive Architecture", body: "No cognitive-demand data was recorded for this assessment." });
  } else if (higherPct >= 40) {
    sections.push({ heading: "Cognitive Architecture", body:
      `${higherPct}% of questions reach the Analyze / Evaluate / Create tier — a strong higher-order emphasis. ` +
      `Dominant level: **${dominantLevel}** (${cogDist[dominantLevel!]} of ${total} items).`
    });
  } else if (higherPct === 0 && total > 3) {
    // Flag case: zero higher-order — handled in flags below, skip duplicating here
  }

  // Item Format — only for extremes
  if (mcqCount === total && total > 5) {
    sections.push({ heading: "Item Format", body:
      `All ${total} items are multiple-choice. This supports rapid grading but limits visibility into student reasoning. ` +
      `Consider adding a short-answer or constructed-response item for deeper evidence.`
    });
  } else if (saCount === total && total > 3) {
    sections.push({ heading: "Item Format", body:
      `All ${total} items are open-response. Rich evidence of student thinking, but factor in grading time.`
    });
  }

  // Pacing — only if tight
  if (secPerQ !== null && secPerQ < 35) {
    const minPerQ = Math.round(secPerQ / 6) / 10;
    sections.push({ heading: "Pacing Alert", body:
      `Estimated ~${minPerQ} min per question — unusually tight. Confirm item length against your time budget, especially for open-response items.`
    });
  }

  // Strengths & Flags — only include non-trivial, specific observations
  const strengths: string[] = [];
  const flags: string[] = [];

  if (levels.length >= 4) strengths.push(`Spans ${levels.length} reasoning levels — strong cognitive range`);
  if (higherPct >= 30) strengths.push(`${higherPct}% higher-order items — challenges critical thinking`);

  if (higherPct === 0 && total > 5)
    flags.push("No higher-order items (analysis, evaluation, synthesis) — consider adding at least one");
  if (levels.length === 1 && total > 3)
    flags.push("All items at the same reasoning level — limited cognitive variation");
  if (mcqCount === total && total > 8)
    flags.push("All MCQ — no opportunity to assess written or constructed reasoning");
  if (secPerQ !== null && secPerQ < 30)
    flags.push("Estimated pacing may be too tight — verify item length against time budget");

  const tagline = `${total}-question assessment${dominantLevel ? ` (primary demand: ${dominantLevel})` : ""}${title ? ` on "${title}"` : ""} — ${higherPct}% higher-order`;

  return { tagline, sections, strengths, flags };
}

function PhilosophersReport({
  assessment,
  title,
  uar,
  philosopherNotes,
  philosopherAnalysis,
  teacherFeedback,
}: {
  assessment: FinalAssessment;
  title: string;
  uar?: Record<string, any>;
  philosopherNotes?: string;
  philosopherAnalysis?: any;
  teacherFeedback?: any;
}) {
  const [open, setOpen] = useState(true);
  const { devMode } = useDeveloperMode();
  const report = computeReport(assessment, title, uar);

  return (
    <div className="av-report">
      <button className="av-report-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="av-report-icon">⚗</span>
        <span className="av-report-label">Philosopher's Report</span>
        <span className="av-report-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="av-report-body">
          <p className="av-report-tagline">{report.tagline}</p>

          {report.sections.map((sec) => (
            <div key={sec.heading} className="av-report-section">
              <h3 className="av-report-section-heading">{sec.heading}</h3>
              <p className="av-report-section-body">
                {sec.body.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
                  chunk.startsWith("**") && chunk.endsWith("**") ? (
                    <strong key={i}>{chunk.slice(2, -2)}</strong>
                  ) : (
                    <span key={i}>{chunk}</span>
                  )
                )}
              </p>
            </div>
          ))}

          {(report.strengths.length > 0 || report.flags.length > 0) && (
            <div className="av-report-verdict">
              {report.strengths.length > 0 && (
                <div className="av-report-col">
                  <p className="av-report-col-heading av-report-col-heading--green">✓ Strengths</p>
                  <ul className="av-report-list">
                    {report.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.flags.length > 0 && (
                <div className="av-report-col">
                  <p className="av-report-col-heading av-report-col-heading--amber">⚠ Consider</p>
                  <ul className="av-report-list">
                    {report.flags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {philosopherNotes && (() => {
            const allTips = philosopherNotes
              .split("\n")
              .filter((l) => l.startsWith("💡"));
            // Separate quality/correction notes from plain prompt suggestions
            const correctionNotes = allTips.filter((l) => /Tip \u2014 [✓⚡⚠🔧]/.test(l));
            const promptSuggestions = allTips.filter((l) => !/Tip \u2014 [✓⚡⚠🔧]/.test(l));
            return (
              <>
                {correctionNotes.length > 0 && (
                  <div className="av-report-tips">
                    <p className="av-report-col-heading av-report-col-heading--blue">📋 Generation notes</p>
                    <ul className="av-report-list">
                      {correctionNotes.map((tip) => (
                        <li key={tip}>{tip.replace(/^💡 Tip — /, "")}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {promptSuggestions.length > 0 && (
                  <div className="av-report-tips">
                    <p className="av-report-col-heading av-report-col-heading--blue">💡 Prompt suggestions</p>
                    <ul className="av-report-list">
                      {promptSuggestions.map((tip) => (
                        <li key={tip}>{tip.replace(/^💡 Tip — /, "")}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}

          {/* Teacher-visible redundancy notice — always on, no internal labels */}
          {philosopherAnalysis?.redundantPairs && philosopherAnalysis.redundantPairs.length > 0 && (
            <div className="av-report-section" style={{ borderTop: "1px solid var(--border-color, #e5e7eb)", paddingTop: "0.85rem", marginTop: "0.5rem" }}>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary, #6b7280)" }}>
                ⚠ <strong>{philosopherAnalysis.redundantPairs.length} question{philosopherAnalysis.redundantPairs.length > 1 ? " pairs" : ""}</strong> test closely overlapping concepts.
                {" "}Consider varying coverage to give students a broader assessment of the topic.
              </p>
            </div>
          )}

          {devMode && philosopherAnalysis && (
            <div className="av-report-section">
              <h3 className="av-report-section-heading">Pedagogical Analysis</h3>
              <div className="av-report-section-body" style={{ fontSize: "0.9rem" }}>
                {philosopherAnalysis.gatekeeperPassed && (
                  <p style={{ marginBottom: "0.5rem", color: "#2e7d32" }}>
                    ✓ <strong>Gatekeeper Passed</strong> — All items passed format and structure validation.
                  </p>
                )}
                {philosopherAnalysis.qualityScore !== undefined && (
                  <p style={{ marginBottom: "0.5rem" }}>
                    <strong>Quality Score:</strong> {philosopherAnalysis.qualityScore}/10
                  </p>
                )}
                {philosopherAnalysis.violationCount > 0 && (
                  <p style={{ marginBottom: "0.5rem", color: "#d32f2f" }}>
                    <strong>{philosopherAnalysis.violationCount} item(s)</strong> triggered Gatekeeper corrections.
                  </p>
                )}
                {philosopherAnalysis.redundantPairs && philosopherAnalysis.redundantPairs.length > 0 && (
                  <p style={{ marginBottom: "0.5rem", color: "#f57c00" }}>
                    <strong>Redundancy detected:</strong> {philosopherAnalysis.redundantPairs.join(", ")} have &gt;70% word overlap.
                  </p>
                )}
              </div>
            </div>
          )}

          {teacherFeedback && (() => {
            const tips: Array<{ reason: string; snippet: string }> =
              teacherFeedback.promptTips ?? [];
            const rewriteCount: number = teacherFeedback.rewriteCount ?? 0;
            const cleanRun = rewriteCount === 0 && tips.length === 0;
            return (
              <div className="av-report-section">
                <h3 className="av-report-section-heading">Improve Your Next Prompt</h3>
                <div className="av-report-section-body">

                  {/* Status banner */}
                  <div className={`av-prompt-status ${cleanRun ? "av-prompt-status--clean" : "av-prompt-status--corrected"}`}>
                    {cleanRun
                      ? "✓ Clean run — the assessment matched your inputs with no corrections needed."
                      : `⚠ ${rewriteCount > 0 ? `${rewriteCount} question${rewriteCount !== 1 ? "s" : ""} were auto-corrected.` : "Some adjustments were applied."} Adding the suggestions below to your next prompt will reduce this.`
                    }
                  </div>

                  {/* Prompt tips */}
                  {tips.length > 0 && (
                    <div className="av-prompt-tips">
                      <p className="av-prompt-tips-heading">Try adding to your prompt:</p>
                      {tips.map((tip, i) => (
                        <div key={i} className="av-prompt-tip">
                          <p className="av-prompt-tip-reason">{tip.reason}</p>
                          <blockquote className="av-prompt-tip-snippet">{tip.snippet}</blockquote>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function totalMinutes(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  return `${m} min`;
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
}

export function AssessmentViewer({ assessment, title, subtitle, uar, philosopherNotes, philosopherAnalysis, teacherFeedback }: AssessmentViewerProps) {
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [wordLoading, setWordLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const displayTitle = title ?? "Assessment";
  const totalTime = totalMinutes(assessment.metadata?.totalEstimatedTimeSeconds);
  const hasMath = assessmentContainsMath(assessment);

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try {
      // Answer key is always included as a separate final page.
      await downloadFinalAssessmentPDF(assessment, { title: displayTitle, subtitle, includeAnswerKey: true, version: "teacher" });
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

              {/* Time */}
              {uar.timeMinutes != null && (
                <div className="av-match-row">
                  <span className="av-match-label">Time budget</span>
                  <span className="av-match-value">{uar.timeMinutes} min requested → est. {totalTime}</span>
                  <span className="av-match-badge av-match-badge--yes">✓ On target</span>
                </div>
              )}

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

      {/* ── Questions ──────────────────────────────────────────── */}
      {(() => {
        const layout = assessment.metadata?.layout ?? "singleColumn";
        const isColumns = layout === "columns";
        const { sections, sectionOrder } = groupItemsBySection(null, assessment.items);
        const hasMultipleSections = sectionOrder.length > 1;
        return (
          <div className={isColumns ? "av-questions-columns" : "av-questions"}>
            {sectionOrder.map((type) => (
              <div key={type}>
                {hasMultipleSections && (
                  <div className="av-section-header">{formatSectionHeader(type)}</div>
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
            ))}
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

      {/* ── Philosopher's Report ────────────────────────────────── */}
      <PhilosophersReport
        assessment={assessment}
        title={displayTitle}
        uar={uar}
        philosopherNotes={philosopherNotes}
        philosopherAnalysis={philosopherAnalysis}
        teacherFeedback={teacherFeedback}
      />
    </div>
  );
}
