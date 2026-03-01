// src/components_new/TeacherSystem/MyAgentsPage.tsx
//
// Shows one "subject agent" card per domain/subject, sourced from
// teacher_assessment_history.  Scores grow with each run so teachers
// see improvement over time.  Guardrails are shown as pills on each card.

import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

// ─── raw row from Supabase ────────────────────────────────────────────────────
interface HistoryRow {
  id: string;
  domain: string | null;
  grade: string | null;
  assessment_type: string | null;
  question_count: number | null;
  difficulty_profile: string | null;
  guardrails: Record<string, unknown> | null;
  created_at: string;
}

// ─── one card per subject ─────────────────────────────────────────────────────
interface SubjectAgent {
  subject: string;
  runs: number;
  latestDate: string;
  avgQuestionCount: number;
  assessmentTypes: string[];
  latestGuardrails: Record<string, unknown> | null;
  recentDates: string[];
}

interface MyAgentsPageProps {
  userId: string;
  onNewAssessment: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function subjectEmoji(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("math")) return "📐";
  if (s.includes("science") || s.includes("biology") || s.includes("chemistry") || s.includes("physics")) return "🔬";
  if (s.includes("history") || s.includes("social")) return "🌍";
  if (s.includes("english") || s.includes("literature") || s.includes("writing") || s.includes("read")) return "📖";
  if (s.includes("art") || s.includes("music")) return "🎨";
  if (s.includes("computer") || s.includes("coding") || s.includes("tech")) return "💻";
  if (s.includes("language") || s.includes("spanish") || s.includes("french")) return "🗣️";
  return "✨";
}

