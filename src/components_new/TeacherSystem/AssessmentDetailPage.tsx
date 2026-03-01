// src/components_new/TeacherSystem/AssessmentDetailPage.tsx
//
// Phase 2 + Phase 3 — Versioned assessment viewer with Regenerate + Branch.
// Loads assessment_templates + assessment_versions from Supabase,
// renders the selected version via AssessmentViewer, and lets teachers
// regenerate the same UAR or branch it with edits.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabase/client";
import type { FinalAssessment } from "@/pipeline/agents/builder/FinalAssessment";
import type { UnifiedAssessmentRequest } from "@/pipeline/contracts";
import { generateAssessment } from "@/config/aiConfig";
import { AssessmentViewer } from "../Pipeline/AssessmentViewer";

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

function AiGenerationNotes({ version, template }: { version: VersionRow; template: TemplateRow }) {
  const [open, setOpen] = useState(false);

  const blueprint  = version.blueprint_json ?? {};
  const plan       = blueprint.plan ?? {};
  const tokenUsage = version.token_usage ?? {};
  const score      = version.quality_score;
  const uar        = template.uar_json ?? {};

  // ── qualityLevel ────────────────────────────────────────────────────────
  let qualityLevel: string | null = null;
  if (score != null) {
    if (score >= 9)      qualityLevel = "Strong Alignment";
    else if (score >= 7) qualityLevel = "Well Aligned";
    else if (score >= 5) qualityLevel = "Minor Adjustments Made";
    else                 qualityLevel = "Substantial Adjustments Required";
  }

  // ── pacingAlignment ─────────────────────────────────────────────────────
  const requestedMins: number | null = uar.time != null ? Number(uar.time) : null;
  const totalItems = version.assessment_json?.totalItems ?? 0;
  const realisticMins: number | null =
    blueprint.realisticTotalMinutes != null
      ? Number(blueprint.realisticTotalMinutes)
      : plan.pacingSecondsPerItem != null && totalItems > 0
        ? Math.round((plan.pacingSecondsPerItem * totalItems) / 60)
        : null;

  let pacingAlignment: string | null = null;
  if (requestedMins != null && realisticMins != null) {
    const diff = realisticMins - requestedMins;
    if (Math.abs(diff) <= 1)  pacingAlignment = "Pacing aligns with requested time.";
    else if (diff < 0)        pacingAlignment = "Question types were adjusted to fit the time limit.";
    else                      pacingAlignment = "Time constraints required simplification of some questions.";
  } else if (realisticMins != null) {
    pacingAlignment = `Estimated completion time: ~${realisticMins} minute${realisticMins !== 1 ? "s" : ""}.`;
  }

  // ── revisionSummary ─────────────────────────────────────────────────────
  const rewriteCount: number = blueprint.rewriteCount ?? tokenUsage.rewriteCount ?? 0;
  let revisionSummary: string;
  if      (rewriteCount === 0)  revisionSummary = "Generated without revisions.";
  else if (rewriteCount <= 2)   revisionSummary = "Minor refinements applied.";
  else if (rewriteCount <= 5)   revisionSummary = "Several refinements applied for clarity and alignment.";
  else                          revisionSummary = "Significant adjustments were required.";

  // ── notes[] — teacher-facing only, no internal labels ───────────────────
  const forbidden = /bloom|gatekeeper|severity|trust|drift|agent/i;
  const notes: string[] = [
    ...(blueprint.constraintWarnings ?? []),
    ...(blueprint.truncationEvents   ?? []),
    ...(blueprint.notes              ?? []),
  ].filter((s: string) => !forbidden.test(s));

  if (version.parent_version_id) {
    notes.push("This is a revised version — generated based on a prior attempt.");
  }

  // ── badge colours ────────────────────────────────────────────────────────
  const badgeBg    = score != null ? (score >= 8 ? "#dcfce7" : score >= 5 ? "#fef9c3" : "#fee2e2") : undefined;
  const badgeColor = score != null ? (score >= 8 ? "#166534" : score >= 5 ? "#854d0e" : "#991b1b") : undefined;

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
            gap: "0.6rem",
          }}
        >
          {qualityLevel && score != null && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                alignSelf: "flex-start",
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                fontSize: "0.8rem",
                fontWeight: 700,
                background: badgeBg,
                color: badgeColor,
              }}
            >
              {qualityLevel}
            </div>
          )}

          {pacingAlignment && (
            <p style={{ margin: 0 }}>
              <strong>Pacing: </strong>{pacingAlignment}
            </p>
          )}

          <p style={{ margin: 0 }}>
            <strong>Revisions: </strong>{revisionSummary}
          </p>

          {notes.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
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

  // ── Phase 3 — Assign active version state ───────────────────────────────
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

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
                        {v.id === template.latest_version_id ? " (active)" : ""}
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
                {selectedVersionId && selectedVersionId === template.latest_version_id ? (
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
                    border: "1.5px solid var(--color-accent, #4f46e5)",
                    background: showBranchForm ? "var(--color-accent, #4f46e5)" : "transparent",
                    color: showBranchForm ? "#fff" : "var(--color-accent, #4f46e5)",
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
