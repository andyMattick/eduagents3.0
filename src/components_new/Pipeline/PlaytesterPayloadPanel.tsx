/**
 * PlaytesterPayloadPanel.tsx
 *
 * Converts a generated FinalAssessment into Asteroid + Astronaut payloads,
 * lets you tune student skill sliders, then runs a lightweight local
 * simulation and displays the per-(student × problem) StudentProblemInput results.
 */

import { useState, useCallback, useEffect } from "react";
import type { FinalAssessment, FinalAssessmentItem } from "@/pipeline/agents/builder/FinalAssessment";
import type { Asteroid, Astronaut, StudentProblemInput } from "@/types/simulation";
import "./PlaytesterPayloadPanel.css";

// ── Bloom helpers ─────────────────────────────────────────────────────────────

type BloomLevel = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";

const BLOOM_WEIGHT: Record<BloomLevel, number> = {
  Remember:   0.50,
  Understand: 0.70,
  Apply:      0.90,
  Analyze:    1.10,
  Evaluate:   1.30,
  Create:     1.50,
};

const BLOOM_ORDER: BloomLevel[] = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

function bloomFromDemand(demand: string | undefined): BloomLevel {
  if (!demand) return "Understand";
  const key = demand.trim() as BloomLevel;
  return BLOOM_ORDER.includes(key) ? key : "Understand";
}

/** Simple word-count heuristic for a question prompt */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Very rough linguistic complexity: long words + unusual length pattern.
 * Returns 0.0–1.0.
 */
function linguisticComplexity(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0.2;
  const avgLen = words.reduce((s, w) => s + w.replace(/\W/g, "").length, 0) / words.length;
  const longWordRatio = words.filter((w) => w.replace(/\W/g, "").length > 8).length / words.length;
  const raw = (avgLen / 12) * 0.5 + longWordRatio * 0.5;
  return Math.min(Math.max(raw, 0.05), 0.95);
}

// ── Asteroid builder ──────────────────────────────────────────────────────────

function itemToAsteroid(item: FinalAssessmentItem, index: number, all: FinalAssessmentItem[]): Asteroid {
  const bloom = bloomFromDemand((item.metadata as any)?.cognitiveDemand);
  const text = item.prompt ?? "";
  const wc = wordCount(text);
  const lc = linguisticComplexity(text);

  // Simple similarity: word overlap with previous item
  let similarity = 0;
  if (index > 0) {
    const prev = all[index - 1].prompt ?? "";
    const setA = new Set(text.toLowerCase().split(/\s+/));
    const setB = new Set(prev.toLowerCase().split(/\s+/));
    const intersection = [...setA].filter((w) => setB.has(w)).length;
    const union = new Set([...setA, ...setB]).size;
    similarity = union > 0 ? intersection / union : 0;
  }

  const testTypeMap: Record<string, Asteroid["TestType"]> = {
    multipleChoice:    "multiple_choice",
    shortAnswer:       "short_answer",
    freeResponse:      "free_response",
    essay:             "essay",
    arithmeticFluency: "calculation",
    calculation:       "calculation",
  };

  return {
    ProblemId:           item.slotId,
    ProblemText:         text,
    ProblemLength:       wc,
    MultiPart:           item.questionType === "passageBased" && (item.questions?.length ?? 0) > 1,
    BloomLevel:          bloom,
    LinguisticComplexity: lc,
    SimilarityToPrevious: similarity,
    NoveltyScore:        1 - similarity,
    SequenceIndex:       item.questionNumber,
    TestType:            testTypeMap[item.questionType] ?? "short_answer",
    Topics:              (item.metadata as any)?.topics ?? [],
    ComplexityLevel:     Math.max(1, Math.min(5, Math.ceil(BLOOM_WEIGHT[bloom] / 0.35))) as 1|2|3|4|5,
  };
}

// ── Default Astronaut profiles ────────────────────────────────────────────────

