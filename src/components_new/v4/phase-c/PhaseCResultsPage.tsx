import { useEffect, useMemo, useState } from "react";

import { getSimulationViewApi, type SimulationSummary } from "../../../lib/phaseCApi";

type Props = {
  simulationId: string;
  navigate: (path: string) => void;
};

type Tab = "class" | "profile" | "student";

type StudentItem = {
  itemId: string;
  itemLabel?: string;
  confusionScore?: number;
  timeSeconds?: number;
  bloomGap?: number;
};

const PROFILE_OPTIONS = ["ELL", "SPED", "Gifted", "ADHD", "Dyslexic", "MathAnxious", "TestCalm", "fast_worker", "detail_oriented", "test_anxious"];

function SummaryCard({ summary }: { summary: SimulationSummary }) {
  return (
    <div className="phasec-grid-4">
      <div className="phasec-stat-card">
        <p className="phasec-stat-label">Records</p>
        <p className="phasec-stat-value">{summary.totalRecords}</p>
      </div>
      <div className="phasec-stat-card">
        <p className="phasec-stat-label">Avg confusion</p>
        <p className="phasec-stat-value">{summary.averageConfusionScore.toFixed(3)}</p>
      </div>
      <div className="phasec-stat-card">
        <p className="phasec-stat-label">Avg time (s)</p>
        <p className="phasec-stat-value">{summary.averageTimeSeconds.toFixed(2)}</p>
      </div>
      <div className="phasec-stat-card">
        <p className="phasec-stat-label">Avg bloom gap</p>
        <p className="phasec-stat-value">{summary.averageBloomGap.toFixed(3)}</p>
      </div>
    </div>
  );
}

type CurveItem = { x: number; cumulativeConfusion: number; cumulativeTime: number };

function buildCurve(items: Array<{ confusionScore: number; timeSeconds: number }>): CurveItem[] {
  let confusion = 0;
  let time = 0;
  return items.map((item, index) => {
    confusion += item.confusionScore;
    time += item.timeSeconds;
    return {
      x: index + 1,
      cumulativeConfusion: confusion,
      cumulativeTime: time,
    };
  });
}

function curvePath(points: Array<{ x: number; y: number }>, width: number, height: number): string {
  if (points.length === 0) {
    return "";
  }

  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = Math.max(...points.map((point) => point.y), 1);
  const pad = 8;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const scaled = points.map((point) => {
    const sx = pad + (point.x / maxX) * innerW;
    const sy = height - pad - (point.y / maxY) * innerH;
    return `${sx.toFixed(2)},${sy.toFixed(2)}`;
  });

  return `M${scaled.join(" L")}`;
}

function CumulativeCurve({ items }: { items: Array<{ confusionScore: number; timeSeconds: number }> }) {
  const points = buildCurve(items);
  const width = 640;
  const height = 180;

  const confusionPath = curvePath(points.map((point) => ({ x: point.x, y: point.cumulativeConfusion })), width, height);
  const timePath = curvePath(points.map((point) => ({ x: point.x, y: point.cumulativeTime })), width, height);

  if (points.length === 0) {
    return <p className="phasec-empty">No student item data is available for a cumulative curve yet.</p>;
  }

  return (
    <div>
      <svg className="phasec-curve" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Cumulative confusion and time curve">
        <path d={confusionPath} fill="none" stroke="#bb5b35" strokeWidth="3" strokeLinecap="round" />
        <path d={timePath} fill="none" stroke="#285d7a" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="phasec-curve-caption">Orange: cumulative confusion. Blue: cumulative time.</p>
    </div>
  );
}

function formatStudentLabel(studentId: string): string {
  const compact = studentId.slice(0, 8);
  return `Student ${compact}`;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function PhaseCResultsPage({ simulationId, navigate }: Props) {
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

  const items = useMemo(() => (studentView?.items ?? []) as StudentItem[], [studentView]);
  const curveItems = useMemo(() => items.map((item) => ({ confusionScore: toNumber(item.confusionScore), timeSeconds: toNumber(item.timeSeconds) })), [items]);

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
        <button onClick={() => navigate(`/simulations/${encodeURIComponent(simulationId)}/phase-b`)}>Phase B: Item Traits</button>
        <button className="active" onClick={() => navigate(`/simulations/${encodeURIComponent(simulationId)}/phase-c`)}>Phase C: Student Simulation</button>
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
          {profileView ? <SummaryCard summary={profileView.summary} /> : <p className="phasec-empty">Loading profile slice...</p>}
        </div>
      )}

      {tab === "student" && (
        <div className="phasec-card">
          <label>Student</label>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {(studentOptions.length > 0 ? studentOptions : [studentId]).map((value) => <option key={value} value={value}>{formatStudentLabel(value)}</option>)}
          </select>
          {studentView && <SummaryCard summary={studentView.summary} />}

          <CumulativeCurve items={curveItems} />

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
                    <td>{item.itemLabel ?? item.itemId}</td>
                    <td>{toNumber(item.confusionScore).toFixed(3)}</td>
                    <td>{toNumber(item.timeSeconds).toFixed(2)}</td>
                    <td>{toNumber(item.bloomGap).toFixed(3)}</td>
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
