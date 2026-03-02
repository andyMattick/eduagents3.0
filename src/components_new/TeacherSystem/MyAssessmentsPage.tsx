// src/components_new/TeacherSystem/MyAssessmentsPage.tsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/supabase/client";
import "./MyAssessmentsPage.css";

// ── Types ──────────────────────────────────────────────────────────

interface TemplateRecord {
  id: string;
  domain: string | null;
  uar_json: Record<string, any> | null;
  created_at: string;
  latest_version_id: string | null;
  // joined from assessment_versions via latest_version_id
  latest_version?: {
    version_number: number | null;
    question_count: number | null;
    question_types: string | null;
  } | null;
}

type GroupingMode = "course" | "grade" | "month" | "problemType" | "flat";

interface Group {
  key: string;
  label: string;
  rows: TemplateRecord[];
}

interface MyAssessmentsPageProps {
  teacherId: string;
  onNewAssessment: () => void;
  onViewTemplate?: (templateId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────

const CHIP_LABELS: Record<string, string> = {
  multipleChoice:      "MCQ",
  shortAnswer:         "SA",
  freeResponse:        "FRQ",
  trueFalse:           "T/F",
  passageBased:        "Passage",
  arithmeticFluency:   "Fluency",
  graphInterpretation: "Graph",
  exitTicket:          "Exit",
};

const CHIP_COLORS: Record<string, string> = {
  multipleChoice:      "chip-blue",
  shortAnswer:         "chip-green",
  freeResponse:        "chip-purple",
  trueFalse:           "chip-orange",
  passageBased:        "chip-teal",
  arithmeticFluency:   "chip-red",
  graphInterpretation: "chip-indigo",
  exitTicket:          "chip-gray",
};

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function resolveField(t: TemplateRecord, field: string): string {
  return (
    (t.uar_json as any)?.[field]?.trim() || ""
  );
}

function getCourseName(t: TemplateRecord): string {
  const raw =
    t.domain?.trim() ||
    resolveField(t, "course") ||
    "Uncategorized";
  return titleCase(raw);
}

function getGradeLabel(t: TemplateRecord): string {
  const uar = (t.uar_json ?? {}) as any;
  if (Array.isArray(uar.gradeLevels) && uar.gradeLevels.length) {
    return uar.gradeLevels.map((g: any) => `Grade ${g}`).join(", ");
  }
  if (uar.grade != null) return `Grade ${uar.grade}`;
  return "Grade —";
}

function getProblemTypes(t: TemplateRecord): string[] {
  const uar = (t.uar_json ?? {}) as any;
  // prefer questionTypes from uar (set by teacher); fall back to version question_types
  if (Array.isArray(uar.questionTypes) && uar.questionTypes.length) {
    return uar.questionTypes as string[];
  }
  const vt = t.latest_version?.question_types;
  if (vt) return vt.split(",").map((s: string) => s.trim()).filter(Boolean);
  return [];
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

function groupRecords(records: TemplateRecord[], mode: GroupingMode): Group[] {
  const byNewest = (a: TemplateRecord, b: TemplateRecord) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

  if (mode === "flat") {
    return [{ key: "all", label: "All Assessments", rows: [...records].sort(byNewest) }];
  }

  if (mode === "course") {
    const map = new Map<string, TemplateRecord[]>();
    for (const r of records) {
      const k = getCourseName(r);
      (map.get(k) ?? (map.set(k, []), map.get(k)!)).push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === "Uncategorized") return 1;
        if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
      })
      .map(([k, rows]) => ({ key: k, label: k, rows: rows.sort(byNewest) }));
  }

  if (mode === "grade") {
    const map = new Map<string, TemplateRecord[]>();
    for (const r of records) {
      const k = getGradeLabel(r);
      (map.get(k) ?? (map.set(k, []), map.get(k)!)).push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, rows]) => ({ key: k, label: k, rows: rows.sort(byNewest) }));
  }

  if (mode === "month") {
    const map = new Map<string, TemplateRecord[]>();
    for (const r of records) {
      const k = monthKey(r.created_at);
      (map.get(k) ?? (map.set(k, []), map.get(k)!)).push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([k, rows]) => ({ key: k, label: monthLabel(k), rows: rows.sort(byNewest) }));
  }

  if (mode === "problemType") {
    const map = new Map<string, TemplateRecord[]>();
    for (const r of records) {
      const types = getProblemTypes(r);
      const keys = types.length ? types : ["unknown"];
      for (const t of keys) {
        (map.get(t) ?? (map.set(t, []), map.get(t)!)).push(r);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, rows]) => ({
        key: k,
        label: CHIP_LABELS[k] ?? titleCase(k),
        rows: rows.sort(byNewest),
      }));
  }

  return [];
}

// ── Sub-components ─────────────────────────────────────────────────

