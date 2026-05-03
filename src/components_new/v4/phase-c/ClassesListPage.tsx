import { useState, useEffect } from "react";
import { listClassesApi, type PhaseCClass } from "../../../lib/phaseCApi";

interface Props {
  navigate: (path: string) => void;
}

export function ClassesListPage({ navigate }: Props) {
  const [classes, setClasses] = useState<PhaseCClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClassesApi()
      .then((res) => setClasses(res.classes))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load classes."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="phasec-shell">
      <div className="phasec-head">
        <p className="phasec-kicker">Classes</p>
        <h2>My Classes</h2>
      </div>

      <div className="phasec-card">
        {loading && <p className="phasec-copy">Loading classes…</p>}
        {error && <p className="phasec-copy" style={{ color: "var(--color-error, #c0392b)" }}>{error}</p>}
        {!loading && !error && classes.length === 0 && (
          <p className="phasec-copy">You haven't created any classes yet.</p>
        )}
        {!loading && !error && classes.length > 0 && (
          <ul className="classes-list">
            {classes.map((cls) => (
              <li key={cls.id} className="classes-list-item">
                <button
                  className="classes-list-btn"
                  onClick={() => navigate(`/classes/${cls.id}`)}
                >
                  <span className="classes-list-name">{cls.name}</span>
                  <span className="classes-list-meta">
                    {cls.level}{cls.gradeBand ? ` · ${cls.gradeBand}` : ""} · {cls.schoolYear}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="phasec-row" style={{ marginTop: "1.5rem" }}>
          <button className="phasec-button" onClick={() => navigate("/classes/new")}>
            + Create New Class
          </button>
        </div>
      </div>
    </div>
  );
}
