// src/components_new/TeacherSystem/AssessmentDetailPage.tsx
//
// Phase 2 + Phase 3 — Versioned assessment viewer with Regenerate + Branch.
// Loads assessment_templates + assessment_versions from Supabase,
// renders the selected version via AssessmentViewer, and lets teachers
// regenerate the same UAR or branch it with edits.

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/supabase/client";
import type { FinalAssessment } from "pipeline/agents/builder/FinalAssessment";
import type { UnifiedAssessmentRequest } from "pipeline/contracts";
import { generateAssessment } from "@/config/aiConfig";
import { AssessmentViewer } from "../Pipeline/AssessmentViewer";
import { ReportResultsPage } from "./ReportResultsPage";
import { analyzeResults } from "pipeline/agents/analyzeResults";
import type { PerformanceEntry, AnalysisResult } from "pipeline/agents/analyzeResults";
import { DossierManager } from "@/system/dossier/DossierManager";
import type { AgentDossierData } from "@/system/dossier/DossierManager";
import {
  adjustPacingFromFeedback,
  type PacingFeedback,
} from "@/services_new/teacherProfileService";
import { classifyTrace } from "pipeline/agents/classifyTrace";
import { sendPipelineReport } from "@/services_new/pipelineReportService";
import type { ReportSource } from "@/services_new/pipelineReportService";
import "./AssessmentDetailPage.css";
import "./AssessmentDetailPage.css";

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
                background: "var(--adp-success-bg)",
                color: "var(--adp-success-fg)",
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
            background: "var(--bg, #fff)",
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
                            background: "var(--bg, #fff)",
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
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--adp-success-fg)" }}>
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
                background: healthStrong ? "var(--adp-success-bg)" : "var(--adp-warn-bg)",
                color: healthStrong ? "var(--adp-success-fg)" : "var(--adp-warn-fg)",
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
            background: "var(--bg, #fff)",
            fontSize: "0.88rem",
            lineHeight: 1.65,
            color: "var(--text, #374151)",
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
                  background: healthStrong ? "var(--adp-success-bg)" : "var(--adp-warn-bg)",
                  color: healthStrong ? "var(--adp-success-fg)" : "var(--adp-warn-fg)",
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

// ─────────────────────────────────────────────────────────────────────────────
// Pacing feedback bar — lets teacher say "too long / about right / too short"
// ─────────────────────────────────────────────────────────────────────────────

