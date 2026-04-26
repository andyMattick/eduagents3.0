import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getSimulationViewApi, type SimulationSummary } from "../../../lib/phaseCApi";

type Props = {
  simulationId: string;
};

type Tab = "class" | "profile" | "student";

type StudentItem = {
  itemId: string;
  itemLabel: string;
  confusionScore: number;
  timeSeconds: number;
  bloomGap: number;
  difficultyScore: number;
  abilityScore: number;
  pCorrect: number;
  linguisticLoad?: number;
  cognitiveLoad?: number;
  bloomLevel?: number;
  representationLoad?: number;
  symbolDensity?: number;
  vocabCounts?: {
    level1: number;
    level2: number;
    level3: number;
  };
  metadata?: {
    linguisticLoad?: number;
    cognitiveLoad?: number;
    bloomLevel?: number;
    representationLoad?: number;
    symbolDensity?: number;
    vocabCounts?: {
      level1: number;
      level2: number;
      level3: number;
    };
  };
};

type NormalizedStudentItem = StudentItem & {
  linguisticLoad?: number;
  cognitiveLoad?: number;
  bloomLevel?: number;
  representationLoad?: number;
  symbolDensity?: number;
  vocabCounts?: {
    level1: number;
    level2: number;
    level3: number;
  };
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

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizePhaseBTraits(item: StudentItem): NormalizedStudentItem {
  const metadata = item.metadata;
  return {
    ...item,
    linguisticLoad: asFiniteNumber(item.linguisticLoad) ?? asFiniteNumber(metadata?.linguisticLoad),
    cognitiveLoad: asFiniteNumber(item.cognitiveLoad) ?? asFiniteNumber(metadata?.cognitiveLoad),
    bloomLevel: asFiniteNumber(item.bloomLevel) ?? asFiniteNumber(metadata?.bloomLevel),
    representationLoad: asFiniteNumber(item.representationLoad) ?? asFiniteNumber(metadata?.representationLoad),
    symbolDensity: asFiniteNumber(item.symbolDensity) ?? asFiniteNumber(metadata?.symbolDensity),
    vocabCounts: item.vocabCounts ?? metadata?.vocabCounts,
  };
}

function hasAllPhaseBTraits(item: NormalizedStudentItem): boolean {
  return item.linguisticLoad !== undefined
    && item.cognitiveLoad !== undefined
    && item.bloomLevel !== undefined
    && item.representationLoad !== undefined;
}

function parseItemNumber(item: NormalizedStudentItem, index: number): number {
  const match = item.itemLabel.match(/(\d+)/);
  if (match?.[1]) {
    return Number(match[1]);
  }

  return index + 1;
}

function PhaseBImmeasurablesCharts({ items }: { items: NormalizedStudentItem[] }) {
  const validItems = items.filter(hasAllPhaseBTraits);

  const chartData = validItems.map((item, index) => ({
    itemId: item.itemId,
    itemLabel: item.itemLabel,
    itemNumber: parseItemNumber(item, index),
    bloomLevel: item.bloomLevel ?? 0,
    linguisticLoad: item.linguisticLoad ?? 0,
    cognitiveLoad: item.cognitiveLoad ?? 0,
    representationLoad: item.representationLoad ?? 0,
    symbolDensity: item.symbolDensity ?? 0,
    vocabLevel1: item.vocabCounts?.level1 ?? 0,
    vocabLevel2: item.vocabCounts?.level2 ?? 0,
    vocabLevel3: item.vocabCounts?.level3 ?? 0,
  }));

  const radarData = chartData.map((entry) => ({
      id: entry.itemId,
      label: `Item ${entry.itemNumber}`,
      points: [
        { trait: "Bloom", value: Math.min(1, entry.bloomLevel / 6) },
        { trait: "Linguistic", value: entry.linguisticLoad },
        { trait: "Cognitive", value: entry.cognitiveLoad },
        { trait: "Representation", value: entry.representationLoad },
      ],
    }));

  const [selectedRadarItemId, setSelectedRadarItemId] = useState(radarData[0]?.id ?? "");

  useEffect(() => {
    if (!selectedRadarItemId && radarData[0]?.id) {
      setSelectedRadarItemId(radarData[0].id);
      return;
    }

    if (selectedRadarItemId && !radarData.some((entry) => entry.id === selectedRadarItemId)) {
      setSelectedRadarItemId(radarData[0]?.id ?? "");
    }
  }, [radarData, selectedRadarItemId]);

  const selectedRadar = radarData.find((entry) => entry.id === selectedRadarItemId) ?? radarData[0];
  const hasDensityData = chartData.some((entry) => entry.symbolDensity > 0 || entry.vocabLevel1 > 0 || entry.vocabLevel2 > 0 || entry.vocabLevel3 > 0);

  if (validItems.length === 0) {
    return (
      <p className="phasec-empty">
        Phase B trait graphs are hidden because normalized traits are unavailable on student items.
      </p>
    );
  }

  function renderBar(title: string, dataKey: "bloomLevel" | "linguisticLoad" | "cognitiveLoad" | "representationLoad", color: string, maxY?: number) {
    return (
      <div style={{ marginTop: "1rem" }}>
        <h4 style={{ margin: "0 0 0.35rem" }}>{title}</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="itemNumber" label={{ value: "Item #", position: "insideBottom", offset: -4 }} />
            <YAxis domain={maxY ? [0, maxY] : [0, 1]} />
            <Tooltip formatter={(value: number) => value.toFixed(3)} />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div>
      {renderBar("A. Bloom Level per Item", "bloomLevel", "#8b5cf6", 6)}
      {renderBar("B. Linguistic Load per Item", "linguisticLoad", "#0ea5e9")}
      {renderBar("C. Cognitive Load per Item", "cognitiveLoad", "#f59e0b")}
      {renderBar("D. Representation Load per Item", "representationLoad", "#10b981")}

      <div style={{ marginTop: "1rem" }}>
        <h4 style={{ margin: "0 0 0.35rem" }}>E. Item Trait Radar</h4>
        <label>Item</label>
        <select value={selectedRadarItemId} onChange={(event) => setSelectedRadarItemId(event.target.value)}>
          {radarData.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.label}</option>
          ))}
        </select>
        {selectedRadar && (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={selectedRadar.points}>
              <PolarGrid />
              <PolarAngleAxis dataKey="trait" />
              <Tooltip formatter={(value: number) => value.toFixed(3)} />
              <Radar name={selectedRadar.label} dataKey="value" stroke="#bb5b35" fill="#bb5b35" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <h4 style={{ margin: "0 0 0.35rem" }}>F. Vocab / Symbol Density</h4>
        {hasDensityData ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="itemNumber" label={{ value: "Item #", position: "insideBottom", offset: -4 }} />
                <YAxis domain={[0, 1]} />
                <Tooltip formatter={(value: number) => value.toFixed(3)} />
                <Bar dataKey="symbolDensity" fill="#ef4444" radius={[4, 4, 0, 0]} name="Symbol density" />
              </BarChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="itemNumber" label={{ value: "Item #", position: "insideBottom", offset: -4 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="vocabLevel1" stackId="vocab" fill="#22c55e" name="Easy" />
                <Bar dataKey="vocabLevel2" stackId="vocab" fill="#facc15" name="Moderate" />
                <Bar dataKey="vocabLevel3" stackId="vocab" fill="#f97316" name="Difficult" />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="phasec-empty">No vocab/symbol density data was found in item metadata for this run.</p>
        )}
      </div>
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

  const items = useMemo(() => (studentView?.items ?? []) as StudentItem[], [studentView]);
  const normalizedItems = useMemo(() => items.map(normalizePhaseBTraits), [items]);
  const showPhaseBTraits = useMemo(() => normalizedItems.some(hasAllPhaseBTraits), [normalizedItems]);

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

          <CumulativeCurve items={normalizedItems} />

          <h3 style={{ marginTop: "1rem" }}>Phase B Traits</h3>
          {showPhaseBTraits
            ? <PhaseBImmeasurablesCharts items={normalizedItems} />
            : <p className="phasec-empty">Phase B trait graphs are currently unavailable for this student view.</p>}

          {normalizedItems.length > 0 && (
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
                {normalizedItems.map((item) => (
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
