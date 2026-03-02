import { useState } from "react";
import { DossierManager } from "@/system/dossier/DossierManager";

interface ReportResultsPageProps {
  /** assessment_templates.id */
  assignmentId: string;
  /** teacher's user_id */
  userId: string;
  /** domain/subject for dossier key, e.g. "Algebra 2" */
  domain?: string;
  onClose?: () => void;
}

export function ReportResultsPage({
  assignmentId,
  userId,
  domain = "General",
  onClose,
}: ReportResultsPageProps) {
  const [correct, setCorrect]     = useState<number | "">("");
  const [incorrect, setIncorrect] = useState<number | "">("");
  const [notes, setNotes]         = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (correct === "" || incorrect === "") {
      setError("Please enter both correct and incorrect counts.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await DossierManager.processStudentPerformance(
        userId,
        `writer:${domain}`,
        {
          correct: Number(correct),
          incorrect: Number(incorrect),
          misconceptions: notes.trim()
            ? notes.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
        }
      );
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save results. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ padding: "2rem", maxWidth: 480 }}>
        <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Results recorded</h2>
        <p style={{ color: "var(--gray-500)", marginBottom: "1.5rem" }}>
          The system will adjust difficulty and scaffolding for future assessments
          on this topic.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#f5f5f5",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 480 }}>
      <h2 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
        Report Classroom Results
      </h2>
      <p
        style={{
          color: "var(--gray-500)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        Assessment #{assignmentId.slice(0, 8)}. Enter how students scored — this
        adjusts difficulty and scaffolding for the next generation on this topic.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Students who got it right
          <input
            type="number"
            min={0}
            value={correct}
            onChange={(e) =>
              setCorrect(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="e.g. 18"
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: "1rem",
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Students who struggled
          <input
            type="number"
            min={0}
            value={incorrect}
            onChange={(e) =>
              setIncorrect(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="e.g. 12"
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: "1rem",
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Specific struggles / misconceptions{" "}
          <span style={{ fontWeight: 400, color: "var(--gray-500)" }}>
            (optional, comma-separated)
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. carrying, place value, fractions"
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: "0.95rem",
            }}
          />
        </label>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
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
            }}
          >
            {saving ? "Saving…" : "Save Results"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#f5f5f5",
                cursor: "pointer",
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
