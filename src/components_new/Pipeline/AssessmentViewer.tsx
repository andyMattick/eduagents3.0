/**
 * AssessmentViewer.tsx
 *
 * Renders a FinalAssessment as a clean, printable document.
 * Includes a Philosopher's Report summarising pedagogical quality.
 */

import { useState, useRef } from "react";
import type { FinalAssessment, FinalAssessmentItem } from "@/pipeline/agents/builder/FinalAssessment";
import { downloadFinalAssessmentPDF, downloadFinalAssessmentWord } from "@/utils/exportFinalAssessment";
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
  uar?: Record<string, any>
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

  // Cognitive Architecture
  let cogText =
    levels.length === 0
      ? "No cognitive-demand tags were recorded for this assessment."
      : `This assessment spans ${levels.length} of Bloom's cognitive level${levels.length === 1 ? "" : "s"}. `;
  if (dominantLevel)
    cogText += `The dominant demand is **${dominantLevel}** (${cogDist[dominantLevel]} of ${total} item${total === 1 ? "" : "s"}). `;
  if (higherPct >= 40)
    cogText += `With ${higherPct}% of questions at the Analyze / Evaluate / Create tier, this leans strongly into higher-order thinking — ideal for summative or critical-reasoning assessments.`;
  else if (higherPct >= 20)
    cogText += `${higherPct}% of items reach the higher-order tiers, striking a moderate balance between mastery of foundational knowledge and applied reasoning.`;
  else
    cogText += `The majority of items operate at the foundational tiers (Remember / Understand / Apply). Appropriate for knowledge checks; consider adding an Analyze or Evaluate item to challenge advanced learners.`;
  sections.push({ heading: "Cognitive Architecture", body: cogText });

  // Item Format
  let fmtText =
    mcqCount > 0 && saCount > 0
      ? `${mcqCount} multiple-choice and ${saCount} open-response item${saCount === 1 ? "" : "s"}. The mixed format balances grading efficiency with the opportunity to observe student reasoning in written form.`
      : mcqCount === total
      ? `${total} multiple-choice item${total === 1 ? "" : "s"}. An all-MCQ design supports rapid, objective grading, though it limits assessment of written reasoning and higher-order construction skills.`
      : `${total} open-response item${total === 1 ? "" : "s"}. An all-open-response format yields rich evidence of student thinking at the cost of increased grading time.`;
  sections.push({ heading: "Item Format & Balance", body: fmtText });

  // Pacing
  if (secPerQ !== null) {
    const minPerQ = Math.round(secPerQ / 6) / 10;
    let pacingText = `Estimated pacing: ~${minPerQ} min per question. `;
    if (secPerQ < 45)
      pacingText += "This is brisk — confirm that item complexity is achievable within the time budget, especially for open-response items.";
    else if (secPerQ <= 120)
      pacingText += "A comfortable pace appropriate for both MCQ and short-response questions.";
    else
      pacingText += "Generous time allocation — suitable when items require multi-step calculation, drawing, or extended written responses.";
    sections.push({ heading: "Pacing", body: pacingText });
  }

  // Alignment with Teacher Intent
  const uarBits: string[] = [];
  if (uar?.topic) uarBits.push(`topic "${uar.topic}"`);
  if (uar?.gradeLevel) uarBits.push(`grade level ${uar.gradeLevel}`);
  if (uar?.difficulty) uarBits.push(`difficulty "${uar.difficulty}"`);
  if (uar?.questionCount) uarBits.push(`${uar.questionCount} requested items`);
  if (uar?.specialInstructions) uarBits.push(`special instructions: "${uar.specialInstructions}"`);

  const diffProfile = assessment.metadata?.difficultyProfile;
  let alignText =
    uarBits.length > 0
      ? `Teacher specified ${uarBits.join(", ")}. `
      : "No specific teacher instructions were recorded. ";
  if (diffProfile) alignText += `The Builder assigned a **${diffProfile}** difficulty profile to the final item set. `;
  alignText += "Each item passed Gatekeeper validation against the source blueprint (Bloom level, format, and answer contract verified).";
  sections.push({ heading: "Alignment with Teacher Intent", body: alignText });

  // Strengths & Flags
  const strengths: string[] = [];
  const flags: string[] = [];

  if (levels.length >= 3) strengths.push(`Spans ${levels.length} Bloom levels — strong taxonomic breadth`);
  if (mcqCount > 0 && saCount > 0) strengths.push("Mixed format supports differentiated evidence of learning");
  if (total >= 10) strengths.push("Sufficient item count for reliable score inference");
  if (higherPct >= 30) strengths.push(`${higherPct}% higher-order items — challenges critical thinking`);

  if (higherPct === 0 && total > 5)
    flags.push("No higher-order items (Analyze / Evaluate / Create) — consider adding at least one");
  if (levels.length === 1 && total > 3)
    flags.push("All items share one Bloom level — limited cognitive range");
  if (mcqCount === total && total > 8)
    flags.push("All MCQ — no opportunity to assess written or constructed reasoning");
  if (secPerQ !== null && secPerQ < 30)
    flags.push("Estimated pacing may be too tight — verify item length against time budget");

  const tagline = `${total}-question assessment${dominantLevel ? ` (dominant Bloom: ${dominantLevel})` : ""}${title ? ` on "${title}"` : ""} — ${higherPct}% higher-order`;

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
            const tips = philosopherNotes
              .split("\n")
              .filter((l) => l.startsWith("💡"));
            if (tips.length === 0) return null;
            return (
              <div className="av-report-tips">
                <p className="av-report-col-heading av-report-col-heading--blue">💡 Prompt Suggestions</p>
                <ul className="av-report-list">
                  {tips.map((tip) => (
                    <li key={tip}>{tip.replace(/^💡 Tip — /, "")}</li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {philosopherAnalysis && (
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

          {teacherFeedback && (
            <div className="av-report-section">
              <h3 className="av-report-section-heading">Teacher Feedback</h3>
              <div className="av-report-section-body" style={{ fontSize: "0.9rem" }}>
                {teacherFeedback.summary && (
                  <p style={{ marginBottom: "0.75rem", fontStyle: "italic" }}>
                    {teacherFeedback.summary}
                  </p>
                )}
                {teacherFeedback.positives && teacherFeedback.positives.length > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <p style={{ marginBottom: "0.25rem", fontWeight: "bold", color: "#2e7d32" }}>✓ Positives</p>
                    <ul style={{ marginLeft: "1rem" }}>
                      {teacherFeedback.positives.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {teacherFeedback.suggestions && teacherFeedback.suggestions.length > 0 && (
                  <div>
                    <p style={{ marginBottom: "0.25rem", fontWeight: "bold", color: "#1976d2" }}>💡 Suggestions</p>
                    <ul style={{ marginLeft: "1rem" }}>
                      {teacherFeedback.suggestions.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
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

// ── sub-components ────────────────────────────────────────────────────────────

function QuestionItem({ item, showAnswer }: { item: FinalAssessmentItem; showAnswer: boolean }) {
  const isMC = item.questionType === "multipleChoice";
  const answerLines = isMC ? 0 : 3;

  return (
    <div className="av-question">
      <div className="av-q-number">{item.questionNumber}.</div>
      <div className="av-q-body">


        {isMC && item.options && (
          <ul className="av-options">
            {item.options.map((opt, i) => (
              <li
                key={i}
                className="av-option"
                style={
                  showAnswer && opt === item.answer
                    ? { fontWeight: 700, textDecoration: "underline" }
                    : undefined
                }
              >
                {opt}
              </li>
            ))}
          </ul>
        )}

        {!isMC && (
          <div className="av-answer-lines">
            {Array.from({ length: answerLines }).map((_, i) => (
              <div key={i} className="av-answer-line" />
            ))}
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
}

export function AssessmentViewer({ assessment, title, subtitle, uar, philosopherNotes, philosopherAnalysis, teacherFeedback }: AssessmentViewerProps) {
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [wordLoading, setWordLoading] = useState(false);
  const [answerKeyLoading, setAnswerKeyLoading] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const displayTitle = title ?? "Assessment";
  const totalTime = totalMinutes(assessment.metadata?.totalEstimatedTimeSeconds);

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try {
      await downloadFinalAssessmentPDF(assessment, { title: displayTitle, subtitle });
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadWord() {
    setWordLoading(true);
    try {
      await downloadFinalAssessmentWord(assessment, { title: displayTitle, subtitle });
    } finally {
      setWordLoading(false);
    }
  }

  async function handleDownloadAnswerKey() {
    setAnswerKeyLoading(true);
    try {
      await downloadFinalAssessmentPDF(assessment, { title: displayTitle, subtitle, includeAnswerKey: true });
    } finally {
      setAnswerKeyLoading(false);
    }
  }

  function handlePrint() {
    setShowAnswerKey(true);
    setTimeout(() => window.print(), 150);
  }

  function handleCopyAIPrompt() {
    const u = uar ?? {};
    const qCount = assessment.totalItems;
    const type = u.assessmentType ?? "assessment";
    const grades = Array.isArray(u.gradeLevels) && u.gradeLevels.length
      ? `Grade ${(u.gradeLevels as string[]).join("/")}`
      : "";
    const course = u.course ?? "";
    const level = u.studentLevel ?? "";
    const topic = u.topic ?? u.unitName ?? title ?? "the assigned topic";
    const timeStr = u.time ? `${u.time} minutes` : "";
    const formatLabel: Record<string, string> = {
      mcqOnly: "multiple choice", saOnly: "short answer", essayOnly: "essay",
      frqOnly: "free response (FRQ)", fitbOnly: "fill-in-the-blank",
      trueFalseOnly: "true/false", mixed: "mixed format",
    };
    const fmt = u.questionFormat ? (formatLabel[u.questionFormat] ?? u.questionFormat) : "";
    const multiPart = u.multiPartQuestions === "yes";

    const lines: string[] = [
      `Generate a ${qCount}-question ${fmt ? fmt + " " : ""}${type} for ${[grades, course, level ? level + " level" : ""].filter(Boolean).join(" ")}.`,
      `Topic: ${topic}`,
    ];
    if (timeStr) lines.push(`Time available: ${timeStr}`);
    if (multiPart) lines.push("Include multi-part questions where parts build progressively (Part A → Part B → Part C).");
    if (u.bloomPreference && u.bloomPreference !== "balanced") {
      const bloomMap: Record<string, string> = {
        lower: "Focus on recall-level (Remember / Understand) questions.",
        apply: "Emphasize application-level questions.",
        higher: "Prioritize higher-order thinking (Analyze / Evaluate / Create).",
      };
      lines.push(bloomMap[u.bloomPreference] ?? "");
    }
    if (u.additionalDetails) lines.push(u.additionalDetails);
    lines.push("");
    lines.push("Provide an answer key at the end.");

    navigator.clipboard.writeText(lines.filter(Boolean).join("\n")).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2500);
    });
  }

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
            <button className="av-btn av-btn-outline" onClick={handlePrint}>
              🖨 Print
            </button>
            <button
              className="av-btn av-btn-primary"
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
            >
              {pdfLoading ? "Generating…" : "⬇ PDF"}
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
              onClick={handleDownloadAnswerKey}
              disabled={answerKeyLoading}
              title="Download PDF with answer key appended"
            >
              {answerKeyLoading ? "Generating…" : "🔑 Answer Key"}
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
              onClick={handleCopyAIPrompt}
              title="Copy a plain-language prompt you can paste into ChatGPT, Flint AI, or any other AI tool"
              style={promptCopied ? { borderColor: "#16a34a", color: "#16a34a" } : undefined}
            >
              {promptCopied ? "✓ Copied!" : "📋 Use in AI"}
            </button>
          </div>
        </div>

        <div className="av-meta">
          <span className="av-meta-item">📋 {assessment.totalItems} questions</span>
          <span className="av-meta-item">⏱ {totalTime}</span>
          <span className="av-meta-item">📅 {formatDate(assessment.generatedAt)}</span>
        </div>

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
      <div className="av-questions">
        {assessment.items.map((item) => (
          <QuestionItem key={item.slotId} item={item} showAnswer={showAnswerKey} />
        ))}
      </div>

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
            {assessment.items.map((item) => (
              <div key={item.slotId} className="av-ak-entry">
                <span className="av-ak-num">{item.questionNumber}.</span>
                <span>{item.answer ?? "—"}</span>
              </div>
            ))}
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
