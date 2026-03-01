// src/components_new/TeacherSystem/AssessmentDetailPage.tsx
//
// Phase 2 — Read-only versioned assessment viewer.
// Loads assessment_templates + assessment_versions from Supabase,
// renders the selected version via AssessmentViewer.

import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";
import type { FinalAssessment } from "@/pipeline/agents/builder/FinalAssessment";
import { AssessmentViewer } from "../Pipeline/AssessmentViewer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateRow {
  id: string;
  domain: string | null;
  uar_json: Record<string, any> | null;
  created_at: string;
  latest_version_id: string | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
// AI Generation Notes panel (teacher-language translation of quality data)
// ─────────────────────────────────────────────────────────────────────────────

function AiGenerationNotes({ version }: { version: VersionRow }) {
  const [open, setOpen] = useState(false);

  const blueprint = version.blueprint_json ?? {};
  const plan = blueprint.plan ?? {};
  const score = version.quality_score;
  const estimatedSecs = plan.pacingSecondsPerItem != null && version.assessment_json?.totalItems
    ? plan.pacingSecondsPerItem * version.assessment_json.totalItems
    : null;
  const estimatedMins = estimatedSecs ? Math.round(estimatedSecs / 60) : null;
  const difficultyProfile = plan.difficultyProfile ?? null;
  const ordering = plan.orderingStrategy ?? null;

  // Build plain-language notes
  const notes: string[] = [];

  if (score != null) {
    if (score >= 8) notes.push("Assessment alignment looks strong — questions match the intended learning goals.");
    else if (score >= 6) notes.push("Assessment alignment is acceptable — minor adjustments may improve it.");
    else if (score < 6) notes.push("Some questions may not fully match your stated goals. Consider reviewing.");
  }
  if (estimatedMins != null) {
    notes.push(`Estimated student completion time: ~${estimatedMins} minute${estimatedMins !== 1 ? "s" : ""}.`);
  }
  if (difficultyProfile) {
    const friendly: Record<string, string> = {
      easy: "Mostly accessible questions — suitable for review or intro.",
      medium: "Balanced difficulty — suitable for standard assessments.",
      hard: "Challenging questions — suitable for honors or end-of-unit tests.",
      mixed: "Mixed difficulty — covers a range of challenge levels.",
    };
    notes.push(friendly[difficultyProfile] ?? `Difficulty profile: ${difficultyProfile}.`);
  }
  if (ordering) {
    const orderingNote: Record<string, string> = {
      "easy-to-hard": "Questions are ordered from easier to harder to build confidence.",
      "hard-to-easy": "Questions start challenging, then become more accessible.",
      "random": "Questions are ordered without a specific difficulty pattern.",
      "grouped": "Questions are grouped by topic or type.",
    };
    notes.push(orderingNote[ordering] ?? `Question order: ${ordering}.`);
  }
  if (version.parent_version_id) {
    notes.push("This is a revised version — it was generated based on a prior attempt.");
  }
  if (notes.length === 0) {
    notes.push("No additional generation notes for this version.");
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
          }}
        >
          {score != null && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                fontSize: "0.8rem",
                fontWeight: 600,
                background: score >= 8 ? "#dcfce7" : score >= 5 ? "#fef9c3" : "#fee2e2",
                color: score >= 8 ? "#166534" : score >= 5 ? "#854d0e" : "#991b1b",
              }}
            >
              Quality score: {score} / 10
            </div>
          )}
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {notes.map((note, i) => (
              <li key={i} style={{ marginBottom: "0.4rem" }}>{note}</li>
            ))}
          </ul>
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

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;
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

          {/* ── Version selector ────────────────────────────────────────── */}
          {versions.length > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
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
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    Version {v.version_number}
                    {v.id === template.latest_version_id ? " (latest)" : ""}
                    {v.quality_score != null ? ` — score ${v.quality_score}` : ""}
                  </option>
                ))}
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
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary, #6b7280)", marginBottom: "1.5rem" }}>
              No versions saved yet for this template.
            </p>
          )}

          {/* ── AI Generation Notes ─────────────────────────────────────── */}
          {selectedVersion && <AiGenerationNotes version={selectedVersion} />}

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