function PacingFeedbackBar({
  userId,
  assessmentType,
  currentDefault,
}: {
  userId: string;
  assessmentType: string;
  currentDefault?: number;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [given, setGiven] = useState<PacingFeedback | null>(null);
  const [actualInput, setActualInput] = useState("");
  const [newDefault, setNewDefault] = useState<number | null>(null);

  async function submit(feedback: PacingFeedback) {
    setGiven(feedback);
    setStatus("saving");
    try {
      const actualMins =
        actualInput !== "" && !isNaN(Number(actualInput))
          ? Number(actualInput)
          : undefined;
      const updated = await adjustPacingFromFeedback(
        userId,
        assessmentType,
        feedback,
        actualMins
      );
      setNewDefault(
        updated.pacingDefaults.assessmentDurationMinutes[assessmentType] ?? null
      );
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const btnBase: React.CSSProperties = {
    padding: "0.3rem 0.75rem",
    borderRadius: "6px",
    border: "1px solid var(--color-border, #e5e7eb)",
    background: "var(--bg, #fff)",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--text, #374151)",
    transition: "background 0.15s",
  };

  if (status === "saved") {
    return (
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--adp-success-fg, #16a34a)" }}>
        ✓ Default updated to{" "}
        <strong>{newDefault} min</strong> for{" "}
        <em>{assessmentType}</em>.
      </p>
    );
  }

  return (
    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary, #6b7280)" }}>
        How did the timing feel?
        {currentDefault != null && (
          <span style={{ fontWeight: 400, marginLeft: "0.4rem" }}>("{assessmentType}" default: {currentDefault} min)</span>
        )}
      </p>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        <button style={{ ...btnBase, opacity: given === "too_long" ? 0.5 : 1 }} disabled={status === "saving"} onClick={() => submit("too_long")}>⏱ Too long (−20%)</button>
        <button style={{ ...btnBase, opacity: given === "about_right" ? 0.5 : 1 }} disabled={status === "saving"} onClick={() => submit("about_right")}>✓ About right</button>
        <button style={{ ...btnBase, opacity: given === "too_short" ? 0.5 : 1 }} disabled={status === "saving"} onClick={() => submit("too_short")}>⚡ Too short (+20%)</button>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #6b7280)" }}>or enter actual:</span>
        <input
          type="number"
          min={1}
          placeholder="min"
          value={actualInput}
          onChange={(e) => setActualInput(e.target.value)}
          style={{
            width: "4.5rem",
            padding: "0.25rem 0.4rem",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: "6px",
            fontSize: "0.78rem",
          }}
        />
        {actualInput !== "" && !isNaN(Number(actualInput)) && Number(actualInput) > 0 && (
          <button
            style={{ ...btnBase, background: "var(--color-primary, #6366f1)", color: "#fff", border: "none" }}
            disabled={status === "saving"}
            onClick={() => submit("about_right")}
          >
            Set as default
          </button>
        )}
      </div>
      {status === "error" && (
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--adp-danger-fg, #dc2626)" }}>Failed to save — try again.</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prescription helpers
// ─────────────────────────────────────────────────────────────────────────────

function hasPrescriptions(blueprintJson: Record<string, any> | null): boolean {
  const bp     = blueprintJson ?? {};
  const scribe = bp.scribePrescriptions ?? {};
  const gk     = bp.gatekeeperPrescriptions ?? {};
  return (
    ((scribe.requiredBehaviors ?? []) as string[]).length > 0 ||
    ((scribe.weaknesses         ?? []) as string[]).length > 0 ||
    ((gk.addedConstraints       ?? []) as string[]).length > 0
  );
}

function getPrescriptionSummary(blueprintJson: Record<string, any> | null): string {
  const bp     = blueprintJson ?? {};
  const scribe = bp.scribePrescriptions ?? {};
  const gk     = bp.gatekeeperPrescriptions ?? {};
  const parts: string[] = [];
  const behaviors = (scribe.requiredBehaviors ?? []) as string[];
  const constraints = (gk.addedConstraints ?? []) as string[];
  if (behaviors.length > 0)   parts.push(`${behaviors.length} writer behavior${behaviors.length !== 1 ? "s" : ""} required`);
  if (constraints.length > 0) parts.push(`${constraints.length} gatekeeper constraint${constraints.length !== 1 ? "s" : ""} applied`);
  return parts.join("; ") || "prescriptions were active";
}

// ─────────────────────────────────────────────────────────────────────────────

function SendReportBanner({ version, template }: { version: VersionRow; template: TemplateRow }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote]         = useState("");
  const [status, setStatus]     = useState<"idle" | "sending" | "sent" | "error">("idle");

  const c = classifyTrace(version.blueprint_json, version.token_usage, version.quality_score);

  const isError     = c.severity === "error";
  const isWarning   = c.severity === "warning";
  const isFlagged   = isError || isWarning;
  const withPresc   = hasPrescriptions(version.blueprint_json);

  // Determine source label for admin dashboard
  const reportSource: ReportSource = isFlagged ? "flagged" : withPresc ? "recommended" : "voluntary";

  // Build the classification to send — for non-flagged we keep category as "unknown"
  function buildClassification() {
    if (isFlagged) return c;
    return {
      ...c,
      category:  "unknown" as const,
      summary:   reportSource === "recommended"
        ? `Prescription-assisted generation. ${getPrescriptionSummary(version.blueprint_json)}`
        : "Teacher submitted voluntary feedback.",
    };
  }

  async function handleSend() {
    setStatus("sending");
    try {
      await sendPipelineReport({
        userId:              template.user_id,
        assessmentVersionId: version.id,
        classification:      buildClassification(),
        blueprintJson:       version.blueprint_json,
        tokenUsage:          version.token_usage,
        qualityScore:        version.quality_score,
        uarJson:             template.uar_json,
        assessmentJson:      version.assessment_json as Record<string, any>,
        teacherNote:         note.trim() || undefined,
        reportSource,
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--adp-success-fg,#16a34a)" }}>
        ✓ Report sent — thanks for helping us improve!
      </p>
    );
  }

  // ── Flagged (warning / error) — existing styled alert ───────────────────
  if (isFlagged) {
    const borderColor = isError ? "var(--adp-danger-fg,#dc2626)" : "#f59e0b";
    const bg          = isError ? "var(--adp-danger-bg,#fef2f2)" : "var(--adp-warn-bg,#fffbeb)";
    const fg          = isError ? "var(--adp-danger-fg,#991b1b)" : "var(--adp-warn-fg,#92400e)";
    return (
      <div style={{ padding: "0.7rem 0.9rem", borderRadius: "8px", border: `1.5px solid ${borderColor}`, background: bg, color: fg, fontSize: "0.83rem", lineHeight: 1.5 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          {isError ? "⚠️ Something unexpected happened." : "ℹ️ Something looked unusual during generation."}
        </p>
        <p style={{ margin: "0.3rem 0 0", color: "inherit", opacity: 0.9 }}>
          {c.summary}
          {c.faultingAgent ? <> ({c.faultingAgent})</> : null}
        </p>
        {c.suggestedFix && (
          <p style={{ margin: "0.3rem 0 0", fontStyle: "italic", opacity: 0.85 }}>{c.suggestedFix}</p>
        )}
        {status !== "error" && (
          <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-start", flexDirection: "column" }}>
            {showNote && (
              <textarea
                rows={2}
                placeholder="Anything you want to add? (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--color-border,#ddd)", fontSize: "0.82rem", background: "var(--bg,#fff)", color: "var(--text,#374151)" }}
              />
            )}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                onClick={status === "idle" && !showNote ? () => setShowNote(true) : handleSend}
                disabled={status === "sending"}
                style={{ padding: "0.3rem 0.85rem", borderRadius: "6px", border: "none", background: isError ? "var(--adp-danger-fg,#dc2626)" : "#d97706", color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: status === "sending" ? 0.7 : 1 }}
              >
                {status === "sending" ? "Sending…" : "Send Report"}
              </button>
              {!showNote && (
                <button
                  onClick={() => setShowNote(true)}
                  style={{ background: "none", border: "none", fontSize: "0.78rem", color: fg, opacity: 0.7, cursor: "pointer", textDecoration: "underline" }}
                >
                  Add a note
                </button>
              )}
            </div>
          </div>
        )}
        {status === "error" && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--adp-danger-fg,#dc2626)" }}>
            Failed to send — try again later.
          </p>
        )}
      </div>
    );
  }

  // ── Recommended — prescription was used ─────────────────────────────────
  if (reportSource === "recommended") {
    return (
      <div style={{ padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1.5px solid var(--color-accent,#6366f1)", background: "var(--adp-info-bg,#eef2ff)", color: "var(--adp-info-fg,#3730a3)", fontSize: "0.83rem", lineHeight: 1.5 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>✨ Prescription-assisted generation</p>
        <p style={{ margin: "0.25rem 0 0", opacity: 0.9 }}>
          {getPrescriptionSummary(version.blueprint_json)}. Sending a report helps us calibrate these rules.
        </p>
        {status !== "error" && (
          <div style={{ marginTop: "0.55rem", display: "flex", gap: "0.5rem", flexDirection: "column" }}>
            {showNote && (
              <textarea
                rows={2}
                placeholder="Did the prescription help? Any observations? (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--color-border,#ddd)", fontSize: "0.82rem", background: "var(--bg,#fff)", color: "var(--text,#374151)" }}
              />
            )}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                onClick={status === "idle" && !showNote ? () => setShowNote(true) : handleSend}
                disabled={status === "sending"}
                style={{ padding: "0.3rem 0.85rem", borderRadius: "6px", border: "none", background: "var(--color-accent,#6366f1)", color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: status === "sending" ? 0.7 : 1 }}
              >
                {status === "sending" ? "Sending…" : "Send Recommended Report"}
              </button>
              {!showNote && (
                <button
                  onClick={() => setShowNote(true)}
                  style={{ background: "none", border: "none", fontSize: "0.78rem", color: "var(--adp-info-fg,#3730a3)", opacity: 0.7, cursor: "pointer", textDecoration: "underline" }}
                >
                  Add a note
                </button>
              )}
            </div>
          </div>
        )}
        {status === "error" && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--adp-danger-fg,#dc2626)" }}>
            Failed to send — try again later.
          </p>
        )}
      </div>
    );
  }

  // ── Voluntary — generation looked fine, teacher can still send feedback ──
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
      {!showNote ? (
        <>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary,#6b7280)" }}>
            Generation looked normal —
          </span>
          <button
            onClick={() => setShowNote(true)}
            style={{ padding: "0.25rem 0.7rem", borderRadius: "6px", border: "1px solid var(--color-border,#ddd)", background: "transparent", color: "var(--text,#374151)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
          >
            Send Feedback Anyway
          </button>
        </>
      ) : (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <textarea
            rows={2}
            placeholder="What looked off, or any general feedback? (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--color-border,#ddd)", fontSize: "0.82rem", background: "var(--bg,#fff)", color: "var(--text,#374151)", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleSend}
              disabled={status === "sending"}
              style={{ padding: "0.3rem 0.85rem", borderRadius: "6px", border: "none", background: "var(--text-secondary,#6b7280)", color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: status === "sending" ? 0.7 : 1 }}
            >
              {status === "sending" ? "Sending…" : "Send Feedback"}
            </button>
            <button
              onClick={() => { setShowNote(false); setNote(""); }}
              style={{ padding: "0.3rem 0.7rem", borderRadius: "6px", border: "1px solid var(--color-border,#ddd)", background: "transparent", fontSize: "0.78rem", cursor: "pointer", color: "var(--text-secondary,#6b7280)" }}
            >
              Cancel
            </button>
          </div>
          {status === "error" && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--adp-danger-fg,#dc2626)" }}>
              Failed to send — try again later.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AiGenerationNotes({ version, template }: { version: VersionRow; template: TemplateRow }) {
  const [open, setOpen] = useState(false);
  const [dossier, setDossier] = useState<AgentDossierData | null>(null);

  const blueprint  = version.blueprint_json ?? {};
  const tokenUsage = version.token_usage ?? {};
  const score      = version.quality_score;
  const uar        = template.uar_json ?? {};
  const requestedMins: number | null = uar.time != null ? Number(uar.time) : null;

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
  const badgeBg    = score != null ? (score >= 8 ? "var(--adp-success-bg)" : score >= 5 ? "var(--adp-warn-bg)" : "var(--adp-danger-bg)") : undefined;
  const badgeColor = score != null ? (score >= 8 ? "var(--adp-success-fg)" : score >= 5 ? "var(--adp-warn-fg)" : "var(--adp-danger-fg)") : undefined;
  if (score != null) {
    if (score >= 9)      { qualityLabel = "Strong";     qualityDesc = "This assessment passed all quality checks with minimal adjustments."; }
    else if (score >= 7) { qualityLabel = "Good";       qualityDesc = "Questions were well-formed. Minor edits were applied automatically."; }
    else if (score >= 5) { qualityLabel = "Fair";       qualityDesc = "Some questions needed adjustment. The system corrected them before delivery."; }
    else                 { qualityLabel = "Needs Work"; qualityDesc = "Significant corrections were made. You may want to review the questions."; }
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

  // ── Dossier-derived calibration trend ──────────────────────────────────
  const history = dossier?.performanceHistory ?? [];
  const recentHistory = history.slice(-6); // last 6 sessions
  const historyWithAvg = recentHistory.filter(h => h.classAverage != null);
  const historyWithTime = recentHistory.filter(h => h.actualMinutes != null);

  // Difficulty calibration status
  const influence = dossier?.studentPerformanceInfluence;
  let calibrationNote: string | null = null;
  if (influence) {
    const total = influence.totalCorrect + influence.totalIncorrect;
    if (total > 0) {
      const overallRate = Math.round((influence.totalCorrect / total) * 100);
      if (influence.reduceDifficulty) {
        calibrationNote = `Class average across ${history.length} session${history.length !== 1 ? "s" : ""} is ~${overallRate}% — next assessment will be easier and more scaffolded.`;
      } else if (influence.increaseDifficulty) {
        calibrationNote = `Class average across ${history.length} session${history.length !== 1 ? "s" : ""} is ~${overallRate}% — next assessment will be more challenging.`;
      } else {
        calibrationNote = `Class average across ${history.length} session${history.length !== 1 ? "s" : ""} is ~${overallRate}% — difficulty is well-calibrated.`;
      }
    }
  }

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
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          📋 AI Generation Notes
          {(() => {
            const c = classifyTrace(version.blueprint_json, version.token_usage, version.quality_score);
            if (c.severity === "error")   return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: "999px", background: "var(--adp-danger-bg,#fef2f2)", color: "var(--adp-danger-fg,#dc2626)" }}>⚠ Issue detected</span>;
            if (c.severity === "warning") return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: "999px", background: "var(--adp-warn-bg,#fffbeb)",   color: "var(--adp-warn-fg,#d97706)"   }}>ℹ Unusual</span>;
            return null;
          })()}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #6b7280)", fontWeight: 400 }}>
          {open ? "Hide ▲" : "Show ▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "var(--bg, #fff)",
            fontSize: "0.88rem",
            lineHeight: 1.65,
            color: "var(--text, #374151)",
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem",
          }}
        >
          {/* ── Report banner ─────────────────────────────────────────── */}
          <SendReportBanner version={version} template={template} />

          {/* Quality badge + description */}
          {qualityLabel && score != null && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <div style={{
                display: "inline-flex", alignItems: "center",
                padding: "0.3rem 0.8rem", borderRadius: "999px",
                fontSize: "0.8rem", fontWeight: 700,
                background: badgeBg, color: badgeColor,
              }}>
                {qualityLabel} ({score}/10)
              </div>
              <span style={{ fontSize: "0.84rem", color: "var(--text-secondary, #6b7280)" }}>
                {qualityDesc}
              </span>
            </div>
          )}

          {/* Revisions — the primary thing teachers care about */}
          <p style={{ margin: 0 }}>✏️ <strong>Revisions: </strong>{revisionLine}</p>

          {/* Misc notes — constraint warnings, truncation events, etc. */}
          {notes.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.84rem" }}>
              {notes.map((note, i) => (
                <li key={i} style={{ marginBottom: "0.3rem" }}>{note}</li>
              ))}
            </ul>
          )}

          {/* ── AI Calibration Trend ──────────────────────────────────── */}
          {history.length > 0 && (
            <div
              style={{
                borderTop: "1px solid var(--color-border, #e5e7eb)",
                paddingTop: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, fontSize: "0.85rem" }}>
                📈 AI Learning Progress
              </p>

              {/* Calibration summary */}
              {calibrationNote && (
                <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.83rem", color: "var(--text-secondary, #6b7280)" }}>
                  {calibrationNote}
                </p>
              )}

              {/* Class average sparkline */}
              {historyWithAvg.length >= 2 && (
                <div style={{ marginBottom: "0.6rem" }}>
                  <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary, #6b7280)" }}>
                    Class averages (last {historyWithAvg.length} sessions)
                  </p>
                  <div style={{ display: "flex", gap: "0.35rem", alignItems: "flex-end", height: "2.5rem" }}>
                    {historyWithAvg.map((h, i) => {
                      const pct = h.classAverage ?? 0;
                      const heightPct = Math.max(8, pct);
                      const color = pct >= 70 ? "var(--adp-success-fg, #16a34a)" : pct >= 50 ? "var(--adp-warn-fg, #d97706)" : "var(--color-error, #ef4444)";
                      return (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
                          <span style={{ fontSize: "0.65rem", color, fontWeight: 700 }}>{pct}%</span>
                          <div
                            title={`Session ${i + 1}: ${pct}% avg`}
                            style={{
                              width: "1.75rem",
                              height: `${(heightPct / 100) * 2}rem`,
                              minHeight: "0.2rem",
                              background: color,
                              borderRadius: "3px 3px 0 0",
                              opacity: 0.85,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timing accuracy */}
              {historyWithTime.length >= 1 && (
                <div>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary, #6b7280)" }}>
                    Recent actual times (min)
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {historyWithTime.map((h, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "0.15rem 0.55rem",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: "var(--bg-secondary, #f3f4f6)",
                          color: "var(--text, #374151)",
                          border: "1px solid var(--color-border, #e5e7eb)",
                        }}
                      >
                        {h.actualMinutes} min
                      </span>
                    ))}
                    {requestedMins != null && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #6b7280)", alignSelf: "center" }}>
                        (target: {requestedMins} min)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Pacing feedback — always visible when we know the assessment type */}
              {uar.assessmentType && (
                <PacingFeedbackBar
                  userId={template.user_id}
                  assessmentType={String(uar.assessmentType)}
                  currentDefault={requestedMins ?? undefined}
                />
              )}

              {/* First-session prompt */}
              {history.length === 0 && (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary, #6b7280)", fontStyle: "italic" }}>
                  Use "📊 Report Results" after students complete this to start tracking how well predictions match reality.
                </p>
              )}
            </div>
          )}

          {/* Prompt to use Report Results if no history yet */}
          {history.length === 0 && (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary, #6b7280)", fontStyle: "italic" }}>
              ℹ️ After students complete this, use "📊 Report Results" to log actual performance. The system will use that data to calibrate difficulty and timing in future assessments.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom report bar — always shown at the foot of every generated assignment
// ─────────────────────────────────────────────────────────────────────────────

function BottomReportBar({ version, template }: { version: VersionRow; template: TemplateRow }) {
  const [expanded, setExpanded]   = useState(false);
  const [note, setNote]           = useState("");
  const [status, setStatus]       = useState<"idle" | "sending" | "sent" | "error">("idle");

  const c            = classifyTrace(version.blueprint_json, version.token_usage, version.quality_score);
  const isFlagged    = c.severity === "error" || c.severity === "warning";
  const withPresc    = hasPrescriptions(version.blueprint_json);
  const reportSource: ReportSource = isFlagged ? "flagged" : withPresc ? "recommended" : "voluntary";

  function buildClassification() {
    if (isFlagged) return c;
    return {
      ...c,
      category: "unknown" as const,
      summary:   reportSource === "recommended"
        ? `Prescription-assisted generation. ${getPrescriptionSummary(version.blueprint_json)}`
        : "Teacher submitted voluntary feedback.",
    };
  }

  async function handleSend() {
    setStatus("sending");
    try {
      await sendPipelineReport({
        userId:              template.user_id,
        assessmentVersionId: version.id,
        classification:      buildClassification(),
        blueprintJson:       version.blueprint_json,
        tokenUsage:          version.token_usage,
        qualityScore:        version.quality_score,
        uarJson:             template.uar_json,
        assessmentJson:      version.assessment_json as Record<string, any>,
        teacherNote:         note.trim() || undefined,
        reportSource,
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  // Determine visual treatment
  const barBg     = isFlagged
    ? (c.severity === "error" ? "var(--adp-danger-bg,#fef2f2)" : "var(--adp-warn-bg,#fffbeb)")
    : withPresc
    ? "var(--adp-info-bg,#eef2ff)"
    : "var(--bg-secondary,#f9fafb)";
  const barBorder = isFlagged
    ? (c.severity === "error" ? "var(--adp-danger-fg,#dc2626)" : "#f59e0b")
    : withPresc
    ? "var(--color-accent,#6366f1)"
    : "var(--color-border,#e5e7eb)";
  const labelColor = isFlagged
    ? (c.severity === "error" ? "var(--adp-danger-fg,#991b1b)" : "var(--adp-warn-fg,#92400e)")
    : withPresc
    ? "var(--adp-info-fg,#3730a3)"
    : "var(--text-secondary,#6b7280)";
  const btnBg     = isFlagged
    ? (c.severity === "error" ? "var(--adp-danger-fg,#dc2626)" : "#d97706")
    : withPresc
    ? "var(--color-accent,#6366f1)"
    : "var(--text-secondary,#4b5563)";

  const label = isFlagged
    ? (c.severity === "error" ? "⚠️ Issue detected — see AI Notes above." : "ℹ️ Something looked unusual — see AI Notes above.")
    : withPresc
    ? "✨ Prescription-assisted — feedback helps us calibrate."
    : "Generation looked normal.";
  const btnLabel = isFlagged ? "Send Report" : withPresc ? "Send Recommended Report" : "Send Feedback";

  if (status === "sent") {
    return (
      <div style={{ marginTop: "1.5rem", padding: "0.7rem 1rem", borderRadius: "8px", border: "1.5px solid var(--adp-success-bdr,#bbf7d0)", background: "var(--adp-success-bg,#f0fdf4)", fontSize: "0.82rem", color: "var(--adp-success-fg,#16a34a)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        ✓ Report sent — thanks for helping us improve!
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1.5rem", padding: "0.7rem 1rem", borderRadius: "8px", border: `1.5px solid ${barBorder}`, background: barBg, fontSize: "0.83rem", lineHeight: 1.5, color: labelColor }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <span style={{ flex: 1, minWidth: "12rem" }}>{label}</span>
        {!expanded && status !== "error" && (
          <button
            onClick={() => setExpanded(true)}
            style={{ padding: "0.3rem 0.85rem", borderRadius: "6px", border: "none", background: btnBg, color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {btnLabel}
          </button>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <textarea
            rows={2}
            autoFocus
            placeholder={
              isFlagged
                ? "Anything you want to add about this issue? (optional)"
                : withPresc
                ? "Did the prescription help? Any observations? (optional)"
                : "What looked off, or any general feedback? (optional)"
            }
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--color-border,#ddd)", fontSize: "0.82rem", background: "var(--bg,#fff)", color: "var(--text,#374151)", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleSend}
              disabled={status === "sending"}
              style={{ padding: "0.3rem 0.85rem", borderRadius: "6px", border: "none", background: btnBg, color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: status === "sending" ? 0.7 : 1 }}
            >
              {status === "sending" ? "Sending…" : btnLabel}
            </button>
            <button
              onClick={() => { setExpanded(false); setNote(""); }}
              style={{ padding: "0.3rem 0.7rem", borderRadius: "6px", border: "1px solid var(--color-border,#ddd)", background: "transparent", fontSize: "0.78rem", cursor: "pointer", color: "var(--text-secondary,#6b7280)" }}
            >
              Cancel
            </button>
          </div>
          {status === "error" && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--adp-danger-fg,#dc2626)" }}>
              Failed to send — try again later.
            </p>
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

  // ── Delete version state ─────────────────────────────────────────────────
  const [confirmDeleteVersionId, setConfirmDeleteVersionId] = useState<string | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [deleteVersionError, setDeleteVersionError] = useState<string | null>(null);

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

  // ── Clear delete confirm when switching versions ──────────────────────────
  useEffect(() => {
    setConfirmDeleteVersionId(null);
    setDeleteVersionError(null);
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

  // ── Delete version ────────────────────────────────────────────────────────
  const handleDeleteVersion = useCallback(async () => {
    if (!template || !confirmDeleteVersionId) return;
    setIsDeletingVersion(true);
    setDeleteVersionError(null);
    try {
      const { error: delErr } = await supabase
        .from("assessment_versions")
        .delete()
        .eq("id", confirmDeleteVersionId);
      if (delErr) throw delErr;

      const remaining = versions.filter(v => v.id !== confirmDeleteVersionId);
      let newLatestId: string | null = template.latest_version_id;

      if (template.latest_version_id === confirmDeleteVersionId) {
        newLatestId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
        await supabase
          .from("assessment_templates")
          .update({ latest_version_id: newLatestId })
          .eq("id", template.id);
        setTemplate(t => t ? { ...t, latest_version_id: newLatestId } : t);
      }
      if ((template as any).active_version_id === confirmDeleteVersionId) {
        await supabase
          .from("assessment_templates")
          .update({ active_version_id: null })
          .eq("id", template.id);
        setTemplate(t => t ? { ...t, active_version_id: null } : t);
      }

      setVersions(remaining);
      setConfirmDeleteVersionId(null);
      if (remaining.length > 0) {
        setSelectedVersionId(newLatestId ?? remaining[remaining.length - 1].id);
      } else {
        // Last version removed — delete the template entirely then go back
        await supabase
          .from("assessment_templates")
          .delete()
          .eq("id", template.id);
        onBack();
      }
    } catch (e: any) {
      setDeleteVersionError(e?.message ?? "Failed to delete version.");
    } finally {
      setIsDeletingVersion(false);
    }
  }, [template, confirmDeleteVersionId, versions, onBack]);

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
                  color: "var(--text, #111827)",
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
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Version:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {versions.map((v) => {
                    const vDate = new Date(v.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    const isSelected = v.id === selectedVersionId;
                    const isActive = v.id === template.active_version_id;
                    const qualityIcon = v.quality_score != null ? (v.quality_score >= 8 ? " ✓" : v.quality_score < 5 ? " ⚠" : "") : "";
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVersionId(v.id)}
                        className={`ca-chip ca-chip--sm${isSelected ? " ca-chip--selected" : ""}`}
                        title={`Version ${v.version_number}${isActive ? " — active" : ""}${v.parent_version_id ? " — revised" : ""}${v.quality_score != null ? ` — Quality ${v.quality_score}/10` : ""}`}
                      >
                        v{v.version_number}{qualityIcon}
                        {isActive && <span style={{ marginLeft: "0.3rem", fontSize: "0.7em", opacity: 0.8 }}>●</span>}
                        <span style={{ marginLeft: "0.3rem", fontWeight: 400, opacity: 0.7 }}>{vDate}</span>
                      </button>
                    );
                  })}
                </div>

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
                      background: "var(--adp-success-bg)",
                      color: "var(--adp-success-fg)",
                    }}
                  >
                    ✓ Active Version
                  </span>
                ) : selectedVersionId ? (
                  <button
                    onClick={handleAssignVersion}
                    disabled={isAssigning || isRegenerating || isBranching}
                    title="Mark this version as the active (assigned) version"
                    className="adp-btn-muted-pill"
                    style={{ cursor: isAssigning ? "wait" : "pointer", opacity: isAssigning ? 0.6 : 1 }}
                  >
                    {isAssigning ? "Assigning…" : "Assign This Version"}
                  </button>
                ) : null}

                {/* ── Delete version ── */}
                {selectedVersionId && (
                  <button
                    className="adp-btn-delete"
                    title={confirmDeleteVersionId === selectedVersionId ? "Cancel delete" : "Delete this version"}
                    onClick={() => setConfirmDeleteVersionId(
                      confirmDeleteVersionId === selectedVersionId ? null : selectedVersionId
                    )}
                    disabled={isRegenerating || isBranching || isDeletingVersion}
                  >
                    {confirmDeleteVersionId === selectedVersionId ? "✕ Cancel" : "🗑 Delete"}
                  </button>
                )}

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
                    border: showReportResults ? "1.5px solid var(--adp-report-active-bdr)" : "1.5px solid var(--adp-report-inactive-bdr)",
                    background: showReportResults ? "var(--adp-report-active-bg)" : "var(--adp-report-inactive-bg)",
                    color: showReportResults ? "var(--adp-report-active-fg)" : "var(--adp-report-inactive-fg)",
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
                  className={showBranchForm ? undefined : "adp-btn-outline"}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "8px",
                    border: showBranchForm ? "1.5px solid var(--color-accent, #4f46e5)" : undefined,
                    background: showBranchForm ? "var(--color-accent, #4f46e5)" : undefined,
                    color: showBranchForm ? "#fff" : undefined,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    opacity: (isRegenerating || isBranching) ? 0.6 : 1,
                  }}
                >
                  {showBranchForm ? "✕ Cancel" : "✎ Create Revised Version"}
                </button>
              </div>

              {/* ── Delete version confirm ──────────────────────────── */}
              {confirmDeleteVersionId && confirmDeleteVersionId === selectedVersionId && (
                <div className="adp-delete-confirm" style={{ marginTop: "0.5rem" }}>
                  {versions.length === 1 ? (
                    <span>
                      ⚠️ This is the <strong>only version</strong>. Deleting it will permanently remove the entire assessment. This cannot be undone.
                    </span>
                  ) : (
                    <span>Delete version {selectedVersion?.version_number}? This cannot be undone.</span>
                  )}
                  <button
                    className="adp-delete-confirm-yes"
                    disabled={isDeletingVersion}
                    onClick={handleDeleteVersion}
                  >
                    {isDeletingVersion ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    className="adp-delete-confirm-no"
                    onClick={() => setConfirmDeleteVersionId(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}

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
              {deleteVersionError && (
                <p style={{ color: "var(--color-error, #ef4444)", fontSize: "0.85rem", margin: "0.25rem 0" }}>
                  {deleteVersionError}
                </p>
              )}

              {/* ── Report Results inline panel ─────────────────────── */}
              {showReportResults && selectedVersionId && template && selectedVersion && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    border: "1.5px solid var(--adp-report-active-bdr)",
                    borderRadius: "10px",
                    background: "var(--adp-report-container-bg)",
                    overflow: "hidden",
                  }}
                >
                  <ReportResultsPage
                    assignmentId={selectedVersionId}
                    userId={template.user_id}
                    domain={template.domain ?? "General"}
                    problems={
                      ((selectedVersion.assessment_json as any)?.items as any[] | undefined)
                        ?.map((q: any) => q.prompt ?? q.text ?? "")
                        .filter(Boolean) ?? []
                    }
                    predictedMinutes={(() => {
                      const bp = selectedVersion.blueprint_json ?? {};
                      const plan = bp.plan ?? {};
                      const totalItems = (selectedVersion.assessment_json as any)?.totalItems ?? 0;
                      const uar = template.uar_json ?? {};
                      if (bp.realisticTotalMinutes != null) return Number(bp.realisticTotalMinutes);
                      if (plan.pacingSecondsPerItem != null && totalItems > 0)
                        return Math.round((plan.pacingSecondsPerItem * totalItems) / 60);
                      if (uar.time != null) return Number(uar.time);
                      return null;
                    })()}
                    title={titleFor(template.uar_json ?? {}, template.domain)}
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
                        background: "var(--bg, #fff)",
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
                          background: "var(--bg, #fff)",
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
                          background: "var(--bg, #fff)",
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
                      className="adp-textarea"
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
                  (selectedVersion.assessment_json as any)?.items?.length ??
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

          {/* ── Send Report — always visible at the bottom ───────────────── */}
          {selectedVersion && template && (
            <BottomReportBar version={selectedVersion} template={template} />
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
