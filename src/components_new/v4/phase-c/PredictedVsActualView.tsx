import { useEffect, useState } from "react";

import { getClassCompareResultsApi, type ClassCompareResultsResponse } from "../../../lib/phaseCApi";

type Props = {
  classId: string;
};

export function PredictedVsActualView({ classId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClassCompareResultsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getClassCompareResultsApi(classId);
        if (!cancelled) {
          setData(response);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to load predicted-vs-actual comparison");
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

  if (loading) {
    return <p className="phasec-copy">Loading predicted-vs-actual comparison...</p>;
  }

  if (error) {
    return <p className="phasec-error">{error}</p>;
  }

  if (!data || !data.assessmentId) {
    return <p className="phasec-copy">Comparison becomes available after both predicted and actual results exist for an assessment.</p>;
  }

  return (
    <div className="phasec-card" style={{ marginTop: "1rem" }}>
      <h3>Predicted vs. Actual</h3>
      <p className="phasec-copy">Assessment: {data.assessmentId}</p>

      <div className="phasec-grid-3">
        <div className="phasec-stat-card">
          <p className="phasec-stat-label">Timing delta</p>
          <p className="phasec-stat-value">{data.timingDelta.toFixed(2)}s</p>
        </div>
        <div className="phasec-stat-card">
          <p className="phasec-stat-label">Confusion delta</p>
          <p className="phasec-stat-value">{data.confusionDelta.toFixed(3)}</p>
        </div>
        <div className="phasec-stat-card">
          <p className="phasec-stat-label">Accuracy delta</p>
          <p className="phasec-stat-value">{(data.accuracyDelta * 100).toFixed(1)}%</p>
        </div>
      </div>

      <hr className="phasec-divider" />

      <h4>Profile deltas</h4>
      <ul className="phasec-kv-list">
        {Object.entries(data.profileDeltas).map(([profile, delta]) => (
          <li key={profile}>
            <span className="phasec-kv-key">{profile}</span>
            <span className="phasec-kv-value">
              time {delta.timingDelta.toFixed(1)}s · confusion {delta.confusionDelta.toFixed(3)} · accuracy {(delta.accuracyDelta * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>

      {(data.itemDeltas ?? []).length > 0 && (
        <>
          <h4>Item-level predicted vs. actual</h4>
          <table className="phasec-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Timing delta (s)</th>
                <th>Confusion delta</th>
                <th>Accuracy delta (%)</th>
              </tr>
            </thead>
            <tbody>
              {(data.itemDeltas ?? []).slice(0, 15).map((item) => (
                <tr key={item.itemId}>
                  <td>{item.itemId}</td>
                  <td>{item.timingDelta.toFixed(2)}</td>
                  <td>{item.confusionDelta.toFixed(3)}</td>
                  <td>{(item.accuracyDelta * 100).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
