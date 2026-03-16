import { useMemo, useState } from "react";
import { runOrchestrator } from "../../pipeline/orchestrator";
import { DifferentiatedResultsView, type DifferentiatedWorkflowResult } from "./DifferentiatedResultsView";
import "./AssessmentIntentSelector.css";

type SourceMode = "upload" | "scratch";

const PROFILE_CHIPS: Array<{ label: string; value: string }> = [
  { label: "Standard", value: "standard" },
  { label: "Remedial", value: "remedial" },
  { label: "Honors", value: "honors" },
  { label: "AP / Advanced", value: "ap" },
  { label: "ELL", value: "ell" },
  { label: "IEP / 504", value: "iep504" },
  { label: "Challenge", value: "challenge" },
  { label: "Scaffolded", value: "scaffolded" },
  { label: "Accessible Reading", value: "accessibleReading" },
];

const TRANSFORM_STYLE_CHIPS: Array<{ label: string; value: string }> = [
  { label: "Keep structure the same", value: "keepStructure" },
  { label: "Vary structure", value: "varyStructure" },
  { label: "Add scaffolds", value: "addScaffolds" },
  { label: "Add hints", value: "addHints" },
  { label: "Simplify language", value: "simplifyLanguage" },
  { label: "Increase rigor", value: "increaseRigor" },
  { label: "Add real-world contexts", value: "addRealWorldContexts" },
];

async function readFileText(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const { analyzeDocument } = await import("../../pipeline/agents/documentAnalyzer");
    const insights = await analyzeDocument(file);
    return insights.rawText;
  }
  return file.text().catch(() => "");
}

function toggleValue(values: string[], target: string): string[] {
  return values.includes(target) ? values.filter((value) => value !== target) : [...values, target];
}

export function DifferentiatedAssessmentPanel() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [scratchTopic, setScratchTopic] = useState("");
  const [scratchCourse, setScratchCourse] = useState("general");
  const [scratchGrade, setScratchGrade] = useState("8");
  const [profiles, setProfiles] = useState<string[]>(["standard", "remedial", "honors"]);
  const [transformStyle, setTransformStyle] = useState<string[]>(["keepStructure", "addScaffolds"]);
  const [result, setResult] = useState<DifferentiatedWorkflowResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(() => {
    if (profiles.length === 0) return false;
    if (sourceMode === "upload") return Boolean(file);
    return scratchTopic.trim().length > 0;
  }, [file, profiles.length, scratchTopic, sourceMode]);

  async function run() {
    if (!canRun) return;
    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const input: Record<string, unknown> = {
        sourceMode,
        profiles,
        transformStyle,
      };

      if (sourceMode === "upload") {
        const text = await readFileText(file as File);
        input.fileName = (file as File).name;
        input.text = text;
      } else {
        input.scratch = {
          topic: scratchTopic.trim(),
          course: scratchCourse.trim() || "general",
          gradeLevels: scratchGrade
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        };
      }

      const output = await runOrchestrator({
        intent: "differentiate",
        input,
      });

      setResult(output as DifferentiatedWorkflowResult);
    } catch (e: any) {
      setError(e?.message ?? "Differentiation failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="workflow-panel">
      <h3 className="workflow-panel__title">
        <span className="workflow-panel__title-mark" aria-hidden="true" />
        Create Differentiated Versions
      </h3>
      <p className="workflow-panel__description">
        Generate multiple versions of an assessment for different learner profiles.
      </p>

      <div className="workflow-stack" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`workflow-tabs__tab${sourceMode === "upload" ? " is-active" : ""}`}
            onClick={() => setSourceMode("upload")}
          >
            Upload Assessment
          </button>
          <button
            type="button"
            className={`workflow-tabs__tab${sourceMode === "scratch" ? " is-active" : ""}`}
            onClick={() => setSourceMode("scratch")}
          >
            Build from Scratch
          </button>
        </div>

        {sourceMode === "upload" ? (
          <input
            className="workflow-input"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        ) : (
          <>
            <input
              className="workflow-input"
              type="text"
              placeholder="Course (e.g., Algebra 1)"
              value={scratchCourse}
              onChange={(event) => setScratchCourse(event.target.value)}
            />
            <input
              className="workflow-input"
              type="text"
              placeholder="Grade levels (e.g., 8 or 9,10)"
              value={scratchGrade}
              onChange={(event) => setScratchGrade(event.target.value)}
            />
            <textarea
              className="workflow-input"
              rows={4}
              placeholder="Topic or assessment brief"
              value={scratchTopic}
              onChange={(event) => setScratchTopic(event.target.value)}
            />
          </>
        )}
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary,#6b7280)", marginBottom: "0.35rem" }}>
          Choose learner profiles
        </div>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {PROFILE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`workflow-tabs__tab${profiles.includes(chip.value) ? " is-active" : ""}`}
              onClick={() => setProfiles((prev) => toggleValue(prev, chip.value))}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary,#6b7280)", marginBottom: "0.35rem" }}>
          Choose transformation style
        </div>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {TRANSFORM_STYLE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`workflow-tabs__tab${transformStyle.includes(chip.value) ? " is-active" : ""}`}
              onClick={() => setTransformStyle((prev) => toggleValue(prev, chip.value))}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="workflow-actions">
        <button className="ca-btn-primary" type="button" onClick={run} disabled={!canRun || isLoading}>
          {isLoading ? "Generating versions..." : "Generate Differentiated Versions"}
        </button>
      </div>

      {error && <p className="workflow-error">{error}</p>}

      {result && (
        <div style={{ marginTop: "0.9rem" }}>
          <DifferentiatedResultsView data={result} />
        </div>
      )}
    </section>
  );
}
