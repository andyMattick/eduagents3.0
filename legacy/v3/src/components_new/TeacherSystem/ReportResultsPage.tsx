import { useState, useMemo } from "react";
import { DossierManager } from "@/system/dossier/DossierManager";

interface ReportResultsPageProps {
  /** assessment_templates.id */
  assignmentId: string;
  /** teacher's user_id */
  userId: string;
  /** domain/subject for dossier key, e.g. "Algebra 2" */
  domain?: string;
  /** Question texts from the assessment, in order */
  problems?: string[];
  /** System's predicted completion time in minutes */
  predictedMinutes?: number | null;
  /** Human-readable title, e.g. "Algebra 2 – Quadratics" */
  title?: string;
  onClose?: () => void;
}

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.65rem",
  borderRadius: 7,
  border: "1.5px solid var(--color-border, #ddd)",
  background: "var(--bg, #fff)",
  color: "inherit",
  fontSize: "0.88rem",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  fontWeight: 600,
  fontSize: "0.88rem",
};

export function ReportResultsPage({
  assignmentId,
  userId,
  domain = "General",
  problems = [],
  predictedMinutes,
  title,
  onClose,
}: ReportResultsPageProps) {
  const questionCount = Math.max(problems.length, 1);

  // Per-problem % correct
  const [perProblem, setPerProblem] = useState<string[]>(() =>
    Array.from({ length: questionCount }, () => "")
  );

  // Overall stats
  const [classSize, setClassSize]     = useState<string>("");
  const [actualMinutes, setActualMinutes] = useState<string>("");
  const [notes, setNotes]             = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Live-compute class average from filled-in per-problem rows
  const classAverage = useMemo<number | null>(() => {
    const filled = perProblem.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
    if (filled.length === 0) return null;
    return Math.round(filled.reduce((s, v) => s + v, 0) / filled.length);
  }, [perProblem]);

  // Time delta vs predicted
  const timeDelta = useMemo<number | null>(() => {
    const a = parseFloat(actualMinutes);
    if (isNaN(a) || predictedMinutes == null) return null;
    return Math.round((a - predictedMinutes) * 10) / 10;
  }, [actualMinutes, predictedMinutes]);

  function setProblemPct(idx: number, val: string) {
    setPerProblem((prev) => prev.map((v, i) => (i === idx ? val : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate per-problem entries
    const entries: { questionNumber: number; percentCorrect: number }[] = [];
    for (let i = 0; i < questionCount; i++) {
      const raw = perProblem[i];
      if (raw === "" || raw === undefined) continue;
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0 || val > 100) {
        setError(`Q${i + 1}: enter a number between 0 and 100.`);
        return;
      }
      entries.push({ questionNumber: i + 1, percentCorrect: val });
    }

    const classSizeNum = classSize !== "" ? parseInt(classSize, 10) : undefined;
    const actualMinsNum = actualMinutes !== "" ? parseFloat(actualMinutes) : undefined;

    // Derive overall correct/incorrect from class average
    const avg = classAverage ?? 50;
    const total = classSizeNum ?? 1;
    const correct   = Math.round((avg / 100) * total);
    const incorrect = total - correct;

    const misconceptions = notes.trim()
      ? notes.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    setSaving(true);
    try {
      await DossierManager.processStudentPerformance(
        userId,
        `writer:${domain}`,
        {
          correct,
          incorrect,
          misconceptions,
          actualMinutes: actualMinsNum,
          predictedMinutes: predictedMinutes ?? undefined,
          classSize: classSizeNum,
          perProblem: entries.length > 0 ? entries : undefined,
        }
      );
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save results. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Submitted confirmation ────────────────────────────────────────────────
  if (submitted) {
    const avg = classAverage;
    const actualMins = parseFloat(actualMinutes) || null;
    return (
      <div style={{ padding: "1.5rem 2rem", maxWidth: 560 }}>
        <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Results recorded</h2>

        {/* Summary stats */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
            padding: "0.85rem 1rem",
            background: "var(--bg-secondary, #f9fafb)",
            borderRadius: 8,
            border: "1px solid var(--color-border, #e5e7eb)",
          }}
        >
          {avg !== null && (
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: avg >= 70 ? "var(--adp-success-fg, #16a34a)" : avg >= 50 ? "var(--adp-warn-fg, #d97706)" : "var(--color-error, #ef4444)" }}>
                {avg}%
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)" }}>Class average</div>
            </div>
          )}
          {actualMins !== null && (
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                {actualMins} min
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)" }}>
                Actual time
                {predictedMinutes != null && timeDelta !== null && (
                  <span style={{ marginLeft: "0.4rem", color: Math.abs(timeDelta) <= 2 ? "var(--adp-success-fg, #16a34a)" : "var(--adp-warn-fg, #d97706)" }}>
                    ({timeDelta > 0 ? "+" : ""}{timeDelta} vs predicted {predictedMinutes} min)
                  </span>
                )}
              </div>
            </div>
          )}
          {classSize !== "" && (
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{classSize}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)" }}>Students</div>
            </div>
          )}
        </div>

        <p style={{ color: "var(--text-secondary, #6b7280)", marginBottom: "1.5rem", fontSize: "0.88rem" }}>
          The system will use this data to calibrate difficulty and timing for future assessments on this topic.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            style={{ ...inputStyle, cursor: "pointer", fontWeight: 600 }}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 600 }}>
      <h2 style={{ fontWeight: 700, marginBottom: "0.25rem", fontSize: "1.05rem" }}>
        Report Classroom Results
      </h2>
      <p style={{ color: "var(--text-secondary, #6b7280)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
        {title ?? `Assessment #${assignmentId.slice(0, 8)}`} · Enter how students performed — this
        calibrates difficulty, timing, and scaffolding for the next generation.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* ── Row: class size + actual time ─────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <label style={labelStyle}>
            Class size
            <input
              type="number"
              min={1}
              value={classSize}
              onChange={(e) => setClassSize(e.target.value)}
              placeholder="e.g. 28"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Actual time taken (min)
            {predictedMinutes != null && (
              <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)" }}>
                Predicted: {predictedMinutes} min · reporting actual time calibrates future estimates
              </span>
            )}
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min={0}
                step={0.5}
                value={actualMinutes}
                onChange={(e) => setActualMinutes(e.target.value)}
                placeholder="e.g. 18"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              />
              {timeDelta !== null && (
                <span
                  style={{
                    position: "absolute",
                    right: "0.6rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: Math.abs(timeDelta) <= 2
                      ? "var(--adp-success-fg, #16a34a)"
                      : "var(--adp-warn-fg, #d97706)",
                  }}
                >
                  {timeDelta > 0 ? "+" : ""}{timeDelta}
                </span>
              )}
            </div>
          </label>
        </div>

        {/* ── Live class average banner ─────────────────────────────────── */}
        {classAverage !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.65rem 1rem",
              borderRadius: 8,
              background: classAverage >= 70
                ? "var(--adp-success-bg, #f0fdf4)"
                : classAverage >= 50
                ? "var(--adp-warn-bg, #fffbeb)"
                : "var(--adp-danger-bg, #fef2f2)",
              border: `1px solid ${
                classAverage >= 70
                  ? "var(--adp-success-bdr, #bbf7d0)"
                  : classAverage >= 50
                  ? "var(--adp-warn-bdr, #fde68a)"
                  : "var(--adp-danger-bdr, #fecaca)"
              }`,
            }}
          >
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: classAverage >= 70
                  ? "var(--adp-success-fg, #16a34a)"
                  : classAverage >= 50
                  ? "var(--adp-warn-fg, #d97706)"
                  : "var(--color-error, #ef4444)",
              }}
            >
              {classAverage}%
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary, #6b7280)" }}>
              class average across filled-in problems
            </span>
          </div>
        )}

        {/* ── Per-problem table ─────────────────────────────────────────── */}
        <div>
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, fontSize: "0.88rem" }}>
            Per-problem results
            <span style={{ fontWeight: 400, color: "var(--text-secondary, #6b7280)", marginLeft: "0.4rem" }}>
              (% of class correct — leave blank to skip)
            </span>
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr style={{ fontSize: "0.78rem", color: "var(--text-secondary, #6b7280)", borderBottom: "1.5px solid var(--color-border, #e5e7eb)" }}>
                  <th style={{ textAlign: "left", padding: "0.3rem 0.6rem", fontWeight: 600, width: "2.5rem" }}>#</th>
                  <th style={{ textAlign: "left", padding: "0.3rem 0.6rem", fontWeight: 600 }}>Question</th>
                  <th style={{ textAlign: "center", padding: "0.3rem 0.6rem", fontWeight: 600, width: "6rem" }}>% Correct</th>
                  <th style={{ textAlign: "center", padding: "0.3rem 0.6rem", fontWeight: 600, width: "4.5rem" }}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: questionCount }).map((_, i) => {
                  const pct = parseFloat(perProblem[i]);
                  const hasValue = !isNaN(pct);
                  const signal = hasValue
                    ? pct >= 80 ? { label: "✓ Easy", color: "var(--adp-success-fg, #16a34a)" }
                    : pct >= 55 ? { label: "OK", color: "var(--text-secondary, #6b7280)" }
                    : pct >= 35 ? { label: "⚠ Tricky", color: "var(--adp-warn-fg, #d97706)" }
                    : { label: "✗ Hard", color: "var(--color-error, #ef4444)" }
                    : null;

                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid var(--color-border, #f3f4f6)",
                        background: hasValue && pct < 35 ? "var(--adp-danger-row-bg, #fef2f2)" : undefined,
                      }}
                    >
                      <td style={{ padding: "0.35rem 0.6rem", color: "var(--text-secondary, #6b7280)", fontSize: "0.82rem", fontWeight: 600 }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: "0.35rem 0.6rem", fontSize: "0.82rem", maxWidth: "300px" }}>
                        <span
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            color: "var(--text, #374151)",
                          }}
                        >
                          {problems[i] ?? `Question ${i + 1}`}
                        </span>
                      </td>
                      <td style={{ padding: "0.35rem 0.6rem", textAlign: "center" }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={perProblem[i]}
                          onChange={(e) => setProblemPct(i, e.target.value)}
                          placeholder="—"
                          style={{
                            width: "64px",
                            padding: "0.3rem 0.4rem",
                            borderRadius: 6,
                            border: "1.5px solid var(--color-border, #ddd)",
                            background: "var(--bg, #fff)",
                            color: "inherit",
                            fontSize: "0.85rem",
                            textAlign: "center",
                          }}
                        />
                      </td>
                      <td style={{ padding: "0.35rem 0.6rem", textAlign: "center", fontSize: "0.78rem", fontWeight: 600, color: signal?.color }}>
                        {signal?.label ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Misconceptions / notes ───────────────────────────────────── */}
        <label style={labelStyle}>
          Observations / misconceptions{" "}
          <span style={{ fontWeight: 400, color: "var(--text-secondary, #6b7280)" }}>
            (optional, comma-separated)
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. carrying errors, sign confusion, misread instructions"
            style={inputStyle}
          />
        </label>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 8,
              border: "none",
              background: "var(--color-accent, #4f46e5)",
              color: "#fff",
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
              fontSize: "0.88rem",
            }}
          >
            {saving ? "Saving…" : "Save Results"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                ...inputStyle,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
