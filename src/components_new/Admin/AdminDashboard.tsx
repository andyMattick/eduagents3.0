import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

interface PipelineReport {
  id: string;
  user_id: string;
  assessment_version_id: string | null;
  severity: "none" | "warning" | "error";
  category: string | null;
  faulting_agent: string | null;
  summary: string | null;
  probable_cause: string | null;
  suggested_fix: string | null;
  signals: unknown;
  quality_score: number | null;
  teacher_note: string | null;
  created_at: string;
}

function SeverityBadge({ severity }: { severity: PipelineReport["severity"] }) {
  const styles: Record<string, React.CSSProperties> = {
    error:   { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" },
    warning: { background: "#fffbeb", color: "#d97706", border: "1px solid #fcd34d" },
    none:    { background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" },
  };
  return (
    <span style={{
      ...styles[severity] ?? styles.none,
      padding: "0.15rem 0.55rem",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 700,
    }}>
      {severity}
    </span>
  );
}

export const AdminDashboard = () => {
  const [reports, setReports] = useState<PipelineReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "warning" | "error">("all");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("pipeline_reports")
      .select("id, user_id, assessment_version_id, severity, category, faulting_agent, summary, probable_cause, suggested_fix, signals, quality_score, teacher_note, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setReports((data ?? []) as PipelineReport[]);
        setLoading(false);
      });
  }, []);

  const visible = filter === "all" ? reports : reports.filter(r => r.severity === filter);

  const counts = {
    all:     reports.length,
    warning: reports.filter(r => r.severity === "warning").length,
    error:   reports.filter(r => r.severity === "error").length,
  };

  return (
    <div className="dashboard-container" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Pipeline Reports</h1>
      <p style={{ color: "#6b7280", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
        Submitted by teachers when generation looked unusual. Classified deterministically — no LLM.
      </p>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {(["all", "error", "warning"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "0.3rem 0.85rem",
              borderRadius: "999px",
              border: `1.5px solid ${filter === f ? "#4f46e5" : "#e5e7eb"}`,
              background: filter === f ? "#4f46e5" : "#fff",
              color: filter === f ? "#fff" : "#374151",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {f === "all" ? `All (${counts.all})` : f === "error" ? `⚠ Errors (${counts.error})` : `ℹ Warnings (${counts.warning})`}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "#6b7280" }}>Loading…</p>}
      {error   && <p style={{ color: "#dc2626" }}>Error: {error}</p>}

      {!loading && !error && visible.length === 0 && (
        <p style={{ color: "#6b7280", fontStyle: "italic" }}>No reports yet.</p>
      )}

      {!loading && visible.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.83rem",
          }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                {["Severity", "Category", "Faulting agent", "Summary", "Suggested fix", "Quality", "Note", "Time"].map(h => (
                  <th key={h} style={{ padding: "0.55rem 0.75rem", borderBottom: "1.5px solid #e5e7eb", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6" }}>
                    <SeverityBadge severity={r.severity} />
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>
                    {r.category ?? "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>
                    {r.faulting_agent ?? "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6", maxWidth: "280px" }}>
                    {r.summary ?? "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6", maxWidth: "220px", color: "#6b7280", fontStyle: "italic" }}>
                    {r.suggested_fix ?? "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6", textAlign: "center" }}>
                    {r.quality_score ?? "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6", maxWidth: "180px", color: "#374151" }}>
                    {r.teacher_note ?? <span style={{ color: "#d1d5db" }}>none</span>}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap", color: "#9ca3af" }}>
                    {new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