const DEFAULT_ASTRONAUTS: Astronaut[] = [
  {
    StudentId: "astronaut-1",
    PersonaName: "Focused Learner",
    Overlays: [],
    NarrativeTags: ["focused", "methodical"],
    ProfileTraits: { ReadingLevel: 0.75, MathFluency: 0.70, AttentionSpan: 0.80, Confidence: 0.72 },
  },
  {
    StudentId: "astronaut-2",
    PersonaName: "Struggling Reader",
    Overlays: ["dyslexic"],
    NarrativeTags: ["visual-learner", "effortful"],
    ProfileTraits: { ReadingLevel: 0.40, MathFluency: 0.60, AttentionSpan: 0.55, Confidence: 0.45 },
  },
  {
    StudentId: "astronaut-3",
    PersonaName: "High Achiever",
    Overlays: [],
    NarrativeTags: ["curious", "fast-processor"],
    ProfileTraits: { ReadingLevel: 0.90, MathFluency: 0.88, AttentionSpan: 0.85, Confidence: 0.90 },
  },
];

// ── Local simulation engine ───────────────────────────────────────────────────

function simulate(
  asteroids: Asteroid[],
  astronauts: Astronaut[],
): StudentProblemInput[][] {
  return astronauts.map((student) => {
    let cumulativeFatigue = 0;

    return asteroids.map((problem, idx) => {
      const { ReadingLevel, MathFluency, AttentionSpan, Confidence } = student.ProfileTraits;
      const bloomW = BLOOM_WEIGHT[problem.BloomLevel as BloomLevel] ?? 0.8;
      const baseCapability = (ReadingLevel + MathFluency) / 2;
      const bloomDemandNorm = bloomW / 1.5;
      const gap = bloomDemandNorm - baseCapability;

      // Perceived success declines with harder Bloom + lingusitic complexity
      const perceivedSuccess = Math.min(0.95, Math.max(0.05,
        baseCapability - gap * 0.5 - (problem.LinguisticComplexity - 0.5) * 0.15,
      ));

      // Time on task (seconds): longer for complex, linguistically dense, or low-confidence students
      const timeOnTask = Math.round(
        problem.ProblemLength * (1 + problem.LinguisticComplexity + bloomW) * (2 - Confidence) * 3.5,
      );

      // Fatigue accumulates with each question
      const fatigueDelta = (1 - AttentionSpan) * 0.06 * (1 + idx * 0.03);
      cumulativeFatigue = Math.min(1, cumulativeFatigue + fatigueDelta);

      // Confusion: triggered by novelty, complexity, or Bloom level mismatch
      const confusionSignals = Math.round(
        (problem.NoveltyScore > 0.7 ? 1 : 0) +
        (problem.LinguisticComplexity > 0.6 ? 1 : 0) +
        (gap > 0.25 ? 1 : 0) +
        (cumulativeFatigue > 0.5 ? 1 : 0),
      );

      // Engagement: novelty pulls up, fatigue and confusion pull down
      const engagementScore = Math.min(0.98, Math.max(0.05,
        perceivedSuccess * 0.4 +
        problem.NoveltyScore * 0.3 +
        (1 - cumulativeFatigue) * 0.2 +
        AttentionSpan * 0.1 -
        confusionSignals * 0.05,
      ));

      const timePressureIndex = 1.0; // no time limit in preview

      const testTypeMap: Record<string, StudentProblemInput["TestType"]> = {
        multiple_choice: "multiple_choice",
        short_answer:    "short_answer",
        free_response:   "free_response",
        essay:           "essay",
        calculation:     "calculation",
      };

      return {
        StudentId:             student.StudentId,
        ProblemId:             problem.ProblemId,
        TestType:              testTypeMap[problem.TestType ?? "short_answer"] ?? "short_answer",
        ProblemLength:         problem.ProblemLength,
        MultiPart:             problem.MultiPart,
        BloomLevel:            problem.BloomLevel,
        LinguisticComplexity:  problem.LinguisticComplexity,
        SimilarityToPrevious:  problem.SimilarityToPrevious,
        NoveltyScore:          problem.NoveltyScore,
        NarrativeTags:         student.NarrativeTags,
        Overlays:              student.Overlays,
        PerceivedSuccess:      perceivedSuccess,
        TimeOnTask:            timeOnTask,
        TimePressureIndex:     timePressureIndex,
        FatigueIndex:          cumulativeFatigue,
        ConfusionSignals:      confusionSignals,
        EngagementScore:       engagementScore,
      } satisfies StudentProblemInput;
    });
  });
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function bar(value: number, color: string) {
  return (
    <span className="ptp-bar-track">
      <span
        className="ptp-bar-fill"
        style={{ width: `${Math.round(value * 100)}%`, background: color }}
      />
    </span>
  );
}



// ── Slider control ────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}
function TraitSlider({ label, value, onChange }: SliderProps) {
  return (
    <div className="ptp-slider-row">
      <span className="ptp-slider-label">{label}</span>
      <input
        type="range"
        min={0} max={1} step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ptp-slider"
      />
      <span className="ptp-slider-val">{pct(value)}</span>
    </div>
  );
}

// ── Asteroid card ─────────────────────────────────────────────────────────────

function AsteroidCard({ asteroid, idx }: { asteroid: Asteroid; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ptp-asteroid-card">
      <button className="ptp-asteroid-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="ptp-asteroid-num">#{idx + 1}</span>
        <span className="ptp-asteroid-bloom">{asteroid.BloomLevel}</span>
        <span className="ptp-asteroid-preview">{asteroid.ProblemText.slice(0, 72)}{asteroid.ProblemText.length > 72 ? "…" : ""}</span>
        <span className="ptp-asteroid-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="ptp-asteroid-body">
          <div className="ptp-asteroid-grid">
            <div><span className="ptp-kv-key">ProblemId</span><span className="ptp-kv-val">{asteroid.ProblemId}</span></div>
            <div><span className="ptp-kv-key">BloomLevel</span><span className="ptp-kv-val">{asteroid.BloomLevel}</span></div>
            <div><span className="ptp-kv-key">ProblemLength</span><span className="ptp-kv-val">{asteroid.ProblemLength} words</span></div>
            <div><span className="ptp-kv-key">MultiPart</span><span className="ptp-kv-val">{asteroid.MultiPart ? "Yes" : "No"}</span></div>
            <div><span className="ptp-kv-key">LinguisticComplexity</span><span className="ptp-kv-val">{asteroid.LinguisticComplexity.toFixed(2)}</span></div>
            <div><span className="ptp-kv-key">SimilarityToPrevious</span><span className="ptp-kv-val">{asteroid.SimilarityToPrevious.toFixed(2)}</span></div>
            <div><span className="ptp-kv-key">NoveltyScore</span><span className="ptp-kv-val">{asteroid.NoveltyScore.toFixed(2)}</span></div>
            <div><span className="ptp-kv-key">ComplexityLevel</span><span className="ptp-kv-val">{asteroid.ComplexityLevel}/5</span></div>
            <div><span className="ptp-kv-key">TestType</span><span className="ptp-kv-val">{asteroid.TestType}</span></div>
            <div><span className="ptp-kv-key">SequenceIndex</span><span className="ptp-kv-val">{asteroid.SequenceIndex}</span></div>
          </div>
          <details className="ptp-json-toggle">
            <summary>Raw JSON payload</summary>
            <pre className="ptp-json">{JSON.stringify(asteroid, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

// ── Simulation result card ────────────────────────────────────────────────────

function SimulationResultCard({
  student,
  inputs,
  asteroids,
}: {
  student: Astronaut;
  inputs: StudentProblemInput[];
  asteroids: Asteroid[];
}) {
  const [open, setOpen] = useState(true);
  const avgSuccess = inputs.reduce((s, i) => s + i.PerceivedSuccess, 0) / inputs.length;
  const totalTimeSec = inputs.reduce((s, i) => s + i.TimeOnTask, 0);
  const totalTimeMin = (totalTimeSec / 60).toFixed(1);
  const avgEngagement = inputs.reduce((s, i) => s + i.EngagementScore, 0) / inputs.length;
  const totalConfusion = inputs.reduce((s, i) => s + i.ConfusionSignals, 0);

  const successColor = avgSuccess >= 0.7 ? "#22c55e" : avgSuccess >= 0.45 ? "#f59e0b" : "#ef4444";
  const engageColor  = avgEngagement >= 0.6 ? "#3b82f6" : avgEngagement >= 0.4 ? "#f59e0b" : "#ef4444";

  return (
    <div className="ptp-sim-card">
      <button className="ptp-sim-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="ptp-sim-name">{student.PersonaName}</span>
        {student.Overlays.length > 0 && (
          <span className="ptp-overlays">
            {student.Overlays.map((o, i) => <span key={i} className="ptp-badge" style={{ background: "#6366f1" }}>{o}</span>)}
          </span>
        )}
        <span className="ptp-sim-stats">
          <span key="success" className="ptp-badge" style={{ background: successColor }}>{pct(avgSuccess)} success</span>
          <span key="engage" className="ptp-badge" style={{ background: engageColor }}>{pct(avgEngagement)} engage</span>
          <span key="time" className="ptp-badge" style={{ background: "#64748b" }}>~{totalTimeMin} min</span>
          {totalConfusion > 0 && <span key="confusion" className="ptp-badge" style={{ background: "#f59e0b" }}>{totalConfusion} confusion</span>}
        </span>
        <span className="ptp-asteroid-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="ptp-sim-body">
          {/* Summary bars */}
          <div className="ptp-sim-summary">
            <div className="ptp-sim-metric">
              <span>Avg. perceived success</span>
              {bar(avgSuccess, successColor)}
              <span>{pct(avgSuccess)}</span>
            </div>
            <div className="ptp-sim-metric">
              <span>Avg. engagement</span>
              {bar(avgEngagement, engageColor)}
              <span>{pct(avgEngagement)}</span>
            </div>
            <div className="ptp-sim-metric">
              <span>Final fatigue</span>
              {bar(inputs[inputs.length - 1]?.FatigueIndex ?? 0, "#94a3b8")}
              <span>{pct(inputs[inputs.length - 1]?.FatigueIndex ?? 0)}</span>
            </div>
          </div>

          {/* Per-problem breakdown */}
          <div className="ptp-per-problem">
            <table className="ptp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Bloom</th>
                  <th>Success</th>
                  <th>Time</th>
                  <th>Fatigue</th>
                  <th>Engage</th>
                  <th>Confusion</th>
                </tr>
              </thead>
              <tbody>
                {inputs.map((inp, i) => {
                  const ast = asteroids[i];
                  const sc = inp.PerceivedSuccess >= 0.7 ? "#22c55e" : inp.PerceivedSuccess >= 0.45 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={inp.ProblemId}>
                      <td>{ast?.SequenceIndex ?? i + 1}</td>
                      <td>{inp.BloomLevel}</td>
                      <td style={{ color: sc }}>{pct(inp.PerceivedSuccess)}</td>
                      <td>{Math.round(inp.TimeOnTask)}s</td>
                      <td>{pct(inp.FatigueIndex)}</td>
                      <td>{pct(inp.EngagementScore)}</td>
                      <td>{inp.ConfusionSignals}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <details className="ptp-json-toggle">
            <summary>Full StudentProblemInput payloads (JSON)</summary>
            <pre className="ptp-json">{JSON.stringify(inputs, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface PlaytesterPayloadPanelProps {
  assessment: FinalAssessment;
}

export function PlaytesterPayloadPanel({ assessment }: PlaytesterPayloadPanelProps) {
  const [open, setOpen] = useState(false);

  // Derive asteroids from items
  const asteroids: Asteroid[] = assessment.items.map((item, idx, all) =>
    itemToAsteroid(item, idx, all),
  );

  // Editable astronaut profiles
  const [astronauts, setAstronauts] = useState<Astronaut[]>(DEFAULT_ASTRONAUTS);

  // Simulation results
  const [results, setResults] = useState<StudentProblemInput[][] | null>(null);
  const [activeTab, setActiveTab] = useState<"asteroids" | "students" | "simulation">("asteroids");

  // Clear simulation whenever a new/revised assessment is loaded
  useEffect(() => {
    setResults(null);
    setActiveTab("asteroids");
  }, [assessment.id]);

  const runSimulation = useCallback(() => {
    const res = simulate(asteroids, astronauts);
    setResults(res);
    setActiveTab("simulation");
  }, [asteroids, astronauts]);

  function updateTrait(
    studentIdx: number,
    trait: keyof Astronaut["ProfileTraits"],
    value: number,
  ) {
    setAstronauts((prev) =>
      prev.map((a, i) =>
        i === studentIdx
          ? { ...a, ProfileTraits: { ...a.ProfileTraits, [trait]: value } }
          : a,
      ),
    );
    setResults(null); // invalidate previous results
  }

  return (
    <div className="ptp-root">
      <button className="ptp-panel-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="ptp-panel-icon">🎮</span>
        <span className="ptp-panel-label">Playtester Payload</span>
        <span className="ptp-panel-sub">{asteroids.length} asteroids · {astronauts.length} astronauts</span>
        <span className="ptp-asteroid-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="ptp-panel-body">
          {/* Tab bar */}
          <div className="ptp-tabs">
            <button
              className={`ptp-tab ${activeTab === "asteroids" ? "ptp-tab--active" : ""}`}
              onClick={() => setActiveTab("asteroids")}
            >
              Asteroids ({asteroids.length})
            </button>
            <button
              className={`ptp-tab ${activeTab === "students" ? "ptp-tab--active" : ""}`}
              onClick={() => setActiveTab("students")}
            >
              Astronauts ({astronauts.length})
            </button>
            <button
              className={`ptp-tab ${activeTab === "simulation" ? "ptp-tab--active" : ""}`}
              onClick={() => setActiveTab("simulation")}
            >
              Simulation {results ? "✓" : ""}
            </button>
            <button className="ptp-run-btn" onClick={runSimulation}>
              ▶ Run Simulation
            </button>
          </div>

          {/* ── Asteroids tab ─────────────────────────────────────────── */}
          {activeTab === "asteroids" && (
            <div className="ptp-tab-content">
              <p className="ptp-tab-desc">
                Each problem from the generated assessment, decomposed into Asteroid metadata for the simulation engine.
              </p>
              {asteroids.map((a, i) => (
                <AsteroidCard key={a.ProblemId} asteroid={a} idx={i} />
              ))}
            </div>
          )}

          {/* ── Astronauts tab ────────────────────────────────────────── */}
          {activeTab === "students" && (
            <div className="ptp-tab-content">
              <p className="ptp-tab-desc">
                Adjust each student's skill sliders. Hit <strong>Run Simulation</strong> to see the impact across all problems.
              </p>
              {astronauts.map((student, si) => (
                <div key={student.StudentId} className="ptp-astronaut-card">
                  <div className="ptp-astronaut-header">
                    <span className="ptp-sim-name">{student.PersonaName}</span>
                    {student.Overlays.length > 0 && (
                      <span className="ptp-overlays">
                        {student.Overlays.map((o, i) => <span key={i} className="ptp-badge" style={{ background: "#6366f1" }}>{o}</span>)}
                      </span>
                    )}
                    {student.NarrativeTags.map((t, i) => <span key={i} className="ptp-badge" style={{ background: "#94a3b8" }}>{t}</span>)}
                  </div>
                  <div className="ptp-sliders">
                    <TraitSlider
                      label="Reading Level"
                      value={student.ProfileTraits.ReadingLevel}
                      onChange={(v) => updateTrait(si, "ReadingLevel", v)}
                    />
                    <TraitSlider
                      label="Math Fluency"
                      value={student.ProfileTraits.MathFluency}
                      onChange={(v) => updateTrait(si, "MathFluency", v)}
                    />
                    <TraitSlider
                      label="Attention Span"
                      value={student.ProfileTraits.AttentionSpan}
                      onChange={(v) => updateTrait(si, "AttentionSpan", v)}
                    />
                    <TraitSlider
                      label="Confidence"
                      value={student.ProfileTraits.Confidence}
                      onChange={(v) => updateTrait(si, "Confidence", v)}
                    />
                  </div>
                  <details className="ptp-json-toggle" style={{ marginTop: "0.5rem" }}>
                    <summary>Astronaut JSON payload</summary>
                    <pre className="ptp-json">{JSON.stringify(student, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          )}

          {/* ── Simulation tab ────────────────────────────────────────── */}
          {activeTab === "simulation" && (
            <div className="ptp-tab-content">
              {!results ? (
                <div className="ptp-no-results">
                  <p>No simulation run yet. Click <strong>▶ Run Simulation</strong> above.</p>
                </div>
              ) : (
                <>
                  <p className="ptp-tab-desc">
                    Per-student × per-problem <code>StudentProblemInput</code> results. Each card shows how this Astronaut interacts with every Asteroid.
                  </p>
                  {astronauts.map((student, si) => (
                    <SimulationResultCard
                      key={student.StudentId}
                      student={student}
                      inputs={results[si]}
                      asteroids={asteroids}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
