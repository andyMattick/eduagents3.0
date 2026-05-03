import { useEffect, useMemo, useState } from "react";

import { getClassDetailApi, getSimulationViewApi, submitSimulationReviewApi, type SimulationSummary, type SyntheticStudent } from "../../../lib/phaseCApi";
import { useAuth } from "../../Auth/useAuth";

import { StudentProfileTooltip } from "./StudentProfileTooltip";
import { matchesSelectedProfile, sortStudentsByProfile } from "./studentRoster";

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

function sortStudentIds(studentIds: string[]): string[] {
  return [...studentIds].sort((left, right) => left.localeCompare(right));
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function PhaseCResultsPage({ simulationId, navigate }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("class");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSeverity, setReviewSeverity] = useState<"low" | "medium" | "high">("medium");
  const [reviewMessage, setReviewMessage] = useState("");
  const [includeSimulationJson, setIncludeSimulationJson] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState(PROFILE_OPTIONS[0]);
  const [studentId, setStudentId] = useState("");

  const [classView, setClassView] = useState<Awaited<ReturnType<typeof getSimulationViewApi>> | null>(null);
  const [profileView, setProfileView] = useState<Awaited<ReturnType<typeof getSimulationViewApi>> | null>(null);
  const [studentView, setStudentView] = useState<Awaited<ReturnType<typeof getSimulationViewApi>> | null>(null);
  const [studentOptions, setStudentOptions] = useState<string[]>([]);
  const [classStudents, setClassStudents] = useState<SyntheticStudent[]>([]);

  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const classData = await getSimulationViewApi(simulationId, "class");

        setClassView(classData);

        try {
          const classDetail = await getClassDetailApi(classData.classId);
          setClassStudents(classDetail.students);
        } catch {
          setClassStudents([]);
        }

        setStudentId("");
        setStudentView(null);
        const uniqueStudentIds = classData.availableStudentIds ?? [];
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
    if (!studentId) {
      setStudentView(null);
      return;
    }
    void (async () => {
      try {
        const data = await getSimulationViewApi(simulationId, "student", { studentId });
        setStudentView(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed loading student view");
      }
    })();
  }, [tab, studentId, simulationId]);

  const items = useMemo(() => (studentView?.items ?? []) as StudentItem[], [studentView]);
  const curveItems = useMemo(() => items.map((item) => ({ confusionScore: toNumber(item.confusionScore), timeSeconds: toNumber(item.timeSeconds) })), [items]);
  const availableStudentSet = useMemo(() => new Set(studentOptions), [studentOptions]);
  const sortedRoster = useMemo(() => {
    if (classStudents.length === 0) {
      return [];
    }

    const scopedStudents = classStudents.filter((student) => availableStudentSet.size === 0 || availableStudentSet.has(student.id));
    return sortStudentsByProfile(scopedStudents);
  }, [availableStudentSet, classStudents]);
  const filteredRoster = useMemo(() => {
    return sortedRoster.filter((student) => matchesSelectedProfile(student, profile));
  }, [profile, sortedRoster]);
  const orderedStudentIds = useMemo(() => {
    if (sortedRoster.length === 0) {
      const ids = studentOptions.length > 0 ? studentOptions : studentId ? [studentId] : [];
      return sortStudentIds(ids);
    }

    const ordered = sortedRoster.map((student) => student.id);
    const missing = sortStudentIds(studentOptions.filter((value) => !ordered.includes(value)));
    return [...ordered, ...missing];
  }, [sortedRoster, studentId, studentOptions]);
  const selectedStudent = useMemo(() => {
    return sortedRoster.find((student) => student.id === studentId) ?? null;
  }, [sortedRoster, studentId]);

  useEffect(() => {
    if (studentId && orderedStudentIds.length > 0 && !orderedStudentIds.includes(studentId)) {
      setStudentId("");
    }
  }, [orderedStudentIds, studentId]);

  async function handleSubmitReview() {
    if (!classView?.classId || !classView?.documentId || !reviewMessage.trim()) {
      setReviewError("Class, document, and a review message are required.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      await submitSimulationReviewApi({
        simulationId,
        classId: classView.classId,
        documentId: classView.documentId,
        severity: reviewSeverity,
        message: reviewMessage.trim(),
        simulationSnapshot: includeSimulationJson
          ? {
              classView,
              profileView,
              studentView,
            }
          : null,
      }, user?.id);
      setReviewSuccess("Review submitted.");
      setReviewMessage("");
      setIncludeSimulationJson(false);
      setReviewOpen(false);
    } catch (caught) {
      setReviewError(caught instanceof Error ? caught.message : "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return <div className="phasec-shell"><p>Loading simulation...</p></div>;
  }

  return (
    <div className="phasec-shell">
      <div className="phasec-head">
        <p className="phasec-kicker">Simulation</p>
        <h2>{simulationId}</h2>
        <div className="phasec-row" style={{ marginTop: "0.75rem" }}>
          <button className="phasec-button-secondary" type="button" onClick={() => {
            setReviewOpen(true);
            setReviewError(null);
            setReviewSuccess(null);
          }}>
            Report an issue with this simulation
          </button>
        </div>
        {reviewSuccess && <p className="phasec-copy" style={{ marginTop: "0.5rem" }}>{reviewSuccess}</p>}
      </div>

      <div className="phasec-tabs">
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

          <div>
            <h3>Students</h3>
            <p className="phasec-copy">Hover a student ID for profile details. Click a student to open the student view.</p>
            {filteredRoster.length > 0 ? (
              <div className="phasec-student-roster">
                {filteredRoster.map((student) => (
                  <StudentProfileTooltip key={student.id} student={student}>
                    <button
                      type="button"
                      className="phasec-student-chip"
                      onClick={() => {
                        setStudentId(student.id);
                        setTab("student");
                      }}
                    >
                      {formatStudentLabel(student.id)}
                    </button>
                  </StudentProfileTooltip>
                ))}
              </div>
            ) : (
              <p className="phasec-empty">No students match the selected profile in this simulation.</p>
            )}
          </div>
        </div>
      )}

      {tab === "student" && (
        <div className="phasec-card">
          <label>Student</label>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">Choose a Student</option>
            {orderedStudentIds.map((value) => <option key={value} value={value}>{formatStudentLabel(value)}</option>)}
          </select>
          {selectedStudent && (
            <div className="phasec-student-inline">
              <span className="phasec-stat-label">Hover for student profile details</span>
              <StudentProfileTooltip student={selectedStudent}>
                <span className="phasec-student-inline-id">{formatStudentLabel(selectedStudent.id)}</span>
              </StudentProfileTooltip>
            </div>
          )}
          {studentView && studentId && <SummaryCard summary={studentView.summary} />}

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

      {reviewOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 1200 }}>
          <div style={{ width: "min(640px, 100%)", background: "#fff", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 24px 64px rgba(15,23,42,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Report an issue with this simulation</h3>
              <button type="button" className="phasec-button-secondary" onClick={() => setReviewOpen(false)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: "0.85rem", marginTop: "1rem" }}>
              <label>
                <span style={{ display: "block", marginBottom: "0.35rem" }}>Severity</span>
                <select value={reviewSeverity} onChange={(event) => setReviewSeverity(event.target.value as "low" | "medium" | "high")} style={{ width: "100%" }}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
              <label>
                <span style={{ display: "block", marginBottom: "0.35rem" }}>What went wrong?</span>
                <textarea
                  value={reviewMessage}
                  onChange={(event) => setReviewMessage(event.target.value)}
                  rows={6}
                  style={{ width: "100%", resize: "vertical" }}
                  placeholder="Describe the bad prediction, mismatch, or behavior that needs review."
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={includeSimulationJson} onChange={(event) => setIncludeSimulationJson(event.target.checked)} />
                <span>Include simulation JSON</span>
              </label>
              {reviewError && <p className="phasec-error" style={{ margin: 0 }}>{reviewError}</p>}
              <div className="phasec-row">
                <button className="phasec-button" type="button" disabled={reviewSubmitting} onClick={() => void handleSubmitReview()}>
                  {reviewSubmitting ? "Submitting..." : "Submit review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
