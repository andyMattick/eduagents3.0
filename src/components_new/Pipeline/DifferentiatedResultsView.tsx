import { useMemo, useState } from "react";

type DifferentiatedVersion = {
  profile: string;
  label: string;
  studentLevel: string;
  notes: string;
  result: any;
};

export interface DifferentiatedWorkflowResult {
  type: "differentiate";
  sourceMode: "upload" | "scratch";
  transformStyle: string[];
  versions: DifferentiatedVersion[];
  generatedAt: string;
}

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="workflow-result-preview">{JSON.stringify(data, null, 2)}</pre>;
}

function summaryForVersion(version: DifferentiatedVersion): { items: number | null; minutes: number | null } {
  const finalAssessment = version.result?.finalAssessment;
  if (!finalAssessment) return { items: null, minutes: null };

  const items = Array.isArray(finalAssessment.items) ? finalAssessment.items.length : null;
  const estimatedSeconds = finalAssessment?.metadata?.estimatedTotalSeconds;
  const minutes = typeof estimatedSeconds === "number" ? Math.round(estimatedSeconds / 60) : null;
  return { items, minutes };
}

function profileSignals(profile: string): {
  rigor: string;
  readingLevel: string;
  pacing: string;
  accommodations: string;
} {
  switch (profile) {
    case "remedial":
      return {
        rigor: "Reduced",
        readingLevel: "Simplified",
        pacing: "More time per task",
        accommodations: "Step-by-step supports",
      };
    case "honors":
      return {
        rigor: "Elevated",
        readingLevel: "Grade-level advanced",
        pacing: "Standard pacing",
        accommodations: "Minimal scaffolds",
      };
    case "ap":
      return {
        rigor: "Advanced",
        readingLevel: "Advanced academic",
        pacing: "Dense but exam-aligned",
        accommodations: "Challenge-focused",
      };
    case "ell":
      return {
        rigor: "Maintained",
        readingLevel: "Language-accessible",
        pacing: "Additional processing time",
        accommodations: "Vocabulary and syntax supports",
      };
    case "iep504":
      return {
        rigor: "Maintained",
        readingLevel: "Accessible",
        pacing: "Extended time friendly",
        accommodations: "Chunking and supports",
      };
    case "challenge":
      return {
        rigor: "Increased",
        readingLevel: "Advanced",
        pacing: "Faster progression",
        accommodations: "Extension tasks",
      };
    case "scaffolded":
      return {
        rigor: "Moderate",
        readingLevel: "Accessible",
        pacing: "Guided progression",
        accommodations: "Hints and stems",
      };
    case "accessibleReading":
      return {
        rigor: "Maintained",
        readingLevel: "Lower lexical load",
        pacing: "Steady",
        accommodations: "Simplified syntax",
      };
    default:
      return {
        rigor: "Balanced",
        readingLevel: "Baseline",
        pacing: "Standard",
        accommodations: "Baseline supports",
      };
  }
}

function downloadBundle(data: DifferentiatedWorkflowResult): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `differentiated-versions-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function DifferentiatedResultsView({ data }: { data: DifferentiatedWorkflowResult }) {
  const [activeProfile, setActiveProfile] = useState<string>(data.versions[0]?.profile ?? "");

  const selected = useMemo(
    () => data.versions.find((v) => v.profile === activeProfile) ?? data.versions[0],
    [activeProfile, data.versions]
  );

  if (!selected) {
    return (
      <div className="workflow-result-card">
        <div className="workflow-result-head">Differentiation Complete</div>
        <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary,#6b7280)" }}>
          No versions were returned.
        </p>
      </div>
    );
  }

  return (
    <div className="workflow-tabs">
      <div className="workflow-tabs__list" style={{ flexWrap: "wrap" }}>
        {data.versions.map((version) => (
          <button
            key={version.profile}
            type="button"
            className={`workflow-tabs__tab${version.profile === selected.profile ? " is-active" : ""}`}
            onClick={() => setActiveProfile(version.profile)}
          >
            {version.label}
          </button>
        ))}
      </div>

      <div className="workflow-tabs__panel">
        <div className="workflow-result-card" style={{ marginBottom: "0.75rem" }}>
          <div className="workflow-result-head">{selected.label} Version</div>
          <div className="workflow-result-metrics">
            <div>
              <span>Student level</span>
              <strong>{selected.studentLevel}</strong>
            </div>
            <div>
              <span>Question count</span>
              <strong>{summaryForVersion(selected).items ?? "n/a"}</strong>
            </div>
            <div>
              <span>Estimated minutes</span>
              <strong>{summaryForVersion(selected).minutes ?? "n/a"}</strong>
            </div>
          </div>
          <div className="workflow-result-section">
            <h4>Transformation Notes</h4>
            <p>{selected.notes}</p>
          </div>
        </div>

        <div className="workflow-result-card" style={{ marginBottom: "0.75rem" }}>
          <div className="workflow-result-head">Cross-Version Comparison</div>
          <div style={{ marginBottom: "0.6rem" }}>
            <button type="button" className="workflow-tabs__tab" onClick={() => downloadBundle(data)}>
              Download Bundle
            </button>
          </div>
          <div className="workflow-smart-insights" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {data.versions.map((version) => {
              const summary = summaryForVersion(version);
              const signals = profileSignals(version.profile);
              return (
                <div key={version.profile} className="workflow-smart-insight">
                  <span>{version.label}</span>
                  <strong>
                    {summary.items ?? "n/a"} items - {summary.minutes ?? "n/a"} min
                  </strong>
                  <span>Rigor: {signals.rigor}</span>
                  <span>Reading: {signals.readingLevel}</span>
                  <span>Pacing: {signals.pacing}</span>
                  <span>Support: {signals.accommodations}</span>
                </div>
              );
            })}
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary,#6b7280)" }}>
            All versions are generated from the same source and profile overlays; compare tabs to inspect wording,
            rigor, pacing, and structure changes.
          </p>
        </div>

        <JsonBlock data={selected.result} />
      </div>
    </div>
  );
}
