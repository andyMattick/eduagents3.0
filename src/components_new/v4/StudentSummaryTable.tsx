import { useEffect, useMemo, useState } from "react";

import { getSimulationViewApi, type SyntheticStudent } from "../../lib/phaseCApi";

import { computeProfileAggregates, primaryProfile, studentOverlays } from "./phase-c/profileAggregates";
import { StudentProfileTooltip } from "./phase-c/StudentProfileTooltip";
import { sortStudentsByProfile } from "./phase-c/studentRoster";

type Props = {
  simulationId: string;
  studentIds: string[];
  students?: SyntheticStudent[];
  userId?: string;
  selectedStudentId?: string;
};

type StudentSummaryRow = {
  studentId: string;
  itemCount: number;
  totalTime: number;
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

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function formatPercent(value: number): string {
  const safe = safeNumber(value);
  return `${Math.round(Math.max(0, Math.min(1, safe)) * 100)}%`;
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, safeNumber(seconds));
  if (safe >= 60) {
    return `${(safe / 60).toFixed(1)} min`;
  }
  return `${safe.toFixed(1)} s`;
}

function joinLabels(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "-";
}

function formatSeconds(seconds: number): string {
  return `${safeNumber(seconds).toFixed(1)} s`;
}

function summarizeStudent(studentId: string, items: StudentItem[]): StudentSummaryRow {
  const confusion = items.map((item) => toNumber(item.confusionScore));
  const time = items.map((item) => toNumber(item.timeSeconds));
  const bloomGap = items.map((item) => toNumber(item.bloomGap));
  const pCorrect = items.map((item) => toNumber(item.pCorrect));
  const traitDelta = items.map((item) => toNumber(item.difficultyScore) - toNumber(item.abilityScore));
  const totalTime = time.reduce((sum, value) => sum + value, 0);

  return {
    studentId,
    itemCount: items.length,
    totalTime,
    averageConfusion: average(confusion),
    averageTime: average(time),
    averageBloomGap: average(bloomGap),
    averagePCorrect: average(pCorrect),
    averageTraitDelta: average(traitDelta),
  };
}

