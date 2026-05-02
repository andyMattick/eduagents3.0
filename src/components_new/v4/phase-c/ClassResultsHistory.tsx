import { useEffect, useState } from "react";

import { listClassResultsHistoryApi, type ClassResultHistoryItem } from "../../../lib/phaseCApi";

type Props = {
  classId: string;
};

function formatLabel(item: ClassResultHistoryItem): string {
  const date = new Date(item.timestamp).toLocaleDateString();
  return `${item.assessmentId} (${item.type}) - ${date}`;
}

export function ClassResultsHistory({ classId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClassResultHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listClassResultsHistoryApi(classId);
        if (!cancelled) {
          setData(response);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to load results history");
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

  return (
    <div className="phasec-card" style={{ marginTop: "1rem" }}>
      <h3>Past Assessments</h3>
      {loading && <p className="phasec-copy">Loading assessment history...</p>}
      {error && <p className="phasec-error">{error}</p>}
      {!loading && !error && data.length === 0 && <p className="phasec-copy">No result history yet.</p>}
      {!loading && !error && data.length > 0 && (
        <ul className="phasec-kv-list">
          {data.map((item, index) => (
            <li key={`${item.assessmentId}-${item.type}-${index}`}>
              <span className="phasec-kv-key">{formatLabel(item)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