function ProblemTypeChip({ type }: { type: string }) {
  return (
    <span className={`ma-chip ${CHIP_COLORS[type] ?? "chip-gray"}`}>
      {CHIP_LABELS[type] ?? type}
    </span>
  );
}

function AssignmentCard({
  tmpl,
  onView,
}: {
  tmpl: TemplateRecord;
  onView?: (id: string) => void;
}) {
  const uar = (tmpl.uar_json ?? {}) as any;
  const course = getCourseName(tmpl);
  const topic = (uar.topic ?? uar.lessonName ?? uar.unitName ?? "").trim() || "—";
  const assessmentType = uar.assessmentType ?? "—";
  const grade = getGradeLabel(tmpl);
  const problemTypes = getProblemTypes(tmpl);
  const questionCount =
    tmpl.latest_version?.question_count ??
    uar.questionCount ??
    null;
  const versionNum = tmpl.latest_version?.version_number ?? null;
  const date = new Date(tmpl.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="ma-card">
      <div className="ma-card-headline">
        <span className="ma-card-course">{course}</span>
        <span className="ma-card-arrow">→</span>
        <span className="ma-card-topic">{topic}</span>
      </div>

      {problemTypes.length > 0 && (
        <div className="ma-chips">
          {problemTypes.map(t => <ProblemTypeChip key={t} type={t} />)}
        </div>
      )}

      <div className="ma-card-meta">
        <span>{assessmentType}</span>
        <span className="ma-card-meta-dot">·</span>
        <span>{grade}</span>
        {questionCount != null && (
          <>
            <span className="ma-card-meta-dot">·</span>
            <span>{questionCount} questions</span>
          </>
        )}
        {versionNum != null && (
          <>
            <span className="ma-card-meta-dot">·</span>
            <span>v{versionNum}</span>
          </>
        )}
      </div>

      <div className="ma-card-footer">
        <span className="ma-card-date">{date}</span>
        {onView && (
          <button className="ma-card-open-btn" onClick={() => onView(tmpl.id)}>
            Open
          </button>
        )}
      </div>
    </div>
  );
}

const GROUPING_OPTIONS: { id: GroupingMode; label: string }[] = [
  { id: "course",      label: "By Course" },
  { id: "grade",       label: "By Grade" },
  { id: "month",       label: "By Month" },
  { id: "problemType", label: "By Problem Type" },
  { id: "flat",        label: "Newest First" },
];

// ── Main page ──────────────────────────────────────────────────────

export function MyAssessmentsPage({ teacherId, onNewAssessment, onViewTemplate }: MyAssessmentsPageProps) {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("course");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: tmplErr } = await supabase
          .from("assessment_templates")
          .select(`
            id,
            domain,
            uar_json,
            created_at,
            latest_version_id,
            latest_version:assessment_versions!assessment_templates_latest_version_id_fkey(
              version_number,
              question_count,
              question_types
            )
          `)
          .eq("user_id", teacherId)
          .order("created_at", { ascending: false });

        if (tmplErr) throw tmplErr;
        // Supabase may return latest_version as an array or object depending on FK direction.
        // Normalise to object | null.
        const normalised = ((data ?? []) as any[]).map(row => ({
          ...row,
          latest_version: Array.isArray(row.latest_version)
            ? (row.latest_version[0] ?? null)
            : (row.latest_version ?? null),
        }));
        setTemplates(normalised as TemplateRecord[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load assessments");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teacherId, refreshTick]);

  const groups = useMemo(
    () => groupRecords(templates, groupingMode),
    [templates, groupingMode]
  );

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-welcome">
          <h1>My Assessments</h1>
          <p>All assessments you've generated.</p>
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
        <>
          {/* Toolbar */}
          <div className="ma-toolbar">
            <span className="ma-grouping-label">Group by</span>
            <select
              className="ma-grouping-select"
              value={groupingMode}
              onChange={e => {
                setGroupingMode(e.target.value as GroupingMode);
                setCollapsedGroups(new Set());
              }}
            >
              {GROUPING_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Groups */}
          {groups.map(group => {
            const isOpen = !collapsedGroups.has(group.key);
            const showHeader = groupingMode !== "flat";
            return (
              <div key={group.key} className="ma-group">
                {showHeader && (
                  <button
                    className={`ma-group-header${isOpen ? " ma-group-header--open" : ""}`}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <span className="ma-group-chevron">{isOpen ? "▾" : "▸"}</span>
                    <span>{group.label}</span>
                    <span className="ma-group-count">
                      {group.rows.length} assessment{group.rows.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                )}
                {isOpen && (
                  <div className={showHeader ? "ma-card-grid" : "ma-card-grid"} style={showHeader ? {} : { borderRadius: "8px", border: "1px solid var(--border-color, #e5e7eb)" }}>
                    {group.rows.map(tmpl => (
                      <AssignmentCard
                        key={tmpl.id}
                        tmpl={tmpl}
                        onView={onViewTemplate}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

