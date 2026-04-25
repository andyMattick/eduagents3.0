import { useEffect, useMemo, useState } from "react";

import { getClassDetailApi, listDocumentsApi, regenerateClassApi, runSimulationApi, type DocumentSummary } from "../../../lib/phaseCApi";

type Props = {
  classId: string;
  navigate: (path: string) => void;
};

type Tab = "overview" | "students" | "simulations";

export function ClassDetailPage({ classId, navigate }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [running, setRunning] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");

  const [data, setData] = useState<Awaited<ReturnType<typeof getClassDetailApi>> | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [classData, documentData] = await Promise.all([getClassDetailApi(classId), listDocumentsApi()]);
      setData(classData);
      setDocuments(documentData.documents ?? []);
      setSelectedDocumentId(documentData.documents?.[0]?.documentId ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load class");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [classId]);

  const traitAverages = useMemo(() => {
    const students = data?.students ?? [];
    if (students.length === 0) {
      return { reading: 0, math: 0, writing: 0 };
    }
    const sums = students.reduce((accumulator, student) => {
      accumulator.reading += student.traits.readingLevel;
      accumulator.math += student.traits.mathLevel;
      accumulator.writing += student.traits.writingLevel;
      return accumulator;
    }, { reading: 0, math: 0, writing: 0 });

    return {
      reading: sums.reading / students.length,
      math: sums.math / students.length,
      writing: sums.writing / students.length,
    };
  }, [data]);

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      await regenerateClassApi(classId);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleRunSimulation() {
    if (!selectedDocumentId) {
      setError("Choose a document first");
      return;
    }

    setRunning(true);
    setError(null);
    try {
      const output = await runSimulationApi({ classId, documentId: selectedDocumentId });
      setShowRunModal(false);
      navigate(`/simulations/${output.simulationId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Simulation run failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <div className="phasec-shell"><p>Loading class...</p></div>;
  }

  if (!data) {
    return <div className="phasec-shell"><p>Class not found.</p></div>;
  }

  const profileEntries = Object.entries(data.summary.profileCounts).sort((a, b) => b[1] - a[1]);
  const traitEntries = Object.entries(data.summary.positiveTraitCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="phasec-shell">
      <div className="phasec-head">
        <p className="phasec-kicker">Class</p>
        <h2>{data.class.name}</h2>
        <p className="phasec-copy">{data.class.level} · {data.class.schoolYear}</p>
      </div>

      <div className="phasec-row">
        <button className="phasec-button" onClick={() => setShowRunModal(true)}>Run Simulation on Document</button>
        <button className="phasec-button-secondary" disabled={regenerating} onClick={() => void handleRegenerate()}>
          {regenerating ? "Regenerating..." : "Regenerate students"}
        </button>
      </div>

      <div className="phasec-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
        <button className={tab === "students" ? "active" : ""} onClick={() => setTab("students")}>Students</button>
        <button className={tab === "simulations" ? "active" : ""} onClick={() => setTab("simulations")}>Simulations</button>
      </div>

      {tab === "overview" && (
        <div className="phasec-card">
          <h3>Class overview</h3>
          <p className="phasec-copy">{data.summary.studentCount} synthetic students</p>
          <div className="phasec-grid-3">
            <div className="phasec-stat-card">
              <p className="phasec-stat-label">Reading avg</p>
              <p className="phasec-stat-value">{traitAverages.reading.toFixed(2)}</p>
            </div>
            <div className="phasec-stat-card">
              <p className="phasec-stat-label">Math avg</p>
              <p className="phasec-stat-value">{traitAverages.math.toFixed(2)}</p>
            </div>
            <div className="phasec-stat-card">
              <p className="phasec-stat-label">Writing avg</p>
              <p className="phasec-stat-value">{traitAverages.writing.toFixed(2)}</p>
            </div>
          </div>
          <hr className="phasec-divider" />
          <div className="phasec-grid-2">
            <div>
              <h4>Profile breakdown</h4>
              {profileEntries.length > 0 ? (
                <ul className="phasec-kv-list">
                  {profileEntries.map(([label, count]) => (
                    <li key={label}>
                      <span className="phasec-kv-key">{label}</span>
                      <span className="phasec-kv-value">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="phasec-empty">No profile overlays were assigned in this class.</p>
              )}
            </div>
            <div>
              <h4>Positive traits</h4>
              {traitEntries.length > 0 ? (
                <ul className="phasec-kv-list">
                  {traitEntries.map(([label, count]) => (
                    <li key={label}>
                      <span className="phasec-kv-key">{label}</span>
                      <span className="phasec-kv-value">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="phasec-empty">No highlighted positive traits were assigned in this class.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "students" && (
        <div className="phasec-card">
          <table className="phasec-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Profiles</th>
                <th>Positive traits</th>
                <th>Trait summary</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.id}>
                  <td>{student.displayName}</td>
                  <td>{student.profiles.join(", ") || "-"}</td>
                  <td>{student.positiveTraits.join(", ") || "-"}</td>
                  <td>
                    Reading {student.traits.readingLevel.toFixed(1)} · Math {student.traits.mathLevel.toFixed(1)} · Writing {student.traits.writingLevel.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "simulations" && (
        <div className="phasec-card">
          <h3>Simulation runs</h3>
          {(data.simulations ?? []).length > 0 ? (
            <ul className="phasec-kv-list">
              {(data.simulations ?? []).map((run) => (
                <li key={run.id}>
                  <button className="phasec-link" onClick={() => navigate(`/simulations/${run.id}`)}>{run.id}</button>
                  <span>{new Date(run.createdAt).toLocaleString()} · document {run.documentId}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="phasec-copy">No simulation runs yet.</p>
          )}
        </div>
      )}

      {error && <p className="phasec-error">{error}</p>}

      {showRunModal && (
        <div className="phasec-modal-overlay" onClick={() => setShowRunModal(false)}>
          <div className="phasec-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Run Simulation on Document</h3>
            <label>Choose document</label>
            <select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)}>
              {documents.map((document) => (
                <option key={document.documentId} value={document.documentId}>{document.sourceFileName}</option>
              ))}
            </select>
            <div className="phasec-row">
              <button className="phasec-button-secondary" onClick={() => setShowRunModal(false)}>Cancel</button>
              <button className="phasec-button" disabled={running || !selectedDocumentId} onClick={() => void handleRunSimulation()}>
                {running ? "Running..." : "Run Simulation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
