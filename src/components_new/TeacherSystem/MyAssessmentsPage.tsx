// src/components_new/TeacherSystem/MyAssessmentsPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

interface AssessmentRecord {
  id: string;
  teacher_id: string;
  domain: string | null;
  grade: string | null;
  assessment_type: string | null;
  question_count: number | null;
  question_types: string | null;
  difficulty_profile: string | null;
  guardrails: Record<string, unknown> | null;
  created_at: string;
}

interface MyAssessmentsPageProps {
  teacherId: string;
  onNewAssessment: () => void;
}

function guardrailSummary(g: Record<string, unknown> | null): string {
  if (!g) return "—";
  const active = Object.entries(g)
    .filter(([, v]) => v === true || (typeof v === "string" && v !== "false"))
    .map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase().trim());
  return active.length > 0 ? active.join(", ") : "none";
}

export function MyAssessmentsPage({ teacherId, onNewAssessment }: MyAssessmentsPageProps) {
  const [rows, setRows] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from("teacher_assessment_history")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false });

        if (dbError) throw dbError;
        setRows(data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load assessments");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teacherId, refreshTick]);

  const subjects = ["All", ...Array.from(new Set(rows.map(r => r.domain ?? "Unknown")))];
  const filtered = subjectFilter === "All" ? rows : rows.filter(r => (r.domain ?? "Unknown") === subjectFilter);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-welcome">
          <h1>My Assessments</h1>
          <p>All assessments you've generated, sorted by most recent.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setRefreshTick(t => t + 1)}
            title="Refresh"
            style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color, #ddd)", cursor: "pointer", background: "transparent", color: "inherit" }}
          >
            ↻ Refresh
          </button>
          <button className="btn-primary" onClick={onNewAssessment}>
            + New Assessment
          </button>
        </div>
      </header>

      {/* Subject filter */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {subjects.map(s => (
          <button
            key={s}
            onClick={() => setSubjectFilter(s)}
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "999px",
              border: "1.5px solid var(--color-border, #ddd)",
              background: subjectFilter === s ? "var(--color-accent, #4f46e5)" : "transparent",
              color: subjectFilter === s ? "#fff" : "inherit",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="dashboard-card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ marginBottom: "1rem", color: "var(--color-muted, #888)" }}>
            No assessments yet
            {subjectFilter !== "All" ? ` for ${subjectFilter}` : ""}.
          </p>
          <button className="btn-primary" onClick={onNewAssessment}>
            Create your first assessment →
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color, #e5e7eb)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.75rem" }}>Subject</th>
                <th style={{ padding: "0.5rem 0.75rem" }}>Grade</th>
                <th style={{ padding: "0.5rem 0.75rem" }}>Type</th>
                <th style={{ padding: "0.5rem 0.75rem" }}>Questions</th>
                <th style={{ padding: "0.5rem 0.75rem" }}>Difficulty</th>
                <th style={{ padding: "0.5rem 0.75rem" }}>Guardrails</th>
                <th style={{ padding: "0.5rem 0.75rem" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid var(--color-border, #e5e7eb)",
                    background: i % 2 === 0 ? "transparent" : "var(--color-surface-alt, #f9fafb)",
                  }}
                >
                  <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>
                    {row.domain ?? "—"}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>{row.grade ?? "—"}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <span
                      style={{
                        background: "var(--color-accent-muted, #ede9fe)",
                        color: "var(--color-accent, #4f46e5)",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      {row.assessment_type ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>{row.question_count ?? "—"}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>{row.difficulty_profile ?? "—"}</td>
                  <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)" }}>
                    {row.guardrails ? guardrailSummary(row.guardrails) : "—"}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary, #6b7280)" }}>
                    {row.created_at ? fmt(row.created_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
