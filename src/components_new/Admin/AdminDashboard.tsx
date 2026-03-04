import { useEffect, useState, Fragment } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/supabase/client";
import { useAuth } from "@/components_new/Auth/useAuth";

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
  incident_json: Record<string, any> | null;
}

type ReportSource = "flagged" | "voluntary" | "recommended";

/** Derive report source from the signals array injected by pipelineReportService. */
function getReportSource(signals: unknown): ReportSource {
  if (!Array.isArray(signals)) return "flagged";
  const match = (signals as string[]).find((s: string) => s.startsWith("report_source:"));
  if (!match) return "flagged";
  const src = match.split(":")[1] as ReportSource;
  return src === "voluntary" || src === "recommended" ? src : "flagged";
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

function SourceBadge({ source }: { source: ReportSource }) {
  const styles: Record<ReportSource, React.CSSProperties> = {
    flagged:     { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" },
    recommended: { background: "#eef2ff", color: "#3730a3", border: "1px solid #a5b4fc" },
    voluntary:   { background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" },
  };
  const labels: Record<ReportSource, string> = {
    flagged:     "⚠ flagged",
    recommended: "✨ prescription",
    voluntary:   "💬 voluntary",
  };
  return (
    <span style={{ ...styles[source], padding: "0.15rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {labels[source]}
    </span>
  );
}

type FilterMode = "all" | "error" | "warning" | "voluntary" | "recommended";

// ── IncidentPanel ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: "0.75rem", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "0.45rem 0.75rem",
          background: "#f9fafb", border: "none", cursor: "pointer",
          fontWeight: 700, fontSize: "0.8rem", color: "#374151",
          display: "flex", justifyContent: "space-between",
        }}
      >
        {title}
        <span style={{ fontWeight: 400, color: "#9ca3af" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0.6rem 0.75rem", fontSize: "0.78rem", color: "#374151", lineHeight: 1.6 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.15rem" }}>
      <span style={{ color: "#6b7280", minWidth: "130px", flexShrink: 0 }}>{k}:</span>
      <span style={{ color: "#111827", wordBreak: "break-word" }}>{v ?? <em style={{ color: "#d1d5db" }}>—</em>}</span>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "0.1rem 0.4rem", borderRadius: "4px",
      background: color + "22", color, border: `1px solid ${color}44`,
      fontSize: "0.72rem", fontWeight: 600, marginRight: "0.3rem", marginBottom: "0.2rem",
    }}>
      {label}
    </span>
  );
}

function IncidentPanel({ inc }: { inc: Record<string, any> }) {
  const ti  = inc.teacher_intent    ?? {};
  const du  = inc.defaults_used     ?? {};
  const pa  = inc.prescriptions_added ?? {};
  const ps  = inc.pipeline_status   ?? {};
  const rh  = inc.rewrite_history   ?? {};
  const sa  = inc.system_analysis   ?? {};
  const fo  = inc.final_output      ?? {};

  const agentStatusColor = (s: string) =>
    s === "ok" ? "#16a34a" : s === "skipped" ? "#9ca3af" : "#dc2626";

  return (
    <div style={{ padding: "0.75rem 1rem", background: "#fafafa" }}>
      <Section title="§1 Teacher Intent">
        <KV k="Topic"        v={ti.topic} />
        <KV k="Subject"      v={ti.subject} />
        <KV k="Grade level"  v={ti.gradeLevel} />
        <KV k="Time limit"   v={ti.timeLimitMinutes != null ? `${ti.timeLimitMinutes} min` : null} />
        {(ti.explicitInstructions ?? []).length > 0 && (
          <div><span style={{ color: "#6b7280" }}>Custom instructions:</span>
            <ul style={{ margin: "0.2rem 0 0 1rem", padding: 0 }}>
              {(ti.explicitInstructions as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
      </Section>

      <Section title="§2 Defaults Used">
        {(du.systemConstraints ?? []).length > 0 && (
          <div style={{ marginBottom: "0.25rem" }}>
            {(du.systemConstraints as string[]).map((s, i) => <Chip key={i} label={s} color="#6366f1" />)}
          </div>
        )}
        {(du.styleConstraints ?? []).length > 0 && (
          <div style={{ marginBottom: "0.25rem" }}>
            {(du.styleConstraints as string[]).map((s, i) => <Chip key={i} label={s} color="#0891b2" />)}
          </div>
        )}
        {du.planSlotCount != null && <KV k="Plan slots" v={du.planSlotCount} />}
        {du.planOrderingStrategy && <KV k="Ordering" v={du.planOrderingStrategy} />}
      </Section>

      <Section title="§3 Prescriptions Added">
        {(pa.scribeRequiredBehaviors ?? []).length === 0 &&
         (pa.scribeWeaknesses       ?? []).length === 0 &&
         (pa.gatekeeperConstraints  ?? []).length === 0 ? (
          <em style={{ color: "#9ca3af" }}>No prescriptions applied.</em>
        ) : (
          <>
            {(pa.scribeRequiredBehaviors as string[] ?? []).map((s, i) => <Chip key={i} label={`✦ ${s}`} color="#7c3aed" />)}
            {(pa.scribeWeaknesses       as string[] ?? []).map((s, i) => <Chip key={i} label={`⚡ ${s}`} color="#78716c" />)}
            {(pa.gatekeeperConstraints  as string[] ?? []).map((s, i) => <Chip key={i} label={`🔒 ${s}`} color="#b45309" />)}
          </>
        )}
      </Section>

      <Section title="§4 Pipeline Status">
        {Object.entries(ps).map(([agent, status]) => (
          <div key={agent} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: agentStatusColor(String(status)), flexShrink: 0, display: "inline-block" }} />
            <span style={{ color: "#6b7280", minWidth: "100px" }}>{agent}</span>
            <span style={{ color: agentStatusColor(String(status)), fontWeight: 600, fontSize: "0.75rem" }}>{String(status)}</span>
          </div>
        ))}
      </Section>

      <Section title="§5 Rewrite History">
        {rh.rewriteCount === 0 || rh.rewriteCount == null ? (
          <em style={{ color: "#9ca3af" }}>No rewrites.</em>
        ) : (
          <>
            <KV k="Rewrite count" v={rh.rewriteCount} />
            {(rh.violations as Array<{ type: string; message: string; itemId?: string }> ?? []).map((v, i) => (
              <div key={i} style={{ marginBottom: "0.3rem", paddingLeft: "0.5rem", borderLeft: "3px solid #f59e0b" }}>
                <strong style={{ color: "#92400e" }}>{v.type}</strong>{v.itemId ? <span style={{ color: "#9ca3af" }}> (item {v.itemId})</span> : null}
                <div style={{ color: "#6b7280" }}>{v.message}</div>
              </div>
            ))}
          </>
        )}
      </Section>

      <Section title="§6 System Analysis">
        <KV k="Severity"       v={<span style={{ fontWeight: 700, color: sa.severity === "error" ? "#dc2626" : sa.severity === "warning" ? "#d97706" : "#16a34a" }}>{sa.severity}</span>} />
        <KV k="Category"       v={sa.category} />
        <KV k="Summary"        v={sa.summary} />
        <KV k="Probable cause" v={sa.probableCause} />
        <KV k="Suggested fix"  v={sa.suggestedFix} />
        {(sa.signals ?? []).length > 0 && (
          <div style={{ marginTop: "0.3rem" }}>
            {(sa.signals as string[]).map((s, i) => <Chip key={i} label={s} color="#4b5563" />)}
          </div>
        )}
      </Section>

      <Section title="§7 Final Output">
        <KV k="Item count" v={fo.itemCount} />
        {(fo.questions ?? []).length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.4rem", fontSize: "0.76rem" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {["#", "Type", "Text (truncated)", "Issues"].map(h => (
                  <th key={h} style={{ padding: "0.25rem 0.4rem", textAlign: "left", fontWeight: 700, border: "1px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(fo.questions as Array<{ index: number; questionType: string; textSnippet: string; issues: string[] }>).map((q, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ padding: "0.25rem 0.4rem", border: "1px solid #e5e7eb" }}>{q.index}</td>
                  <td style={{ padding: "0.25rem 0.4rem", border: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{q.questionType}</td>
                  <td style={{ padding: "0.25rem 0.4rem", border: "1px solid #e5e7eb", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.textSnippet}</td>
                  <td style={{ padding: "0.25rem 0.4rem", border: "1px solid #e5e7eb" }}>
                    {q.issues.length > 0
                      ? q.issues.map((iss, j) => <Chip key={j} label={iss} color="#dc2626" />)
                      : <em style={{ color: "#d1d5db" }}>none</em>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

export const AdminDashboard = () => {
  const { logout } = useAuth();
  const [reports, setReports] = useState<PipelineReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("pipeline_reports")
      .select("id, user_id, assessment_version_id, severity, category, faulting_agent, summary, probable_cause, suggested_fix, signals, quality_score, teacher_note, created_at, incident_json")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setReports((data ?? []) as PipelineReport[]);
        setLoading(false);
      });
  }, []);

  const visible = reports.filter(r => {
    if (filter === "all")         return true;
    if (filter === "error")       return r.severity === "error";
    if (filter === "warning")     return r.severity === "warning";
    const src = getReportSource(r.signals);
    if (filter === "voluntary")   return src === "voluntary";
    if (filter === "recommended") return src === "recommended";
    return true;
  });

  const counts: Record<FilterMode, number> = {
    all:         reports.length,
    error:       reports.filter(r => r.severity === "error").length,
    warning:     reports.filter(r => r.severity === "warning").length,
    voluntary:   reports.filter(r => getReportSource(r.signals) === "voluntary").length,
    recommended: reports.filter(r => getReportSource(r.signals) === "recommended").length,
  };

  const filterConfig: { id: FilterMode; label: string }[] = [
    { id: "all",         label: `All (${counts.all})` },
    { id: "error",       label: `⚠ Errors (${counts.error})` },
    { id: "warning",     label: `ℹ Warnings (${counts.warning})` },
    { id: "recommended", label: `✨ Prescription (${counts.recommended})` },
    { id: "voluntary",   label: `💬 Voluntary (${counts.voluntary})` },
  ];

  return (
    <div className="dashboard-container" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>Pipeline Reports</h1>
        <button
          onClick={logout}
          style={{
            padding: "0.4rem 1rem",
            borderRadius: "8px",
            border: "1.5px solid #e5e7eb",
            background: "#fff",
            color: "#374151",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
      <p style={{ color: "#6b7280", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
        Submitted by teachers. <strong>Flagged</strong> = system detected an issue.{" "}
        <strong>Prescription</strong> = AI writing rules were active.{" "}
        <strong>Voluntary</strong> = teacher sent unprompted feedback.
      </p>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {filterConfig.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              padding: "0.3rem 0.85rem",
              borderRadius: "999px",
              border: `1.5px solid ${filter === id ? "#4f46e5" : "#e5e7eb"}`,
              background: filter === id ? "#4f46e5" : "#fff",
              color: filter === id ? "#fff" : "#374151",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {label}
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                {["Source", "Severity", "Category", "Faulting agent", "Summary", "Suggested fix", "Quality", "Note", "Time", ""].map(h => (
                  <th key={h} style={{ padding: "0.55rem 0.75rem", borderBottom: "1.5px solid #e5e7eb", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <Fragment key={r.id}>
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6" }}>
                      <SourceBadge source={getReportSource(r.signals)} />
                    </td>
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
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f3f4f6" }}>
                      {r.incident_json && (
                        <button
                          onClick={() => setExpandedIncident(expandedIncident === r.id ? null : r.id)}
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "6px",
                            border: "1.5px solid #6366f1",
                            background: expandedIncident === r.id ? "#6366f1" : "#fff",
                            color: expandedIncident === r.id ? "#fff" : "#6366f1",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {expandedIncident === r.id ? "Hide" : "View Incident"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedIncident === r.id && r.incident_json && (
                    <tr key={`${r.id}-incident`}>
                      <td colSpan={10} style={{ padding: 0, borderBottom: "2px solid #6366f1" }}>
                        <IncidentPanel inc={r.incident_json} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

