import { useEffect, useMemo, useState } from "react";

import { deleteClassApi, getClassDetailApi, getSimulationUsageTodayApi, regenerateClassApi, submitClassActualResultsApi, type SimulationUsageTodayResponse } from "../../../lib/phaseCApi";
import { useAuth } from "../../Auth/useAuth";

import { StudentProfileTooltip } from "./StudentProfileTooltip";
import { ActualResultsView } from "./ActualResultsView";
import { ClassResultsHistory } from "./ClassResultsHistory";
import { ClassResultsSelector, type ResultType } from "./ClassResultsSelector";
import { PredictedVsActualView } from "./PredictedVsActualView";
import { sortStudentsByProfile } from "./studentRoster";

type Props = {
  classId: string;
  navigate: (path: string) => void;
};

type Tab = "overview" | "students" | "simulations";

function parseActualResultsCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split(",").map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      studentId: row.student_id || row.external_id,
      itemNumber: row.item_number,
      partLabel: row.part_label || null,
      correct: row.correct === "1" || row.correct?.toLowerCase?.() === "true" ? 1 : 0,
      timeSeconds: row.time_seconds ? Number(row.time_seconds) : null,
      confusion: row.confusion ? Number(row.confusion) : null,
    };
  }).filter((row) => row.studentId && row.itemNumber !== "");
}