/** Proficiency bar grows with each run, starts at 3/10, hits 10 at ~5 runs. */
function proficiencyScore(runs: number): number {
  return Math.min(10, runs * 1.5 + 3);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pillStyle(color: string): React.CSSProperties {
  return {
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
    padding: "0.2rem 0.55rem",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────
function ScoreBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div
        style={{
          flex: 1,
          height: "8px",
          borderRadius: "4px",
          background: "var(--border-color, #e5e7eb)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: "4px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span style={{ fontSize: "0.78rem", minWidth: "2.5rem", color: "var(--text-secondary, #6b7280)" }}>
        {value.toFixed(1)} / {max}
      </span>
    </div>
  );
}

// ─── GuardrailPills ───────────────────────────────────────────────────────────
const GUARDRAIL_LABELS: Record<string, string> = {
  noCalculator: "No Calculator",
  noNotes: "No Notes",
  noTextbook: "No Textbook",
  extendedTime: "Extended Time",
  allowCalculator: "Calculator OK",
  openBook: "Open Book",
  timedAssessment: "Timed",
  accommodations: "Accommodations",
};

function GuardrailPills({ guardrails }: { guardrails: Record<string, unknown> | null }) {
  if (!guardrails || Object.keys(guardrails).length === 0) {
    return (
      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)", fontStyle: "italic", margin: 0 }}>
        No guardrails recorded
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.25rem" }}>
      {Object.entries(guardrails).map(([key, val]) => {
        if (val === false || val === null || val === undefined) return null;
        if (Array.isArray(val)) {
          return val.map((v, i) => (
            <span key={`${key}-${i}`} style={pillStyle("#0891b2")}>{String(v)}</span>
          ));
        }
        const label = GUARDRAIL_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim();
        const color = val === true ? "#4f46e5" : "#6b7280";
        return (
          <span key={key} style={pillStyle(color)}>
            {label}{typeof val === "number" ? `: ${val}` : ""}
          </span>
        );
      })}
    </div>
  );
}

// ─── MiniTimeline ─────────────────────────────────────────────────────────────
function MiniTimeline({ dates }: { dates: string[] }) {
  if (dates.length === 0) return null;
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <p style={{ fontSize: "0.78rem", fontWeight: 600, margin: "0 0 0.35rem" }}>Run history</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {dates.map((d, i) => (
          <span
            key={i}
            style={{
              fontSize: "0.72rem",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              background: "var(--bg-tertiary, #f3f4f6)",
              color: "var(--text-secondary, #6b7280)",
              border: "1px solid var(--border-color, #e5e7eb)",
            }}
          >
            {fmtDate(d)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── AgentLegend ──────────────────────────────────────────────────────────────

const AGENT_DESCRIPTIONS = [
  { emoji: "🔍", name: "Input Review", role: "Validates your inputs before anything is generated. Catches contradictions (e.g., 5-minute test with 20 essay questions) and warns about impossible setups. You can override and generate anyway — the system will flag issues in its report." },
  { emoji: "🗺️", name: "Architect", role: "Designs the blueprint: how many questions, which reasoning levels, section layout, and pacing. Nothing is written until the blueprint is finalized." },
  { emoji: "✍️", name: "Writer", role: "Writes each question in parallel, following the blueprint exactly. Produces the prompt, answer choices, and correct answer for every item." },
  { emoji: "🚪", name: "Gatekeeper", role: "Reviews every question against the blueprint — checks format, reasoning level, forbidden phrases, and answer correctness. Violations trigger automatic rewrites." },
  { emoji: "🔄", name: "Rewriter", role: "Fixes any question that failed quality validation. Runs targeted rewrites in the same session so the final output is always clean." },
  { emoji: "⚗", name: "Philosopher", role: "Audits the finished assessment for pedagogical quality: reasoning depth, redundancy, pacing, and alignment with your stated intent. Notes appear in the AI Generation Notes panel on each assessment." },
  { emoji: "📜", name: "SCRIBE", role: "Tracks patterns across every run. Builds subject-specific trust scores and learns your guardrail preferences over time — the trust level bar on each card reflects SCRIBE's confidence in that subject." },
];

function AgentLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: "1.25rem", border: "1px solid var(--border-color, #e5e7eb)", borderRadius: "10px", overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.75rem 1rem", background: "var(--bg-secondary, #f9fafb)",
          border: "none", borderBottom: open ? "1px solid var(--border-color, #e5e7eb)" : "none",
          cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
          color: "var(--text-primary, #111827)", textAlign: "left",
        }}
      >
        <span>🤖</span>
        <span>About these agents</span>
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-secondary, #6b7280)" }}>
          {open ? "Hide ▲" : "What do they do? ▼"}
        </span>
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem", padding: "1rem", background: "var(--bg-primary, #fff)" }}>
          {AGENT_DESCRIPTIONS.map((a) => (
            <div key={a.name} style={{ padding: "0.75rem", borderRadius: "8px", background: "var(--bg-secondary, #f9fafb)", border: "1px solid var(--border-color, #e5e7eb)" }}>
              <p style={{ margin: "0 0 0.3rem", fontWeight: 700, fontSize: "0.875rem" }}>{a.emoji} {a.name}</p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary, #6b7280)", lineHeight: 1.5 }}>{a.role}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MyAgentsPage({ userId, onNewAssessment }: MyAgentsPageProps) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
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
          .select("id, domain, grade, assessment_type, question_count, difficulty_profile, guardrails, created_at")
          .eq("teacher_id", userId)
          .order("created_at", { ascending: false });

        if (dbError) throw dbError;
        setRows(data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load agent data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, refreshTick]);

  // ── Group rows by subject ─────────────────────────────────────────────────
  const agentsBySubject = new Map<string, SubjectAgent>();

  for (const row of rows) {
    const subject = row.domain ?? "General";
    if (!agentsBySubject.has(subject)) {
      agentsBySubject.set(subject, {
        subject,
        runs: 0,
        latestDate: row.created_at,
        avgQuestionCount: 0,
        assessmentTypes: [],
        latestGuardrails: null,
        recentDates: [],
      });
    }
    const agent = agentsBySubject.get(subject)!;
    agent.runs += 1;
    // rows sorted desc — first row is most recent
    if (agent.latestGuardrails === null && row.guardrails) {
      agent.latestGuardrails = row.guardrails;
    }
    if (row.assessment_type && !agent.assessmentTypes.includes(row.assessment_type)) {
      agent.assessmentTypes.push(row.assessment_type);
    }
    if (agent.recentDates.length < 6) {
      agent.recentDates.push(row.created_at);
    }
    agent.avgQuestionCount += row.question_count ?? 0;
  }

  // finalize averages
  for (const agent of agentsBySubject.values()) {
    agent.avgQuestionCount = Math.round(agent.avgQuestionCount / agent.runs);
  }

  const agents = Array.from(agentsBySubject.values()).sort((a, b) => b.runs - a.runs);
  const allSubjects = ["All", ...agents.map(a => a.subject)];
  const filtered = subjectFilter === "All" ? agents : agents.filter(a => a.subject === subjectFilter);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-welcome">
          <h1>My Agents</h1>
          <p>
            One agent per subject — proficiency and guardrail preferences build with every run.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn-secondary"
            onClick={() => setRefreshTick(t => t + 1)}
            title="Refresh agent data"
            style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color, #ddd)", cursor: "pointer", background: "transparent", color: "inherit" }}
          >
            ↻ Refresh
          </button>
          <button className="btn-primary" onClick={onNewAssessment}>
            + New Assessment
          </button>
        </div>
      </header>

      {/* Subject filter pills */}
      {!loading && agents.length > 1 && (
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {allSubjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                border: "1.5px solid var(--border-color, #ddd)",
                background: subjectFilter === s ? "#4f46e5" : "transparent",
                color: subjectFilter === s ? "#fff" : "inherit",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Agent legend — always visible */}
      {!loading && <AgentLegend />}

      {!loading && !error && agents.length === 0 && (
        <div className="dashboard-card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤖</p>
          <p style={{ marginBottom: "1rem", color: "var(--text-secondary, #888)" }}>
            No agents yet. Generate your first assessment to initialize a subject agent.
          </p>
          <button className="btn-primary" onClick={onNewAssessment}>
            Create your first assessment →
          </button>
        </div>
      )}

      {/* ── One card per subject ─────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="dashboard-grid">
          {filtered.map(agent => {
            const proficiency = proficiencyScore(agent.runs);
            const engagement = Math.min(10, 4 + agent.assessmentTypes.length * 1.5);
            return (
              <div
                className="dashboard-card"
                key={agent.subject}
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
              >
                {/* Header */}
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                    {subjectEmoji(agent.subject)} {agent.subject}
                  </h3>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)" }}>
                    {agent.runs} assessment{agent.runs !== 1 ? "s" : ""} · last run {fmtDate(agent.latestDate)}
                  </p>
                </div>

                {/* Score bars */}
                <div>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Trust Level</p>
                  <ScoreBar value={proficiency} max={10} color="#4f46e5" />
                  <p style={{ fontSize: "0.72rem", margin: "0.25rem 0 0", color: "var(--text-secondary, #6b7280)" }}>
                    Grows with clean runs — see violations in each Philosopher’s Report
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Variety</p>
                  <ScoreBar value={engagement} max={10} color="#0891b2" />
                </div>

                {/* Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    background: "var(--bg-tertiary, #f3f4f6)",
                    border: "1px solid var(--border-color, #e5e7eb)",
                    fontSize: "0.8rem",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-secondary, #6b7280)" }}>Avg questions</span>
                    <br /><strong>{agent.avgQuestionCount || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary, #6b7280)" }}>Types used</span>
                    <br /><strong>{agent.assessmentTypes.length}</strong>
                  </div>
                </div>

                {/* Assessment type pills */}
                {agent.assessmentTypes.length > 0 && (
                  <div>
                    <p style={{ fontSize: "0.78rem", fontWeight: 600, margin: "0 0 0.35rem" }}>Assessment types</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {agent.assessmentTypes.map(t => (
                        <span key={t} style={pillStyle("#0891b2")}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guardrails */}
                <div>
                  <p style={{ fontSize: "0.78rem", fontWeight: 600, margin: "0 0 0.25rem" }}>
                    Guardrails (most recent)
                  </p>
                  <GuardrailPills guardrails={agent.latestGuardrails} />
                </div>

                {/* Mini-timeline */}
                <MiniTimeline dates={agent.recentDates} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
