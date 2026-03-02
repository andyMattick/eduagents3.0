// src/components_new/TeacherSystem/MyAssessmentsPage.tsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/supabase/client";

interface TemplateRecord {
  id: string;
  domain: string | null;
  uar_json: Record<string, any> | null;
  created_at: string;
  latest_version_id: string | null;
}


interface MyAssessmentsPageProps {
  teacherId: string;
  onNewAssessment: () => void;
  /** Called when teacher selects a versioned template to inspect */
  onViewTemplate?: (templateId: string) => void;
}

export function MyAssessmentsPage({ teacherId, onNewAssessment, onViewTemplate }: MyAssessmentsPageProps) {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());

  const toggleDomain = (domain: string) =>
    setCollapsedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain); else next.add(domain);
      return next;
    });

  /** templates grouped by domain, sorted alphabetically */
  const grouped = useMemo(() => {
    const map: Record<string, TemplateRecord[]> = {};
    for (const t of templates) {
      const key = t.domain?.trim() || "Uncategorized";
      (map[key] ??= []).push(t);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [templates]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: tmplErr } = await supabase
          .from("assessment_templates")
          .select("id, domain, uar_json, created_at, latest_version_id")
          .eq("user_id", teacherId)
          .order("created_at", { ascending: false });
        if (tmplErr) throw tmplErr;
        setTemplates(data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load assessments");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teacherId, refreshTick]);

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

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && templates.length === 0 && (
        <div className="dashboard-card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ marginBottom: "1rem", color: "var(--color-muted, #888)" }}>
            No assessments yet.
          </p>
          <button className="btn-primary" onClick={onNewAssessment}>
            Create your first assessment →
          </button>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div>
          {grouped.map(([domain, rows]) => {
            const isOpen = !collapsedDomains.has(domain);
            return (
              <div key={domain} style={{ marginBottom: "1.5rem" }}>
                {/* Domain section header */}
                <button
                  onClick={() => toggleDomain(domain)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    background: "var(--bg-secondary, #f3f4f6)",
                    border: "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: "8px",
                    padding: "0.55rem 0.9rem",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "var(--text-primary, #111)",
                    marginBottom: isOpen ? "0" : undefined,
                  }}
                >
                  <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>{isOpen ? "▾" : "▸"}</span>
                  <span>{domain}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.75rem",
                      fontWeight: 400,
                      color: "var(--text-secondary, #6b7280)",
                    }}
                  >
                    {rows.length} assessment{rows.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ overflowX: "auto", borderRadius: "0 0 8px 8px", border: "1px solid var(--border-color, #e5e7eb)", borderTop: "none" }}>
                    <table
                      style={{
                        width: "100%",
                        minWidth: "500px",
                        borderCollapse: "collapse",
                        fontSize: "0.9rem",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--border-color, #e5e7eb)",
                            textAlign: "left",
                            background: "var(--bg-tertiary, #f9fafb)",
                          }}
                        >
                          <th style={{ padding: "0.5rem 0.75rem" }}>Type</th>
                          <th style={{ padding: "0.5rem 0.75rem" }}>Grade</th>
                          <th style={{ padding: "0.5rem 0.75rem" }}>Created</th>
                          <th style={{ padding: "0.5rem 0.75rem" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((tmpl, i) => {
                          const uar = tmpl.uar_json ?? {};
                          return (
                            <tr
                              key={tmpl.id}
                              style={{
                                borderBottom: "1px solid var(--border-color, #e5e7eb)",
                                background: i % 2 === 0 ? "transparent" : "var(--bg-tertiary, #f9fafb)",
                              }}
                            >
                              <td style={{ padding: "0.6rem 0.75rem" }}>
                                {uar.assessmentType ? (
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
                                    {uar.assessmentType}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td style={{ padding: "0.6rem 0.75rem" }}>
                                {Array.isArray(uar.gradeLevels)
                                  ? uar.gradeLevels.join(", ")
                                  : (uar.grade ?? "—")}
                              </td>
                              <td
                                style={{
                                  padding: "0.6rem 0.75rem",
                                  color: "var(--text-secondary, #6b7280)",
                                }}
                              >
                                {fmt(tmpl.created_at)}
                              </td>
                              <td style={{ padding: "0.6rem 0.75rem" }}>
                                {onViewTemplate && (
                                  <button
                                    onClick={() => onViewTemplate(tmpl.id)}
                                    style={{
                                      padding: "0.3rem 0.9rem",
                                      borderRadius: "8px",
                                      border: "1.5px solid var(--color-accent, #4f46e5)",
                                      background: "transparent",
                                      color: "var(--color-accent, #4f46e5)",
                                      cursor: "pointer",
                                      fontSize: "0.82rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