export function ClassDetailPage({ classId, navigate }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedResultType, setSelectedResultType] = useState<ResultType>("predicted");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [simulationUsageToday, setSimulationUsageToday] = useState<SimulationUsageTodayResponse | null>(null);
  const [actualResultsAssessmentId, setActualResultsAssessmentId] = useState("");
  const [actualResultsText, setActualResultsText] = useState("");
  const [actualResultsSubmitting, setActualResultsSubmitting] = useState(false);
  const [actualResultsMessage, setActualResultsMessage] = useState<string | null>(null);
  const [actualResultsRefreshKey, setActualResultsRefreshKey] = useState(0);

  const [data, setData] = useState<Awaited<ReturnType<typeof getClassDetailApi>> | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const classData = await getClassDetailApi(classId);
      setData(classData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load class");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [classId]);

  useEffect(() => {
    if (!actualResultsAssessmentId && (data?.simulations?.[0]?.documentId ?? "").length > 0) {
      setActualResultsAssessmentId(data?.simulations?.[0]?.documentId ?? "");
    }
  }, [actualResultsAssessmentId, data?.simulations]);

  useEffect(() => {
    if (!user?.id) {
      setSimulationUsageToday(null);
      return;
    }

    void getSimulationUsageTodayApi(user.id)
      .then((payload) => setSimulationUsageToday(payload))
      .catch(() => setSimulationUsageToday(null));
  }, [user?.id]);

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

  const sortedStudents = useMemo(() => {
    return sortStudentsByProfile(data?.students ?? []);
  }, [data]);

  async function handleRegenerate() {
    if (simulationUsageToday?.remainingSimulations === 0) {
      setError("You have reached your daily simulation limit. Try again tomorrow or ask an admin to reset usage.");
      return;
    }

    setRegenerating(true);
    setError(null);
    try {
      await regenerateClassApi(classId, undefined, user?.id);
      await load();
      if (user?.id) {
        const usage = await getSimulationUsageTodayApi(user.id).catch(() => null);
        setSimulationUsageToday(usage);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDeleteClass() {
    const confirmed = window.confirm("Delete this class and all associated synthetic students and simulation results?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteClassApi(classId, user?.id);
      navigate("/classes");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Class deletion failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleActualResultsFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setActualResultsText(text);
    setActualResultsMessage(null);
  }

  async function handleSubmitActualResults() {
    if (!actualResultsAssessmentId.trim()) {
      setError("Assessment ID is required for actual results ingestion.");
      return;
    }
    const rows = parseActualResultsCsv(actualResultsText);
    if (rows.length === 0) {
      setError("Provide at least one actual-results row using the CSV contract.");
      return;
    }
    setActualResultsSubmitting(true);
    setError(null);
    setActualResultsMessage(null);
    try {
      const response = await submitClassActualResultsApi({
        classId,
        assessmentId: actualResultsAssessmentId.trim(),
        rows,
        applyCalibration: true,
      });
      setActualResultsMessage(`Ingested ${response.rowCount} rows across ${response.studentCount} students${response.calibrationApplied ? " and refreshed calibration." : "."}`);
      setActualResultsRefreshKey((value) => value + 1);
      setSelectedResultType("actual");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Actual results ingestion failed");
    } finally {
      setActualResultsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="phasec-shell"><p>Loading class...</p></div>;
  }

  if (!data) {
    return <div className="phasec-shell"><p>{error ?? "Class not found."}</p></div>;
  }

  const profileEntries = Object.entries(data.summary.profileCounts).sort((a, b) => b[1] - a[1]);
  const traitEntries = Object.entries(data.summary.positiveTraitCounts).sort((a, b) => b[1] - a[1]);
  const simulationUsagePct = simulationUsageToday && simulationUsageToday.maxSimulationsPerDay > 0
    ? Math.min(100, Math.round(simulationUsageToday.simulationsRun / simulationUsageToday.maxSimulationsPerDay * 100))
    : 0;
  const regenerateBlocked = simulationUsageToday?.remainingSimulations === 0;

  return (
    <div className="phasec-shell">
      <div className="phasec-head">
        <p className="phasec-kicker">Class</p>
        <h2>{data.class.name}</h2>
        <p className="phasec-copy">{data.class.level} · {data.class.schoolYear}</p>
      </div>

      <div className="phasec-row">
        <button className="phasec-button-secondary" disabled={regenerating || regenerateBlocked} onClick={() => void handleRegenerate()}>
          {regenerating ? "Regenerating..." : "Regenerate students"}
        </button>
        <button
          className="phasec-button-secondary"
          disabled={deleting}
          onClick={() => void handleDeleteClass()}
          style={{ background: deleting ? "#9ca3af" : "#b42318", borderColor: deleting ? "#9ca3af" : "#b42318", color: "#fff" }}
        >
          {deleting ? "Deleting..." : "Delete class"}
        </button>
      </div>

      {simulationUsageToday && (
        <div className="phasec-card" style={{ marginTop: "1rem" }}>
          <p className="phasec-copy" style={{ marginTop: 0 }}>
            Simulations run today: {simulationUsageToday.simulationsRun} / {simulationUsageToday.maxSimulationsPerDay}
          </p>
          <div style={{ width: "100%", height: "8px", borderRadius: "999px", background: "rgba(40,93,122,0.16)", overflow: "hidden" }}>
            <div style={{ width: `${simulationUsagePct}%`, height: "100%", background: simulationUsagePct >= 100 ? "#b45309" : "#285d7a" }} />
          </div>
          {regenerateBlocked && <p className="phasec-error" style={{ marginTop: "0.5rem", marginBottom: 0 }}>Daily simulation limit reached. Regeneration is disabled until tomorrow or admin reset.</p>}
        </div>
      )}

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
                <th>Student</th>
                <th>Profiles</th>
                <th>Positive traits</th>
                <th>Trait summary</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <StudentProfileTooltip student={student}>
                      <span className="phasec-student-inline-id">{student.id}</span>
                    </StudentProfileTooltip>
                    <p className="phasec-copy" style={{ marginTop: "0.25rem" }}>{student.displayName}</p>
                  </td>
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
          <h3>Class results</h3>
          <ClassResultsSelector selected={selectedResultType} onChange={setSelectedResultType} />

          <div className="phasec-card" style={{ marginTop: "1rem" }}>
            <h4>Add Real Results</h4>
            <p className="phasec-copy">Paste CSV rows or load a CSV file using: student_id, item_number, part_label, correct, time_seconds, confusion.</p>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <label>
                <span className="phasec-stat-label">Assessment ID</span>
                <input
                  value={actualResultsAssessmentId}
                  onChange={(event) => setActualResultsAssessmentId(event.target.value)}
                  placeholder="Assessment document ID"
                  style={{ width: "100%", marginTop: "0.35rem", padding: "0.55rem 0.7rem", borderRadius: "8px", border: "1px solid rgba(86,57,32,0.18)" }}
                />
              </label>
              <label>
                <span className="phasec-stat-label">CSV or manual rows</span>
                <textarea
                  value={actualResultsText}
                  onChange={(event) => setActualResultsText(event.target.value)}
                  rows={8}
                  placeholder={"student_id,item_number,part_label,correct,time_seconds,confusion\nstudent-1,1,,1,48,0.12\nstudent-1,2,a,0,75,0.44"}
                  style={{ width: "100%", marginTop: "0.35rem", padding: "0.7rem", borderRadius: "8px", border: "1px solid rgba(86,57,32,0.18)", fontFamily: "monospace" }}
                />
              </label>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <label className="phasec-button" style={{ cursor: "pointer" }}>
                  Load CSV file
                  <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(event) => void handleActualResultsFileChange(event)} />
                </label>
                <button className="phasec-button" onClick={() => void handleSubmitActualResults()} disabled={actualResultsSubmitting}>
                  {actualResultsSubmitting ? "Ingesting..." : "Ingest and calibrate"}
                </button>
              </div>
              {actualResultsMessage && <p className="phasec-copy" style={{ marginBottom: 0 }}>{actualResultsMessage}</p>}
            </div>
          </div>

          {selectedResultType === "predicted" && (
            <>
              <h4>Simulation runs (predicted)</h4>
              {(data.simulations ?? []).length > 0 ? (
                <ul className="phasec-kv-list">
                  {(data.simulations ?? []).map((run) => (
                    <li key={run.id}>
                      <button className="phasec-link" onClick={() => navigate(`/simulations/${run.id}/phase-c`)}>{run.id}</button>
                      <span>{new Date(run.createdAt).toLocaleString()} · document {run.documentId}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="phasec-copy">No simulation runs yet.</p>
              )}
            </>
          )}

          {selectedResultType === "actual" && <ActualResultsView key={`actual-${actualResultsRefreshKey}-${actualResultsAssessmentId}`} classId={classId} assessmentId={actualResultsAssessmentId || undefined} />}
          {selectedResultType === "compare" && <PredictedVsActualView key={`compare-${actualResultsRefreshKey}-${actualResultsAssessmentId}`} classId={classId} assessmentId={actualResultsAssessmentId || undefined} />}

          <ClassResultsHistory classId={classId} />
        </div>
      )}

      {error && <p className="phasec-error">{error}</p>}
    </div>
  );
}