export function StudentSummaryTable({ simulationId, studentIds, students = [], userId, selectedStudentId }: Props) {
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
            const view = await getSimulationViewApi(simulationId, "student", { studentId }, userId);
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
  }, [simulationId, studentIds, userId]);

  const studentsById = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const sortedRows = useMemo(() => {
    if (rows.length === 0) {
      return [];
    }

    const metadataOrderedIds = sortStudentsByProfile(
      students.filter((student) => rows.some((row) => row.studentId === student.id)),
    ).map((student) => student.id);

    const orderedIds = new Map(metadataOrderedIds.map((studentId, index) => [studentId, index]));
    return [...rows].sort((left, right) => {
      const leftOrder = orderedIds.get(left.studentId);
      const rightOrder = orderedIds.get(right.studentId);
      if (leftOrder !== undefined && rightOrder !== undefined) {
        return leftOrder - rightOrder;
      }
      if (leftOrder !== undefined) {
        return -1;
      }
      if (rightOrder !== undefined) {
        return 1;
      }
      return left.studentId.localeCompare(right.studentId);
    });
  }, [rows, students]);

  const summaryRange = useMemo(() => {
    if (sortedRows.length === 0) {
      return null;
    }

    const scores = sortedRows.map((row) => row.averagePCorrect);
    const times = sortedRows.map((row) => row.totalTime);

    const minScore = safeNumber(Math.min(...scores));
    const maxScore = safeNumber(Math.max(...scores));
    const minTime = safeNumber(Math.min(...times));
    const maxTime = safeNumber(Math.max(...times));

    return {
      minScore,
      maxScore,
      minTime,
      maxTime,
    };
  }, [sortedRows]);

  const selectedStudentSummary = useMemo(() => {
    if (!selectedStudentId) {
      return null;
    }
    return sortedRows.find((row) => row.studentId === selectedStudentId) ?? null;
  }, [sortedRows, selectedStudentId]);

  const profileAggregates = useMemo(() => {
    return computeProfileAggregates(sortedRows, students);
  }, [sortedRows, students]);

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
      {summaryRange && (
        <>
          <h4 style={{ margin: "0 0 0.35rem" }}>Predicted Class Range</h4>
          <p className="phasec-copy" style={{ marginTop: 0 }}>
            Predicted range of scores: {formatPercent(summaryRange.minScore)} - {formatPercent(summaryRange.maxScore)}
          </p>
          <p className="phasec-copy" style={{ marginTop: "0.2rem" }}>
            Predicted total time: {formatDuration(summaryRange.minTime)} - {formatDuration(summaryRange.maxTime)}
          </p>
        </>
      )}

      {profileAggregates.length > 0 && (
        <>
          <h4 style={{ margin: "0.9rem 0 0.5rem" }}>Profile Summary</h4>
          <div className="phasec-grid-3">
            {profileAggregates.map((aggregate) => (
              <div key={aggregate.profile} className="phasec-stat-card">
                <p className="phasec-stat-value" style={{ fontSize: "1.05rem" }}>{aggregate.profile}</p>
                <p className="phasec-copy">{aggregate.count} student{aggregate.count === 1 ? "" : "s"}</p>
                <p className="phasec-copy">Avg confusion: {aggregate.averageConfusion.toFixed(3)}</p>
                <p className="phasec-copy">Avg time: {formatSeconds(aggregate.averageTime)}</p>
                <p className="phasec-copy">Avg total time: {formatDuration(aggregate.totalTime)}</p>
                <p className="phasec-copy">Avg bloom gap: {aggregate.averageBloomGap.toFixed(3)}</p>
                <p className="phasec-copy">Avg pCorrect: {aggregate.averagePCorrect.toFixed(3)}</p>
                <p className="phasec-copy">Avg trait delta: {aggregate.averageTraitDelta.toFixed(3)}</p>
                <p className="phasec-copy" style={{ marginBottom: 0 }}>
                  Overlays: {aggregate.overlayCounts.length > 0
                    ? aggregate.overlayCounts.map((entry) => `${entry.label} (${entry.count})`).join(", ")
                    : "-"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <h4 style={{ margin: "0 0 0.5rem" }}>Class - Test Summary</h4>
      <table className="phasec-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Profiles</th>
            <th>Overlays</th>
            <th>Avg confusion</th>
            <th>Avg time (s)</th>
            <th>Total time</th>
            <th>Avg bloom gap</th>
            <th>Avg pCorrect</th>
            <th>Avg trait delta</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.studentId}>
              <td>
                {studentsById.has(row.studentId) ? (
                  <StudentProfileTooltip student={studentsById.get(row.studentId)!}>
                    <span className="phasec-student-inline-id">{studentsById.get(row.studentId)!.displayName}</span>
                  </StudentProfileTooltip>
                ) : row.studentId}
                {studentsById.has(row.studentId) && (
                  <p className="phasec-copy" style={{ marginTop: "0.25rem", fontSize: "0.78rem" }}>{row.studentId}</p>
                )}
              </td>
              <td>{studentsById.has(row.studentId) ? primaryProfile(studentsById.get(row.studentId)!) : "-"}</td>
              <td>{studentsById.has(row.studentId) ? joinLabels(studentOverlays(studentsById.get(row.studentId)!)) : "-"}</td>
              <td>{row.averageConfusion.toFixed(3)}</td>
              <td>{row.averageTime.toFixed(2)}</td>
              <td>{formatDuration(row.totalTime)}</td>
              <td>{row.averageBloomGap.toFixed(3)}</td>
              <td>{row.averagePCorrect.toFixed(3)}</td>
              <td>{row.averageTraitDelta.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedStudentSummary && (
        <>
          <h4 style={{ margin: "0.9rem 0 0.35rem" }}>Selected Student Prediction</h4>
          <p className="phasec-copy" style={{ marginTop: 0 }}>
            Predicted score: {formatPercent(selectedStudentSummary.averagePCorrect)}
          </p>
          <p className="phasec-copy" style={{ marginTop: "0.2rem" }}>
            Predicted total time: {formatDuration(selectedStudentSummary.totalTime)}
          </p>
        </>
      )}
    </div>
  );
}
