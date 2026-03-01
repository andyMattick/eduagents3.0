// src/components_new/TeacherSystem/TeacherDashboard.tsx
//
// Assignment-centric dashboard. Loads assessment_templates and renders
// one card per template. Replaces the old agent-centric layout.

import React, { useCallback, useEffect, useState } from "react";
import "./TeacherDashboard.css";
import { supabase } from "@/supabase/client";
import { useUserFlow } from "../../hooks/useUserFlow";

interface TeacherDashboardProps {
  teacherId: string;
  teacherName?: string;
  onNavigate: (page: string, data?: any) => void;
}

interface TemplateRow {
  id: string;
  domain: string | null;
  uar_json: Record<string, any> | null;
  created_at: string;
  latest_version_id: string | null;
}

// We join latest version inline to get question count without a second query
interface VersionMeta {
  id: string;
  version_number: number;
  quality_score: number | null;
  assessment_json: { totalItems?: number; items?: any[] } | null;
}

interface TemplateSummary extends TemplateRow {
  latestVersion: VersionMeta | null;
}

function assessmentLabel(uar: Record<string, any> | null): string {
  if (!uar) return "Assessment";
  const type = uar.assessmentType ?? "";
  const labels: Record<string, string> = {
    bellRinger: "Bell Ringer",
    exitTicket: "Exit Ticket",
    quiz: "Quiz",
    test: "Test",
    worksheet: "Worksheet",
    testReview: "Test Review",
  };
  return labels[type] ?? type;
}

function titleFor(uar: Record<string, any> | null, domain: string | null): string {
  if (!uar) return domain ?? "Assessment";
  const parts = [
    uar.course ?? uar.topic ?? domain ?? "Assessment",
    uar.unitName ?? uar.lessonName,
  ].filter(Boolean);
  return parts.join(" – ");
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherId,
  teacherName,
  onNavigate,
}) => {
  const { reset } = useUserFlow();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: tmplData, error: tmplErr } = await supabase
        .from("assessment_templates")
        .select("id, domain, uar_json, created_at, latest_version_id")
        .eq("user_id", teacherId)
        .order("created_at", { ascending: false });

      if (tmplErr) throw tmplErr;

      const rows = tmplData ?? [];

      // Batch-fetch latest versions for all templates
      const latestIds = rows
        .map((r) => r.latest_version_id)
        .filter(Boolean) as string[];

      let versMap: Record<string, VersionMeta> = {};
      if (latestIds.length > 0) {
        const { data: versData } = await supabase
          .from("assessment_versions")
          .select("id, version_number, quality_score, assessment_json")
          .in("id", latestIds);
        for (const v of versData ?? []) {
          versMap[v.id] = v as VersionMeta;
        }
      }

      setTemplates(
        rows.map((r) => ({
          ...r,
          latestVersion: r.latest_version_id ? versMap[r.latest_version_id] ?? null : null,
        }))
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    reset();
    load();
  }, [reset, load]);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-welcome">
          <h1>My Assessments</h1>
          {teacherName && (
            <p className="school-name">Welcome back, {teacherName}!</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={load}
            title="Refresh"
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              border: "1px solid var(--border-color, #ddd)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            ↻
          </button>
          <button
            className="btn-primary"
            onClick={() => onNavigate("createAssessment")}
          >
            + Create New Assessment
          </button>
        </div>
      </header>

      {/* Loading / Error */}
      {loading && (
        <p style={{ color: "var(--text-secondary, #6b7280)", padding: "1rem 0" }}>
          Loading your assessments…
        </p>
      )}
      {error && (
        <p style={{ color: "var(--color-error, #ef4444)", padding: "1rem 0" }}>
          {error}
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && templates.length === 0 && (
        <div
          className="dashboard-card"
          style={{ textAlign: "center", padding: "3rem", marginTop: "1rem" }}
        >
          <p
            style={{
              fontSize: "1.05rem",
              color: "var(--text-secondary, #6b7280)",
              marginBottom: "1.5rem",
            }}
          >
            You haven't created any assessments yet.
          </p>
          <button
            className="btn-primary"
            onClick={() => onNavigate("createAssessment")}
          >
            Create your first assessment →
          </button>
        </div>
      )}

      {/* Assessment cards */}
      {!loading && templates.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
            marginTop: "0.5rem",
          }}
        >
          {templates.map((tmpl) => {
            const uar = tmpl.uar_json ?? {};
            const title = titleFor(uar, tmpl.domain);
            const label = assessmentLabel(uar);
            const grade = Array.isArray(uar.gradeLevels)
              ? uar.gradeLevels.join(", ")
              : (uar.grade ?? null);
            const versionNum = tmpl.latestVersion?.version_number ?? null;
            const qCount =
              tmpl.latestVersion?.assessment_json?.totalItems ??
              tmpl.latestVersion?.assessment_json?.items?.length ??
              null;
            const score = tmpl.latestVersion?.quality_score ?? null;

            return (
              <div
                key={tmpl.id}
                className="dashboard-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, transform 0.1s",
                }}
                onClick={() => onNavigate("viewTemplate", { templateId: tmpl.id })}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 4px 16px rgba(79, 70, 229, 0.15)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                }}
              >
                {/* Card title */}
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text-primary, #1f2937)",
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </div>

                {/* Meta row */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    fontSize: "0.8rem",
                    alignItems: "center",
                  }}
                >
                  {label && (
                    <span
                      style={{
                        background: "var(--color-accent-muted, #ede9fe)",
                        color: "var(--color-accent, #4f46e5)",
                        padding: "0.15rem 0.55rem",
                        borderRadius: "999px",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      {label}
                    </span>
                  )}
                  {grade && (
                    <span style={{ color: "var(--text-secondary, #6b7280)" }}>
                      Grade {grade}
                    </span>
                  )}
                  {qCount && (
                    <span style={{ color: "var(--text-secondary, #6b7280)" }}>
                      · {qCount} question{qCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {versionNum && (
                    <span style={{ color: "var(--text-secondary, #6b7280)" }}>
                      · v{versionNum}
                    </span>
                  )}
                  {score != null && score >= 8 && (
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#15803d",
                        padding: "0.1rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                      }}
                    >
                      Aligned
                    </span>
                  )}
                  {score != null && score < 8 && score >= 5 && (
                    <span
                      style={{
                        background: "#fef9c3",
                        color: "#854d0e",
                        padding: "0.1rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                      }}
                    >
                      Revised
                    </span>
                  )}
                </div>

                {/* Date + Open button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary, #9ca3af)",
                    }}
                  >
                    {fmt(tmpl.created_at)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate("viewTemplate", { templateId: tmpl.id });
                    }}
                    style={{
                      padding: "0.3rem 0.85rem",
                      borderRadius: "7px",
                      border: "1.5px solid var(--color-accent, #4f46e5)",
                      background: "transparent",
                      color: "var(--color-accent, #4f46e5)",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
