import { useEffect, useMemo, useState } from "react";

import { getSimulationViewApi, type SimulationSummary } from "../../../lib/phaseCApi";

type Props = {
  simulationId: string;
};

type Tab = "class" | "profile" | "student";

const PROFILE_OPTIONS = ["ELL", "SPED", "Gifted", "ADHD", "Dyslexic", "MathAnxious", "TestCalm", "fast_worker", "detail_oriented", "test_anxious"];

function SummaryCard({ summary }: { summary: SimulationSummary }) {
  return (
    <div className="phasec-grid-4">
      <div><strong>Records</strong><p>{summary.totalRecords}</p></div>
      <div><strong>Avg confusion</strong><p>{summary.averageConfusionScore.toFixed(3)}</p></div>
      <div><strong>Avg time (s)</strong><p>{summary.averageTimeSeconds.toFixed(2)}</p></div>
      <div><strong>Avg bloom gap</strong><p>{summary.averageBloomGap.toFixed(3)}</p></div>
    </div>
  );
}

export function SimulationResultsPage({ simulationId }: Props) {
  const [tab, setTab] = useState<Tab>("class");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState(PROFILE_OPTIONS[0]);
  const [studentId, setStudentId] = useState("student-1");

  const [classView, setClassView] = useState<Awaited<ReturnType<typeof getSimulationViewApi>> | null>(null);
  const [profileView, setProfileView] = useState<Awaited<ReturnType<typeof getSimulationViewApi>> | null>(null);
  const [studentView, setStudentView] = useState<Awaited<ReturnType<typeof getSimulationViewApi>> | null>(null);
  const [studentOptions, setStudentOptions] = useState<string[]>([]);

  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const classData = await getSimulationViewApi(simulationId, "class");

        setClassView(classData);

        const defaultStudentId = classData.availableStudentIds?.[0] ?? "";
        if (defaultStudentId) {
          setStudentId(defaultStudentId);
        }

        const studentRes = await getSimulationViewApi(simulationId, "student", defaultStudentId ? { studentId: defaultStudentId } : undefined);
        setStudentView(studentRes);
        const uniqueStudentIds = studentRes.availableStudentIds ?? classData.availableStudentIds ?? [];
        if (uniqueStudentIds.length > 0) {
          setStudentOptions(uniqueStudentIds);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to load simulation");
      } finally {
        setLoading(false);
      }
    }

    void loadInitial();
  }, [simulationId]);

  useEffect(() => {
    if (tab !== "profile") return;
    void (async () => {
      try {
        const data = await getSimulationViewApi(simulationId, "profile", { profile });
        setProfileView(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed loading profile view");
      }
    })();
  }, [tab, profile, simulationId]);

  useEffect(() => {
    if (tab !== "student") return;
    void (async () => {
      try {
        const data = await getSimulationViewApi(simulationId, "student", studentId ? { studentId } : undefined);
        setStudentView(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed loading student view");
      }
    })();
  }, [tab, studentId, simulationId]);

  const items = useMemo(() => studentView?.items ?? [], [studentView]);

  if (loading) {
    return <div className="phasec-shell"><p>Loading simulation...</p></div>;
  }

  return (
    <div className="phasec-shell">
      <div className="phasec-head">
        <p className="phasec-kicker">Simulation</p>
        <h2>{simulationId}</h2>
      </div>

      <div className="phasec-tabs">
        <button className={tab === "class" ? "active" : ""} onClick={() => setTab("class")}>Class View</button>
        <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>Profile View</button>
        <button className={tab === "student" ? "active" : ""} onClick={() => setTab("student")}>Student View</button>
      </div>

      {tab === "class" && classView && (
        <div className="phasec-card">
          <SummaryCard summary={classView.summary} />
        </div>
      )}

      {tab === "profile" && (
        <div className="phasec-card">
          <label>Profile filter</label>
          <select value={profile} onChange={(event) => setProfile(event.target.value)}>
            {PROFILE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          {profileView && <SummaryCard summary={profileView.summary} />}
        </div>
      )}

      {tab === "student" && (
        <div className="phasec-card">
          <label>Student</label>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {(studentOptions.length > 0 ? studentOptions : [studentId]).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          {studentView && <SummaryCard summary={studentView.summary} />}

          {items.length > 0 && (
            <table className="phasec-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Confusion</th>
                  <th>Time (s)</th>
                  <th>Bloom gap</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.itemId}>
                    <td>{item.itemLabel}</td>
                    <td>{item.confusionScore.toFixed(3)}</td>
                    <td>{item.timeSeconds.toFixed(2)}</td>
                    <td>{item.bloomGap.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {error && <p className="phasec-error">{error}</p>}
    </div>
  );
}
