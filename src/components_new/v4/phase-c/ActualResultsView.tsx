import { useEffect, useMemo, useState } from "react";

import { getClassActualResultsApi, type ClassActualResultsResponse } from "../../../lib/phaseCApi";

type Props = {
  classId: string;
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function ActualResultsView({ classId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClassActualResultsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getClassActualResultsApi(classId);
        if (!cancelled) {
          setData(response);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to load actual results");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  const itemCorrectness = useMemo(() => {
    const byItem = new Map<string, { correct: number; total: number }>();
    for (const student of data?.students ?? []) {
      for (const item of student.actual.itemResults ?? []) {
        const current = byItem.get(item.itemId) ?? { correct: 0, total: 0 };
        current.correct += item.correct ? 1 : 0;
        current.total += 1;
        byItem.set(item.itemId, current);
      }
    }

    return [...byItem.entries()]
      .map(([itemId, value]) => ({
        itemId,
        correctRate: value.total > 0 ? value.correct / value.total : 0,
      }))
      .sort((left, right) => left.correctRate - right.correctRate)
      .slice(0, 10);
  }, [data]);

  const profilePerformance = useMemo(() => {
    const buckets = new Map<string, number[]>();
    for (const student of data?.students ?? []) {
      for (const profile of student.profiles ?? []) {
        const existing = buckets.get(profile) ?? [];
        existing.push(student.actual.score);
        buckets.set(profile, existing);
      }
    }

    return [...buckets.entries()]
      .map(([profile, scores]) => ({ profile, avgScore: average(scores) }))
      .sort((left, right) => right.avgScore - left.avgScore);
  }, [data]);

  const confusionHotspots = useMemo(() => {
    const itemConfusions = new Map<string, number[]>();
    for (const student of data?.students ?? []) {
      for (const item of student.actual.itemResults ?? []) {
        const existing = itemConfusions.get(item.itemId) ?? [];
        existing.push(item.confusion ?? 0);
        itemConfusions.set(item.itemId, existing);
      }
    }

    return [...itemConfusions.entries()]
      .map(([itemId, confusions]) => ({ itemId, avgConfusion: average(confusions) }))
      .sort((left, right) => right.avgConfusion - left.avgConfusion)
      .slice(0, 10);
  }, [data]);

  if (loading) {
    return <p className="phasec-copy">Loading actual results...</p>;
  }

  if (error) {
    return <p className="phasec-error">{error}</p>;
  }

  if (!data || data.students.length === 0) {
    return <p className="phasec-copy">No actual results are available for this class yet.</p>;
  }

  const summary = data.summary ?? {
    averageScore: average(data.students.map((student) => student.actual.score)),
    averageTime: average(data.students.map((student) => student.actual.time)),
    averageConfusion: average(data.students.flatMap((student) => student.actual.itemResults.map((item) => item.confusion ?? 0))),
    averageCorrectRate: average(data.students.flatMap((student) => student.actual.itemResults.map((item) => (item.correct ? 1 : 0)))),
  };

  return (
    <div className="phasec-card" style={{ marginTop: "1rem" }}>
      <h3>Actual Results</h3>
      <p className="phasec-copy">Assessment: {data.assessmentId ?? "Latest available"}</p>

      <div className="phasec-grid-4">
        <div className="phasec-stat-card">
          <p className="phasec-stat-label">Avg score</p>
          <p className="phasec-stat-value">{summary.averageScore.toFixed(2)}</p>
        </div>
        <div className="phasec-stat-card">
          <p className="phasec-stat-label">Avg time (s)</p>
          <p className="phasec-stat-value">{summary.averageTime.toFixed(2)}</p>
        </div>
        <div className="phasec-stat-card">
          <p className="phasec-stat-label">Avg confusion</p>
          <p className="phasec-stat-value">{summary.averageConfusion.toFixed(3)}</p>
        </div>
        <div className="phasec-stat-card">
          <p className="phasec-stat-label">Correct rate</p>
          <p className="phasec-stat-value">{(summary.averageCorrectRate * 100).toFixed(1)}%</p>
        </div>
      </div>

      <hr className="phasec-divider" />

      <h4>Item-level correctness (lowest first)</h4>
      <ul className="phasec-kv-list">
        {itemCorrectness.map((item) => (
          <li key={item.itemId}>
            <span className="phasec-kv-key">{item.itemId}</span>
            <span className="phasec-kv-value">{(item.correctRate * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>

      <h4>Profile-specific performance</h4>
      <ul className="phasec-kv-list">
        {profilePerformance.map((entry) => (
          <li key={entry.profile}>
            <span className="phasec-kv-key">{entry.profile}</span>
            <span className="phasec-kv-value">{entry.avgScore.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <h4>Confusion patterns (highest first)</h4>
      <ul className="phasec-kv-list">
        {confusionHotspots.map((entry) => (
          <li key={entry.itemId}>
            <span className="phasec-kv-key">{entry.itemId}</span>
            <span className="phasec-kv-value">{entry.avgConfusion.toFixed(3)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
