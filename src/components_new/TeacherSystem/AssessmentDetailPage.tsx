// src/components_new/TeacherSystem/AssessmentDetailPage.tsx
//
// Phase 2 + Phase 3 — Versioned assessment viewer with Regenerate + Branch.
// Loads assessment_templates + assessment_versions from Supabase,
// renders the selected version via AssessmentViewer, and lets teachers
// regenerate the same UAR or branch it with edits.

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/supabase/client";
import type { FinalAssessment } from "@/pipeline/agents/builder/FinalAssessment";
import type { UnifiedAssessmentRequest } from "@/pipeline/contracts";
import { generateAssessment } from "@/config/aiConfig";
import { AssessmentViewer } from "../Pipeline/AssessmentViewer";
import { ReportResultsPage } from "./ReportResultsPage";
import { analyzeResults } from "@/pipeline/agents/analyzeResults";
import type { PerformanceEntry, AnalysisResult } from "@/pipeline/agents/analyzeResults";
import { DossierManager } from "@/system/dossier/DossierManager";
import type { AgentDossierData } from "@/system/dossier/DossierManager";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateRow {
  id: string;
  user_id: string;
  domain: string | null;
  uar_json: Record<string, any> | null;
  created_at: string;
  latest_version_id: string | null;
  /** Teacher-assigned active/distributed version. Distinct from latest_version_id. */
  active_version_id: string | null;
}

/** Editable subset of uar_json surfaced in the Branch form */
interface BranchFields {
  topic: string;
  time: number;
  assessmentType: string;
  additionalDetails: string;
}

interface VersionRow {
  id: string;
  version_number: number;
  created_at: string;
  quality_score: number | null;
  assessment_json: FinalAssessment;
  blueprint_json: Record<string, any> | null;
  parent_version_id: string | null;
  token_usage: Record<string, any> | null;
}

interface AssessmentDetailPageProps {
  templateId: string;
  onBack: () => void;
}

