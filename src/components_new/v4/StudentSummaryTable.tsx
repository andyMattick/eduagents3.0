import { useEffect, useMemo, useState } from "react";

import { getSimulationViewApi } from "../../lib/phaseCApi";

type Props = {
  simulationId: string;
  studentIds: string[];
};

type StudentSummaryRow = {
  studentId: string;
  averageConfusion: number;
  averageTime: number;
  averageBloomGap: number;
  averagePCorrect: number;
  averageTraitDelta: number;
};

type StudentItem = {
  confusionScore?: number;
  timeSeconds?: number;
  bloomGap?: number;
  pCorrect?: number;
  difficultyScore?: number;
  abilityScore?: number;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function summarizeStudent(studentId: string, items: StudentItem[]): StudentSummaryRow {
  const confusion = items.map((item) => toNumber(item.confusionScore));
  const time = items.map((item) => toNumber(item.timeSeconds));
  const bloomGap = items.map((item) => toNumber(item.bloomGap));
  const pCorrect = items.map((item) => toNumber(item.pCorrect));
  const traitDelta = items.map((item) => toNumber(item.difficultyScore) - toNumber(item.abilityScore));

  return {
    studentId,
    averageConfusion: average(confusion),
    averageTime: average(time),
    averageBloomGap: average(bloomGap),
    averagePCorrect: average(pCorrect),
    averageTraitDelta: average(traitDelta),
  };
}

export function StudentSummaryTable({ simulationId, studentIds }: Props) {
  const [rows, setRows] = useState<StudentSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!simulationId || studentIds.length === 0) {
        setRows([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const responses = await Promise.all(
          studentIds.map(async (studentId) => {
            const view = await getSimulationViewApi(simulationId, "student", { studentId });
            return {
              studentId,
              items: (view.items ?? []) as StudentItem[],
            };
          }),
        );

        if (cancelled) {
          return;
        }

        setRows(responses.map((entry) => summarizeStudent(entry.studentId, entry.items)));
      } catch (caught) {
        if (cancelled) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Failed to load student summaries");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [simulationId, studentIds]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => right.averageConfusion - left.averageConfusion);
  }, [rows]);

  if (loading) {
    return <p className="phasec-copy">Loading student summary table...</p>;
  }

  if (error) {
    return <p className="phasec-error">{error}</p>;
  }

  if (sortedRows.length === 0) {
    return <p className="phasec-copy">No student summary data available yet.</p>;
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <h4 style={{ margin: "0 0 0.5rem" }}>Class Student Summary</h4>
      <table className="phasec-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Avg confusion</th>
            <th>Avg time (s)</th>
            <th>Avg bloom gap</th>
            <th>Avg pCorrect</th>
            <th>Avg trait delta</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.studentId}>
              <td>{row.studentId}</td>
              <td>{row.averageConfusion.toFixed(3)}</td>
              <td>{row.averageTime.toFixed(2)}</td>
              <td>{row.averageBloomGap.toFixed(3)}</td>
              <td>{row.averagePCorrect.toFixed(3)}</td>
              <td>{row.averageTraitDelta.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