interface ResultRow {
  id: string;
  assessment_version_id: string;
  /** Canonical shape: { itemStats: PerformanceEntry[] }. Most recent row is canonical. */
  performance_json: { itemStats: PerformanceEntry[] };
  analysis_json: AnalysisResult | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Strict CSV parser — expects header row + rows of questionNumber,percentCorrect */
function parseCSV(text: string): PerformanceEntry[] | string {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return "CSV is empty.";
  const startIdx = lines[0].toLowerCase().includes("question") ? 1 : 0;
  const results: PerformanceEntry[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    if (parts.length < 2 || parts.every((p) => p === "")) continue;
    const questionNumber = parseInt(parts[0], 10);
    const percentCorrect = parseFloat(parts[1]);
    if (isNaN(questionNumber) || isNaN(percentCorrect)) {
      return `Row ${i + 1} is invalid: "${lines[i]}"`;
    }
    if (percentCorrect < 0 || percentCorrect > 100) {
      return `Row ${i + 1}: percentCorrect must be 0–100, got ${percentCorrect}`;
    }
    results.push({ questionNumber, percentCorrect });
  }
  if (results.length === 0) return "CSV contains no data rows.";
  return results;
}

const ASSESSMENT_LABELS: Record<string, string> = {
  bellRinger: "Bell Ringer",
  exitTicket: "Exit Ticket",
  quiz: "Quiz",
  test: "Test",
  worksheet: "Worksheet",
  testReview: "Test Review",
};

function titleFor(uar: Record<string, any>, domain: string | null): string {
  const parts = [
    uar.course ?? uar.topic ?? domain ?? "Assessment",
    uar.unitName ?? uar.lessonName,
  ].filter(Boolean);
  return parts.join(" – ");
}


// ─────────────────────────────────────────────────────────────────────────────
// Student Results Panel
// ─────────────────────────────────────────────────────────────────────────────

function StudentResultsPanel({
  questionCount,
  existingResult,
  onSubmit,
  isSaving,
  saveError,
}: {
  questionCount: number;
  existingResult: ResultRow | null;
  onSubmit: (perf: PerformanceEntry[]) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [rows, setRows] = useState<{ pct: string }[]>(
    () => Array.from({ length: Math.max(questionCount, 1) }, () => ({ pct: "" }))
  );
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<PerformanceEntry[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync row count with questionCount prop (e.g. when version changes)
  useEffect(() => {
    setRows(Array.from({ length: Math.max(questionCount, 1) }, () => ({ pct: "" })));
    setCsvError(null);
    setCsvPreview(null);
  }, [questionCount]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string ?? "";
      const result = parseCSV(text);
      if (typeof result === "string") {
        setCsvError(result);
        setCsvPreview(null);
      } else {
        setCsvError(null);
        setCsvPreview(result);
      }
    };
    reader.readAsText(file);
  }

  async function handleSubmit() {
    let perf: PerformanceEntry[] | string;
    if (mode === "csv") {
      if (!csvPreview) { setCsvError("Please upload a valid CSV first."); return; }
      perf = csvPreview;
    } else {
      const entries: PerformanceEntry[] = [];
      for (let i = 0; i < rows.length; i++) {
        const val = parseFloat(rows[i].pct);
        if (isNaN(val)) { setCsvError(`Q${i + 1}: enter a number between 0 and 100.`); return; }
        if (val < 0 || val > 100) { setCsvError(`Q${i + 1}: must be 0–100.`); return; }
        entries.push({ questionNumber: i + 1, percentCorrect: val });
      }
      perf = entries;
      setCsvError(null);
    }
    await onSubmit(perf as PerformanceEntry[]);
    if (!saveError) setOpen(false);
  }

  const pill: React.CSSProperties = {
    padding: "0.2rem 0.75rem",
    borderRadius: "999px",
    border: "1.5px solid var(--color-border, #ddd)",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
  };

  return (
    <div
      style={{
        border: "1px solid var(--color-border, #e5e7eb)",
        borderRadius: "10px",
        marginBottom: "1.5rem",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1.25rem",
          background: "var(--bg-secondary, #f9fafb)",
          border: "none",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "inherit",
          textAlign: "left",
        }}
      >
        <span>
          📊 Student Results
          {existingResult && (
            <span
              style={{
                marginLeft: "0.6rem",
                padding: "0.1rem 0.5rem",
                borderRadius: "999px",
                fontSize: "0.72rem",
                background: "#dcfce7",
                color: "#166534",
                fontWeight: 700,
              }}
            >
              Saved
            </span>
          )}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #6b7280)", fontWeight: 400 }}>
          {open ? "Hide ▲" : "Show ▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "var(--bg-primary, #fff)",
            fontSize: "0.88rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          {existingResult && (
            <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-secondary, #6b7280)" }}>
              Results saved on{" "}
              {new Date(existingResult.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {" "}— re-enter below to update.
            </p>
          )}

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setMode("manual")}
              style={{
                ...pill,
                background: mode === "manual" ? "var(--color-accent, #4f46e5)" : "transparent",
                color: mode === "manual" ? "#fff" : "inherit",
                borderColor: mode === "manual" ? "var(--color-accent, #4f46e5)" : "var(--color-border, #ddd)",
              }}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setMode("csv")}
              style={{
                ...pill,
                background: mode === "csv" ? "var(--color-accent, #4f46e5)" : "transparent",
                color: mode === "csv" ? "#fff" : "inherit",
                borderColor: mode === "csv" ? "var(--color-accent, #4f46e5)" : "var(--color-border, #ddd)",
              }}
            >
              CSV Upload
            </button>
          </div>

          {/* Manual entry table */}
          {mode === "manual" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "380px" }}>
                <thead>
                  <tr style={{ fontSize: "0.82rem", color: "var(--text-secondary, #6b7280)" }}>
                    <th style={{ textAlign: "left", padding: "0.3rem 0.5rem", fontWeight: 600 }}>Question</th>
                    <th style={{ textAlign: "left", padding: "0.3rem 0.5rem", fontWeight: 600 }}>% Correct</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          padding: "0.3rem 0.5rem",
                          color: "var(--text-secondary, #6b7280)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td style={{ padding: "0.25rem 0.5rem" }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={r.pct}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((row, j) =>
                                j === i ? { pct: e.target.value } : row
                              )
                            )
                          }
                          placeholder="0–100"
                          style={{
                            width: "72px",
                            padding: "0.3rem 0.5rem",
                            borderRadius: "6px",
                            border: "1.5px solid var(--color-border, #ddd)",
                            background: "var(--bg-primary, #fff)",
                            color: "inherit",
                            fontSize: "0.85rem",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CSV upload */}
          {mode === "csv" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.82rem",
                  color: "var(--text-secondary, #6b7280)",
                  fontFamily: "monospace",
                  background: "var(--bg-secondary, #f9fafb)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                }}
              >
                Expected format:<br />
                questionNumber,percentCorrect<br />
                1,85<br />
                2,60<br />
                3,40
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                style={{ fontSize: "0.85rem" }}
              />
              {csvPreview && (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#166534" }}>
                  ✓ {csvPreview.length} row{csvPreview.length !== 1 ? "s" : ""} detected
                </p>
              )}
            </div>
          )}

          {/* Errors */}
          {csvError && (
            <p style={{ margin: 0, color: "var(--color-error, #ef4444)", fontSize: "0.83rem" }}>
              {csvError}
            </p>
          )}
          {saveError && (
            <p style={{ margin: 0, color: "var(--color-error, #ef4444)", fontSize: "0.83rem" }}>
              {saveError}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-accent, #4f46e5)",
                color: "#fff",
                cursor: isSaving ? "wait" : "pointer",
                fontSize: "0.88rem",
                fontWeight: 600,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Saving…" : "Save Results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights Panel
// ─────────────────────────────────────────────────────────────────────────────

function AiInsightsPanel({
  analysis,
  isLoading,
  error,
  resultsDate,
}: {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  resultsDate: string | null;
}) {
  const [open, setOpen] = useState(false);

  const healthStrong = analysis?.overallAssessmentHealth === "Strong";

  return (
    <div
      style={{
        border: "1px solid var(--color-border, #e5e7eb)",
        borderRadius: "10px",
        marginBottom: "1.5rem",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1.25rem",
          background: "var(--bg-secondary, #f9fafb)",
          border: "none",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "inherit",
          textAlign: "left",
        }}
      >
        <span>
          🔍 AI Insights
          {isLoading && (
            <span
              style={{
                marginLeft: "0.6rem",
                fontSize: "0.78rem",
                color: "var(--text-secondary, #6b7280)",
                fontWeight: 400,
              }}
            >
              Analyzing…
            </span>
          )}
          {analysis && !isLoading && (
            <span
              style={{
                marginLeft: "0.6rem",
                padding: "0.1rem 0.55rem",
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 700,
                background: healthStrong ? "#dcfce7" : "#fef9c3",
                color: healthStrong ? "#166534" : "#854d0e",
              }}
            >
              {analysis.overallAssessmentHealth}
            </span>
          )}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #6b7280)", fontWeight: 400 }}>
          {open ? "Hide ▲" : "Show ▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "var(--bg-primary, #fff)",
            fontSize: "0.88rem",
            lineHeight: 1.65,
            color: "var(--text-primary, #374151)",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          {isLoading && (
            <p style={{ margin: 0, color: "var(--text-secondary, #6b7280)", fontStyle: "italic" }}>
              Generating insights — this may take a few seconds…
            </p>
          )}

          {!isLoading && resultsDate && (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary, #6b7280)" }}>
              Results from:{" "}
              <strong>
                {new Date(resultsDate).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
            </p>
          )}

          {error && (
            <p style={{ margin: 0, color: "var(--color-error, #ef4444)" }}>
              {error}
            </p>
          )}

          {!isLoading && !error && !analysis && (
            <p style={{ margin: 0, color: "var(--text-secondary, #6b7280)" }}>
              Submit student results above to generate insights.
            </p>
          )}

          {analysis && !isLoading && (
            <>
              {/* Overall health */}
              <div
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  padding: "0.35rem 0.9rem",
                  borderRadius: "999px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  background: healthStrong ? "#dcfce7" : "#fef9c3",
                  color: healthStrong ? "#166534" : "#854d0e",
                }}
              >
                Overall: {analysis.overallAssessmentHealth}
              </div>

              {/* Confusion hotspots */}
              {analysis.confusionHotspots.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 0.35rem 0", fontWeight: 600 }}>Confusion Hotspots</p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {analysis.confusionHotspots.map((h, i) => (
                      <li key={i} style={{ marginBottom: "0.25rem" }}>
                        <strong>Q{h.questionNumber}:</strong> {h.note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pacing issues */}
              {analysis.pacingIssues && (
                <div>
                  <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600 }}>Pacing Observation</p>
                  <p style={{ margin: 0 }}>{analysis.pacingIssues}</p>
                </div>
              )}

              {/* Cognitive load observations */}
              {analysis.cognitiveLoadObservations.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 0.35rem 0", fontWeight: 600 }}>Observations</p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {analysis.cognitiveLoadObservations.map((o, i) => (
                      <li key={i} style={{ marginBottom: "0.25rem" }}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended adjustments */}
              {analysis.recommendedAdjustments.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 0.35rem 0", fontWeight: 600 }}>Suggested Improvements</p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {analysis.recommendedAdjustments.map((r, i) => (
                      <li key={i} style={{ marginBottom: "0.25rem" }}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Generation Notes panel (teacher-language translation of quality data)
// ─────────────────────────────────────────────────────────────────────────────

function reliabilityColor(score: number) {
  if (score >= 80) return { text: "#166534", bar: "#22c55e" };
  if (score >= 55) return { text: "#854d0e", bar: "#f59e0b" };
  return { text: "#991b1b", bar: "#ef4444" };
}

function MetricBar({ label, score, description }: { label: string; score: number; description: string }) {
  const c = reliabilityColor(score);
  return (
    <div style={{ marginBottom: "0.65rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: c.text }}>{score}/100</span>
      </div>
      <div style={{ height: 5, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginBottom: "0.2rem" }}>
        <div style={{ height: "100%", width: `${score}%`, background: c.bar, borderRadius: 999, transition: "width 0.4s" }} />
      </div>
      <div style={{ fontSize: "0.74rem", color: "#6b7280", lineHeight: 1.4 }}>{description}</div>
    </div>
  );
}

function AiGenerationNotes({ version, template }: { version: VersionRow; template: TemplateRow }) {
  const [open, setOpen] = useState(false);
  const [dossier, setDossier] = useState<AgentDossierData | null>(null);

  const blueprint  = version.blueprint_json ?? {};
  const plan       = blueprint.plan ?? {};
  const tokenUsage = version.token_usage ?? {};
  const score      = version.quality_score;
  const uar        = template.uar_json ?? {};

  // Load dossier the first time the panel is opened
  useEffect(() => {
    if (!open || dossier !== null) return;
    const domain = blueprint.domain ?? template.domain ?? "General";
    DossierManager.loadAgentDossier(template.user_id, `writer:${domain}`)
      .then(d => setDossier(d))
      .catch(() => {/* non-fatal */});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Quality badge ───────────────────────────────────────────────────────
  let qualityLabel = "";
  let qualityDesc  = "";
  const badgeBg    = score != null ? (score >= 8 ? "#dcfce7" : score >= 5 ? "#fef9c3" : "#fee2e2") : undefined;
  const badgeColor = score != null ? (score >= 8 ? "#166534" : score >= 5 ? "#854d0e" : "#991b1b") : undefined;
  if (score != null) {
    if (score >= 9)      { qualityLabel = "Strong";     qualityDesc = "This assessment passed all quality checks with minimal adjustments."; }
    else if (score >= 7) { qualityLabel = "Good";       qualityDesc = "Questions were well-formed. Minor edits were applied automatically."; }
    else if (score >= 5) { qualityLabel = "Fair";       qualityDesc = "Some questions needed adjustment. The system corrected them before delivery."; }
    else                 { qualityLabel = "Needs Work"; qualityDesc = "Significant corrections were made. You may want to review the questions."; }
  }

  // ── Pacing ──────────────────────────────────────────────────────────────
  const requestedMins: number | null = uar.time != null ? Number(uar.time) : null;
  const totalItems = version.assessment_json?.totalItems ?? 0;
  const realisticMins: number | null =
    blueprint.realisticTotalMinutes != null
      ? Number(blueprint.realisticTotalMinutes)
      : plan.pacingSecondsPerItem != null && totalItems > 0
        ? Math.round((plan.pacingSecondsPerItem * totalItems) / 60)
        : null;

  let pacingLine = "";
  if (requestedMins != null && realisticMins != null) {
    const diff = realisticMins - requestedMins;
    if (Math.abs(diff) <= 1)  pacingLine = `Pacing matched your ${requestedMins}-minute target.`;
    else if (diff < 0)        pacingLine = `Questions were adjusted to fit within your ${requestedMins} minutes.`;
    else                      pacingLine = `The assessment may run about ${diff} minute${Math.abs(diff) !== 1 ? "s" : ""} over your target.`;
  } else if (realisticMins != null) {
    pacingLine = `Estimated completion time: ~${realisticMins} minute${realisticMins !== 1 ? "s" : ""}.`;
  }

  // ── Revisions ───────────────────────────────────────────────────────────
  const rewriteCount: number = blueprint.rewriteCount ?? tokenUsage.rewriteCount ?? 0;
  let revisionLine = "";
  if      (rewriteCount === 0) revisionLine = "Questions were generated cleanly with no corrections needed.";
  else if (rewriteCount <= 2) revisionLine = `${rewriteCount} question${rewriteCount > 1 ? "s" : ""} were lightly revised for clarity.`;
  else if (rewriteCount <= 5) revisionLine = `${rewriteCount} questions were revised. The system caught and fixed issues before you saw them.`;
  else                        revisionLine = `${rewriteCount} corrections were applied — more than usual. The system is still calibrating for this topic.`;

  // ── Teacher-readable notes ───────────────────────────────────────────────
  const forbidden = /bloom|gatekeeper|severity|trust|drift|agent/i;
  const notes: string[] = [
    ...(blueprint.constraintWarnings ?? []),
    ...(blueprint.truncationEvents   ?? []),
    ...(blueprint.notes              ?? []),
  ].filter((s: string) => !forbidden.test(s));

  if (version.parent_version_id) {
    notes.push("This is a revised version, built on a previous attempt.");
  }

  // ── Dossier-derived metrics ─────────────────────────────────────────────
  const trust100     = dossier?.trustScore100     ?? (dossier?.trustScore     != null ? dossier.trustScore     * 10 : null);
  const stability100 = dossier?.stabilityScore100 ?? (dossier?.stabilityScore != null ? dossier.stabilityScore * 10 : null);
  const alignment100 = dossier?.alignmentScore ?? null;
  const totalRuns    = dossier?.domainMastery?.runs ?? 0;
  const cleanRuns    = dossier?.domainMastery?.cleanRuns ?? 0;
  const weakCats     = dossier?.weaknessCategories;
  const topWeakness  = weakCats
    ? (Object.entries(weakCats) as [string, number][])
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v > 0)
        .map(([k]) =>
          k === "spacing"            ? "number/letter spacing"
          : k === "notation"         ? "math notation"
          : k === "drift"            ? "staying on topic"
          : k === "hallucination"    ? "invented content"
          : k === "difficultyMismatch" ? "difficulty calibration"
          : k === "structureViolations" ? "question structure"
          : k)
        .slice(0, 2)
    : [];

  const passFailEntries = dossier?.passFailByDomain
    ? (Object.entries(dossier.passFailByDomain) as [string, { passes: number; fails: number }][])
    : [];
  const overallPassRate =
    passFailEntries.length > 0
      ? Math.round(
          (passFailEntries.reduce((s, [, v]) => s + v.passes, 0) /
            Math.max(1, passFailEntries.reduce((s, [, v]) => s + v.passes + v.fails, 0))) * 100
        )
      : null;

  const hasDossier = trust100 != null || stability100 != null || alignment100 != null;

  return (
    <div
      style={{
        border: "1px solid var(--color-border, #e5e7eb)",
        borderRadius: "10px",
        marginBottom: "1.5rem",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1.25rem",
          background: "var(--bg-secondary, #f9fafb)",
          border: "none",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "inherit",
          textAlign: "left",
        }}
      >
        <span>📋 AI Generation Notes</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #6b7280)", fontWeight: 400 }}>
          {open ? "Hide ▲" : "Show ▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "var(--bg-primary, #fff)",
            fontSize: "0.88rem",
            lineHeight: 1.65,
            color: "var(--text-primary, #374151)",
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem",
          }}
        >
          {/* Quality badge + description */}
          {qualityLabel && score != null && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <div style={{
                display: "inline-flex", alignItems: "center",
                padding: "0.3rem 0.8rem", borderRadius: "999px",
                fontSize: "0.8rem", fontWeight: 700,
                background: badgeBg, color: badgeColor,
              }}>
                {qualityLabel}
              </div>
              <span style={{ fontSize: "0.84rem", color: "var(--text-secondary, #6b7280)" }}>
                {qualityDesc}
              </span>
            </div>
          )}

          {/* Pacing */}
          {pacingLine && (
            <p style={{ margin: 0 }}>⏱️ <strong>Time: </strong>{pacingLine}</p>
          )}

          {/* Revisions */}
          <p style={{ margin: 0 }}>✏️ <strong>Revisions: </strong>{revisionLine}</p>

          {/* Reliability from dossier */}
          {hasDossier && (
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.75rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af", marginBottom: "0.65rem" }}>
                Writer performance in this subject
              </div>

              {trust100 != null && (
                <MetricBar
                  label="Reliability"
                  score={trust100}
                  description={
                    trust100 >= 80 ? "Questions consistently matched your subject and grade level."
                    : trust100 >= 55 ? "Most questions were clean. A few needed automatic fixes."
                    : "This subject is still calibrating — more runs will improve reliability."
                  }
                />
              )}
              {alignment100 != null && (
                <MetricBar
                  label="Topic Fit"
                  score={alignment100}
                  description={
                    alignment100 >= 80 ? "Questions stayed tightly aligned to your chosen topic."
                    : alignment100 >= 55 ? "Minor topic drift was detected and corrected."
                    : "Questions drifted from topic and needed correction."
                  }
                />
              )}
              {stability100 != null && (
                <MetricBar
                  label="Run-to-Run Consistency"
                  score={stability100}
                  description={
                    stability100 >= 80 ? "Output quality is consistent across multiple runs."
                    : stability100 >= 55 ? "Quality varies slightly run to run but is improving."
                    : "This subject is still calibrating. Quality will improve with more runs."
                  }
                />
              )}

              {totalRuns > 0 && (
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                  📊 Based on <strong>{totalRuns}</strong> run{totalRuns !== 1 ? "s" : ""} in this subject
                  {overallPassRate != null && ` — passed quality checks ${overallPassRate}% of the time`}.
                  {cleanRuns > 0 && totalRuns > 0 && ` ${Math.round((cleanRuns / totalRuns) * 100)}% of runs needed zero corrections.`}
                </p>
              )}

              {topWeakness.length > 0 && (
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                  🔧 <strong>Currently improving: </strong>
                  {topWeakness.join(" and ")}. These are automatically corrected before you see the output.
                </p>
              )}
            </div>
          )}

          {/* Misc notes */}
          {notes.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.84rem" }}>
              {notes.map((note, i) => (
                <li key={i} style={{ marginBottom: "0.3rem" }}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AssessmentDetailPage({ templateId, onBack }: AssessmentDetailPageProps) {
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Phase 3 — Regenerate state ─────────────────────────────────────────
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // ── Phase 3 — Branch state ─────────────────────────────────────────────
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchFields, setBranchFields] = useState<BranchFields | null>(null);
  const [isBranching, setIsBranching] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [showReportResults, setShowReportResults] = useState(false);

  // ── Phase 3 — Assign active version state ───────────────────────────────
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // ── Phase 4 — Student Results state ──────────────────────────────────────
  const [existingResult, setExistingResult] = useState<ResultRow | null>(null);
  const [isSavingResults, setIsSavingResults] = useState(false);
  const [saveResultsError, setSaveResultsError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Derived — placed here so Phase 4 hooks can reference it
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setTemplate(null);
      setVersions([]);
      setSelectedVersionId(null);

      try {
        const [{ data: tmpl, error: tmplErr }, { data: vers, error: versErr }] =
          await Promise.all([
            supabase
              .from("assessment_templates")
              .select("*")
              .eq("id", templateId)
              .single(),
            supabase
              .from("assessment_versions")
              .select("*")
              .eq("template_id", templateId)
              .order("version_number", { ascending: true }),
          ]);

        if (cancelled) return;
        if (tmplErr) throw tmplErr;
        if (versErr) throw versErr;

        setTemplate(tmpl);
        const versionList = (vers ?? []) as VersionRow[];
        setVersions(versionList);

        if (tmpl?.latest_version_id) {
          setSelectedVersionId(tmpl.latest_version_id);
        } else if (versionList.length > 0) {
          setSelectedVersionId(versionList[versionList.length - 1].id);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load assessment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [templateId]);

  // ── Phase 4 — Load existing results when version changes ─────────────────
  useEffect(() => {
    if (!selectedVersionId) {
      setExistingResult(null);
      setCurrentAnalysis(null);
      return;
    }

    let cancelled = false;

    async function loadResults() {
      const { data } = await supabase
        .from("assessment_results")
        .select("id, assessment_version_id, performance_json, analysis_json, created_at")
        .eq("assessment_version_id", selectedVersionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const row = data as ResultRow | null;
      setExistingResult(row);
      setCurrentAnalysis(row?.analysis_json ?? null);
    }

    loadResults().catch((e) => console.warn("[loadResults]", e?.message));
    return () => { cancelled = true; };
  }, [selectedVersionId]);

  // ── Phase 4 — Submit results + run analysis ───────────────────────────────
  const handleSubmitResults = useCallback(
    async (perf: PerformanceEntry[]) => {
      if (!selectedVersionId || !selectedVersion) return;
      setSaveResultsError(null);
      setIsSavingResults(true);

      try {
        // 1. Insert performance row (canonical shape: { itemStats: [...] })
        const { data: inserted, error: insertErr } = await supabase
          .from("assessment_results")
          .insert({
            assessment_version_id: selectedVersionId,
            performance_json: { itemStats: perf },
          })
          .select("id, assessment_version_id, performance_json, analysis_json, created_at")
          .single();

        if (insertErr || !inserted) throw new Error(insertErr?.message ?? "Insert failed");

        const resultRow = inserted as ResultRow;
        setExistingResult(resultRow);
        setIsSavingResults(false);

        // 2. Run analysis (async — spinner, non-blocking)
        setIsAnalyzing(true);
        setAnalyzeError(null);

        try {
          const result = await analyzeResults({
            assessmentJson: selectedVersion.assessment_json,
            performanceJson: perf,
            blueprintJson: selectedVersion.blueprint_json,
          });

          // 3. Persist analysis back to the result row
          await supabase
            .from("assessment_results")
            .update({ analysis_json: result })
            .eq("id", resultRow.id);

          setCurrentAnalysis(result);
          setExistingResult((prev) =>
            prev ? { ...prev, analysis_json: result } : prev
          );
        } catch (aErr: any) {
          setAnalyzeError(aErr?.message ?? "Analysis failed. Please try again.");
        } finally {
          setIsAnalyzing(false);
        }
      } catch (e: any) {
        setSaveResultsError(e?.message ?? "Failed to save results.");
        setIsSavingResults(false);
      }
    },
    [selectedVersionId, selectedVersion]
  );

  // ── Re-fetch versions after a generation and auto-select the newest ──────
  const reloadVersions = useCallback(async () => {
    const { data } = await supabase
      .from("assessment_versions")
      .select("*")
      .eq("template_id", templateId)
      .order("version_number", { ascending: true });

    const updated = (data ?? []) as VersionRow[];
    setVersions(updated);
    if (updated.length > 0) {
      setSelectedVersionId(updated[updated.length - 1].id);
    }
  }, [templateId]);

  // ── Build a minimal but complete UAR from the stored uar_json ────────────
  function buildUarFromStored(
    base: Record<string, any>,
    userId: string,
    overrides: Partial<Record<string, any>> = {}
  ): UnifiedAssessmentRequest {
    return {
      mode: "write",
      subscriptionTier: "free",
      sourceDocuments: [],
      userId,
      course:            base.course            ?? "General",
      gradeLevels:       Array.isArray(base.gradeLevels) ? base.gradeLevels : [],
      unitName:          base.unitName          ?? "",
      lessonName:        base.lessonName        ?? null,
      topic:             base.topic             ?? null,
      additionalDetails: base.additionalDetails ?? null,
      time:              Number(base.time ?? 20),
      assessmentType:    base.assessmentType    ?? "quiz",
      studentLevel:      base.studentLevel      ?? "on-level",
      questionTypes:     base.questionTypes,
      questionCount:     base.questionCount,
      ...overrides,
    } as UnifiedAssessmentRequest;
  }

  // ── Regenerate: same UAR, new version under same template ────────────────
  const handleRegenerate = useCallback(async () => {
    if (!template || !selectedVersionId) return;
    setRegenerateError(null);
    setIsRegenerating(true);
    try {
      const uar = buildUarFromStored(template.uar_json ?? {}, template.user_id, {
        templateId:        template.id,
        previousVersionId: selectedVersionId,
      });
      await generateAssessment(uar);
      // ── Log regeneration as a mild teacher dissatisfaction signal ──────
      const _domain = template.domain ?? "General";
      DossierManager.logTeacherOverride(template.user_id, `writer:${_domain}`, {
        field: "regenerate",
        oldValue: selectedVersionId,
        newValue: "new_version",
        reason: "Teacher requested regeneration with same settings — mild dissatisfaction signal",
      }).catch(() => {});
      // One incorrect "vote" nudges scaffold level; no misconceptions needed here
      DossierManager.processStudentPerformance(template.user_id, `writer:${_domain}`, {
        correct: 0,
        incorrect: 1,
        misconceptions: ["teacher-regenerated"],
      }).catch(() => {});
      await reloadVersions();
    } catch (e: any) {
      setRegenerateError(e?.message ?? "Regeneration failed. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  }, [template, selectedVersionId, reloadVersions]);

  // ── Open branch form pre-filled from current uar_json ───────────────────
  function openBranchForm() {
    if (!template) return;
    const u = template.uar_json ?? {};
    setBranchFields({
      topic:             u.topic             ?? "",
      time:              Number(u.time ?? 20),
      assessmentType:    u.assessmentType    ?? "quiz",
      additionalDetails: u.additionalDetails ?? "",
    });
    setBranchError(null);
    setShowBranchForm(true);
  }

  // ── Branch: modified UAR, new version under same template ───────────────
  const handleBranch = useCallback(async () => {
    if (!template || !selectedVersionId || !branchFields) return;
    setBranchError(null);
    setIsBranching(true);
    try {
      const uar = buildUarFromStored(template.uar_json ?? {}, template.user_id, {
        topic:             branchFields.topic             || null,
        time:              branchFields.time,
        assessmentType:    branchFields.assessmentType    as UnifiedAssessmentRequest["assessmentType"],
        additionalDetails: branchFields.additionalDetails || null,
        templateId:        template.id,
        previousVersionId: selectedVersionId,
      });
      await generateAssessment(uar);
      // ── Log each changed field as a teacher override (stronger dissatisfaction signal) ──
      const _domain2 = template.domain ?? "General";
      const _prevUar = template.uar_json ?? {};
      const _changedFields: Array<{ field: string; oldValue: any; newValue: any }> = [];
      if (branchFields!.topic !== (_prevUar.topic ?? "")) _changedFields.push({ field: "topic", oldValue: _prevUar.topic, newValue: branchFields!.topic });
      if (branchFields!.time !== Number(_prevUar.time ?? 20)) _changedFields.push({ field: "time", oldValue: _prevUar.time, newValue: branchFields!.time });
      if (branchFields!.assessmentType !== (_prevUar.assessmentType ?? "")) _changedFields.push({ field: "assessmentType", oldValue: _prevUar.assessmentType, newValue: branchFields!.assessmentType });
      if (branchFields!.additionalDetails !== (_prevUar.additionalDetails ?? "")) _changedFields.push({ field: "additionalDetails", oldValue: _prevUar.additionalDetails, newValue: branchFields!.additionalDetails });
      for (const change of _changedFields) {
        DossierManager.logTeacherOverride(template.user_id, `writer:${_domain2}`, {
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          reason: "Teacher modified assessment settings — branched to new version",
        }).catch(() => {});
      }
      // Branch = stronger dissatisfaction: teacher changed the inputs themselves
      DossierManager.processStudentPerformance(template.user_id, `writer:${_domain2}`, {
        correct: 0,
        incorrect: Math.max(1, _changedFields.length),
        misconceptions: ["teacher-branched", ..._changedFields.map(c => `changed-${c.field}`)],
      }).catch(() => {});
      setShowBranchForm(false);
      await reloadVersions();
    } catch (e: any) {
      setBranchError(e?.message ?? "Failed to create new version. Please try again.");
    } finally {
      setIsBranching(false);
    }
  }, [template, selectedVersionId, branchFields, reloadVersions]);

  // ── Assign: set selected version as the active (latest) version ─────────
  const handleAssignVersion = useCallback(async () => {
    if (!template || !selectedVersionId) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      const { error } = await supabase
        .from("assessment_templates")
        .update({ latest_version_id: selectedVersionId })
        .eq("id", template.id);
      if (error) throw error;
      setTemplate((t) => t ? { ...t, latest_version_id: selectedVersionId } : t);
    } catch (e: any) {
      setAssignError(e?.message ?? "Failed to assign version.");
    } finally {
      setIsAssigning(false);
    }
  }, [template, selectedVersionId]);

  const uar = template?.uar_json ?? {};


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-container">
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          marginBottom: "1.25rem",
          padding: "0.4rem 0.9rem",
          borderRadius: "8px",
          border: "1.5px solid var(--color-border, #ddd)",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        ← My Assessments
      </button>

      {loading && <p style={{ color: "var(--text-secondary, #6b7280)" }}>Loading…</p>}
      {error && <p style={{ color: "var(--color-error, #ef4444)" }}>Error: {error}</p>}

      {!loading && !error && template && (
        <>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "1rem",
              background: "var(--bg-secondary, #f9fafb)",
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: "0 0 0.4rem 0",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: "var(--text-primary, #111827)",
                }}
              >
                {titleFor(uar, template.domain)}
              </h2>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary, #6b7280)",
                }}
              >
                {uar.assessmentType && (
                  <span
                    style={{
                      background: "var(--color-accent-muted, #ede9fe)",
                      color: "var(--color-accent, #4f46e5)",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "999px",
                      fontWeight: 600,
                      fontSize: "0.78rem",
                    }}
                  >
                    {ASSESSMENT_LABELS[uar.assessmentType] ?? uar.assessmentType}
                  </span>
                )}
                {uar.gradeLevels?.length > 0 && (
                  <span>
                    Grade{" "}
                    {Array.isArray(uar.gradeLevels)
                      ? uar.gradeLevels.join(", ")
                      : uar.gradeLevels}
                  </span>
                )}
                <span>
                  Created{" "}
                  {new Date(template.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span>{versions.length} version{versions.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* ── Version selector + Phase 3 actions ─────────────────────── */}
          {versions.length > 0 ? (
            <div style={{ marginBottom: "1.5rem" }}>
              {/* Row 1: selector + action buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  marginBottom: "0.75rem",
                }}
              >
                <label
                  htmlFor="version-select"
                  style={{ fontWeight: 600, fontSize: "0.9rem" }}
                >
                  Version:
                </label>
                <select
                  id="version-select"
                  value={selectedVersionId ?? ""}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "8px",
                    border: "1.5px solid var(--color-border, #ddd)",
                    background: "var(--bg-primary, #fff)",
                    color: "inherit",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    minWidth: "160px",
                  }}
                >
                  {versions.map((v) => {
                    const vDate = new Date(v.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    return (
                      <option key={v.id} value={v.id}>
                        Version {v.version_number}
                        {v.id === template.active_version_id ? " (active)" : ""}
                        {v.parent_version_id ? " · revised" : ""}
                        {` · ${vDate}`}
                        {v.quality_score != null ? ` · score ${v.quality_score}` : ""}
                      </option>
                    );
                  })}
                </select>

                {selectedVersion && (
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary, #6b7280)" }}>
                    Generated{" "}
                    {new Date(selectedVersion.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {selectedVersion.parent_version_id ? " · revised" : ""}
                  </span>
                )}

                {/* Active badge or Assign button */}
                {selectedVersionId && selectedVersionId === template.active_version_id ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.2rem 0.7rem",
                      borderRadius: "999px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      background: "#dcfce7",
                      color: "#166534",
                    }}
                  >
                    ✓ Active Version
                  </span>
                ) : selectedVersionId ? (
                  <button
                    onClick={handleAssignVersion}
                    disabled={isAssigning || isRegenerating || isBranching}
                    title="Mark this version as the active (assigned) version"
                    style={{
                      padding: "0.2rem 0.75rem",
                      borderRadius: "999px",
                      border: "1.5px solid #6b7280",
                      background: "transparent",
                      color: "#6b7280",
                      cursor: isAssigning ? "wait" : "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      opacity: isAssigning ? 0.6 : 1,
                    }}
                  >
                    {isAssigning ? "Assigning…" : "Assign This Version"}
                  </button>
                ) : null}

                {/* ── Spacer ── */}
                <div style={{ flex: 1 }} />

                {/* Report Results button */}
                <button
                  onClick={() => setShowReportResults((v) => !v)}
                  disabled={!selectedVersionId}
                  title="Record how students actually performed — adjusts future difficulty"
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "8px",
                    border: showReportResults ? "1.5px solid #10b981" : "1.5px solid #d1fae5",
                    background: showReportResults ? "#10b981" : "#f0fdf4",
                    color: showReportResults ? "#fff" : "#065f46",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {showReportResults ? "✕ Close Report" : "📊 Report Results"}
                </button>

                {/* Regenerate button */}
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating || isBranching || !selectedVersionId}
                  title="Re-run the same settings to get a fresh alternative"
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "8px",
                    border: "1.5px solid var(--color-border, #ddd)",
                    background: "transparent",
                    color: "inherit",
                    cursor: isRegenerating ? "wait" : "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    opacity: isRegenerating || isBranching ? 0.6 : 1,
                  }}
                >
                  {isRegenerating ? "Regenerating…" : "↻ Regenerate (Same Settings)"}
                </button>

                {/* Create Revised Version button */}
                <button
                  onClick={showBranchForm ? () => setShowBranchForm(false) : openBranchForm}
                  disabled={isRegenerating || isBranching}
                  title="Create a new version with modified inputs"
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "8px",
                    border: showBranchForm ? "1.5px solid var(--color-accent, #4f46e5)" : "1px solid #ccc",
                    background: showBranchForm ? "var(--color-accent, #4f46e5)" : "#f5f5f5",
                    color: showBranchForm ? "#fff" : "#333",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    opacity: (isRegenerating || isBranching) ? 0.6 : 1,
                  }}
                >
                  {showBranchForm ? "✕ Cancel" : "✎ Create Revised Version"}
                </button>
              </div>

              {/* Regenerate / assign error */}
              {regenerateError && (
                <p style={{ color: "var(--color-error, #ef4444)", fontSize: "0.85rem", margin: "0.25rem 0" }}>
                  {regenerateError}
                </p>
              )}
              {assignError && (
                <p style={{ color: "var(--color-error, #ef4444)", fontSize: "0.85rem", margin: "0.25rem 0" }}>
                  {assignError}
                </p>
              )}

              {/* ── Report Results inline panel ─────────────────────── */}
              {showReportResults && selectedVersionId && template && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    border: "1.5px solid #10b981",
                    borderRadius: "10px",
                    background: "#f0fdf4",
                    overflow: "hidden",
                  }}
                >
                  <ReportResultsPage
                    assignmentId={selectedVersionId}
                    userId={template.user_id}
                    domain={template.domain ?? "General"}
                    onClose={() => setShowReportResults(false)}
                  />
                </div>
              )}

              {/* ── Branch form ───────────────────────────────────────── */}
              {showBranchForm && branchFields && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "1.25rem",
                    border: "1.5px solid var(--color-accent, #4f46e5)",
                    borderRadius: "10px",
                    background: "var(--bg-secondary, #f9fafb)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.9rem",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem" }}>
                    Create Revised Version — adjust settings
                  </p>
                  <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-secondary, #6b7280)" }}>
                    Changes apply only to the new version. All previous versions are preserved.
                  </p>

                  {/* Topic */}
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.88rem", fontWeight: 600 }}>
                    Topic / focus
                    <input
                      type="text"
                      value={branchFields.topic}
                      onChange={(e) => setBranchFields(f => f ? { ...f, topic: e.target.value } : f)}
                      placeholder="e.g. Solving inequalities"
                      style={{
                        padding: "0.45rem 0.75rem",
                        borderRadius: "8px",
                        border: "1.5px solid var(--color-border, #ddd)",
                        background: "var(--bg-primary, #fff)",
                        color: "inherit",
                        fontSize: "0.88rem",
                        fontWeight: 400,
                      }}
                    />
                  </label>

                  {/* Row: time + assessment type */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.88rem", fontWeight: 600 }}>
                      Time (minutes)
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={branchFields.time}
                        onChange={(e) => setBranchFields(f => f ? { ...f, time: Number(e.target.value) } : f)}
                        style={{
                          padding: "0.45rem 0.75rem",
                          borderRadius: "8px",
                          border: "1.5px solid var(--color-border, #ddd)",
                          background: "var(--bg-primary, #fff)",
                          color: "inherit",
                          fontSize: "0.88rem",
                          fontWeight: 400,
                        }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.88rem", fontWeight: 600 }}>
                      Assessment type
                      <select
                        value={branchFields.assessmentType}
                        onChange={(e) => setBranchFields(f => f ? { ...f, assessmentType: e.target.value } : f)}
                        style={{
                          padding: "0.45rem 0.75rem",
                          borderRadius: "8px",
                          border: "1.5px solid var(--color-border, #ddd)",
                          background: "var(--bg-primary, #fff)",
                          color: "inherit",
                          fontSize: "0.88rem",
                          cursor: "pointer",
                        }}
                      >
                        {Object.entries(ASSESSMENT_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Additional details */}
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.88rem", fontWeight: 600 }}>
                    Additional instructions (optional)
                    <textarea
                      value={branchFields.additionalDetails}
                      onChange={(e) => setBranchFields(f => f ? { ...f, additionalDetails: e.target.value } : f)}
                      rows={3}
                      placeholder="Any specific focus, exclusions, or formatting notes…"
                      style={{
                        padding: "0.45rem 0.75rem",
                        borderRadius: "8px",
                        border: "1.5px solid var(--color-border, #ddd)",
                        background: "#ffffff",
                        color: "#111827",
                        fontSize: "0.88rem",
                        fontWeight: 400,
                        resize: "vertical",
                      }}
                    />
                  </label>

                  {/* Branch error */}
                  {branchError && (
                    <p style={{ color: "var(--color-error, #ef4444)", fontSize: "0.85rem", margin: 0 }}>
                      {branchError}
                    </p>
                  )}

                  {/* Branch form actions */}
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setShowBranchForm(false)}
                      disabled={isBranching}
                      style={{
                        padding: "0.5rem 1.1rem",
                        borderRadius: "8px",
                        border: "1.5px solid var(--color-border, #ddd)",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBranch}
                      disabled={isBranching || isRegenerating}
                      style={{
                        padding: "0.5rem 1.25rem",
                        borderRadius: "8px",
                        border: "none",
                        background: "var(--color-accent, #4f46e5)",
                        color: "#fff",
                        cursor: isBranching ? "wait" : "pointer",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        opacity: isBranching ? 0.7 : 1,
                      }}
                    >
                      {isBranching ? "Generating…" : "Generate New Version"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ color: "var(--text-secondary, #6b7280)", marginBottom: "0.75rem" }}>
                No versions saved yet for this template.
              </p>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--color-accent, #4f46e5)",
                  color: "#fff",
                  cursor: isRegenerating ? "wait" : "pointer",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                }}
              >
                {isRegenerating ? "Generating…" : "Generate First Version"}
              </button>
              {regenerateError && (
                <p style={{ color: "var(--color-error, #ef4444)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  {regenerateError}
                </p>
              )}
            </div>
          )}

          {/* ── AI Generation Notes ─────────────────────────────────────── */}
          {selectedVersion && template && <AiGenerationNotes version={selectedVersion} template={template} />}

          {/* ── Phase 4: Student Results + AI Insights ───────────────────── */}
          {selectedVersion && (
            <>
              <StudentResultsPanel
                questionCount={
                  (selectedVersion.assessment_json as any)?.questions?.length ??
                  (selectedVersion.assessment_json as any)?.totalItems ??
                  10
                }
                existingResult={existingResult}
                onSubmit={handleSubmitResults}
                isSaving={isSavingResults}
                saveError={saveResultsError}
              />
              {existingResult && (
                <AiInsightsPanel
                  analysis={currentAnalysis}
                  isLoading={isAnalyzing}
                  error={analyzeError}
                  resultsDate={existingResult.created_at}
                />
              )}
            </>
          )}

          {/* ── Assessment viewer ────────────────────────────────────────── */}
          {selectedVersion?.assessment_json ? (
            <AssessmentViewer assessment={selectedVersion.assessment_json} />
          ) : (
            versions.length > 0 && (
              <p style={{ color: "var(--text-secondary, #6b7280)" }}>
                No assessment content found for this version.
              </p>
            )
          )}
        </>
      )}

      {!loading && !error && !template && (
        <p style={{ color: "var(--text-secondary, #6b7280)" }}>
          Assessment not found or you do not have access to it.
        </p>
      )}
    </div>
  );
}
