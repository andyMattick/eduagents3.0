import type { TaggingPipelineInput, TaggingPipelineOutput } from "../../prism-v4/schema/semantic";

function formatMetric(value: number | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

export function DocumentOverview(props: { input: TaggingPipelineInput; output: TaggingPipelineOutput }) {
  const { input, output } = props;
  const insights = output.documentInsights;
  const topConcepts = Object.entries(insights.documentConcepts ?? {}).sort((left, right) => right[1] - left[1]).slice(0, 6);
  const topStandards = Object.entries(insights.documentStandards ?? {}).sort((left, right) => right[1] - left[1]).slice(0, 4);

  return (
    <section className="v4-panel">
      <p className="v4-kicker">Document overview</p>
      <h2>{insights.title ?? input.fileName}</h2>

      <div className="v4-stat-grid">
        <div className="v4-stat-card">
          <span className="v4-stat-label">Document ID</span>
          <strong>{output.documentId}</strong>
        </div>
        <div className="v4-stat-card">
          <span className="v4-stat-label">Pages</span>
          <strong>{input.azureExtract.pages.length}</strong>
        </div>
        <div className="v4-stat-card">
          <span className="v4-stat-label">Problems</span>
          <strong>{output.problems.length}</strong>
        </div>
        <div className="v4-stat-card">
          <span className="v4-stat-label">Subject</span>
          <strong>{insights.subject ?? "Unknown"}</strong>
        </div>
        <div className="v4-stat-card">
          <span className="v4-stat-label">Difficulty</span>
          <strong>{formatMetric(insights.overallDifficulty)}</strong>
        </div>
        <div className="v4-stat-card">
          <span className="v4-stat-label">Linguistic load</span>
          <strong>{formatMetric(insights.overallLinguisticLoad)}</strong>
        </div>
      </div>

      <div className="v4-columns">
        <div>
          <h3>Semantic insights</h3>
          <ul className="v4-inline-list">
            {(insights.semantics?.concepts ?? []).map((concept) => (
              <li key={concept}>{concept}</li>
            ))}
          </ul>
          <p className="v4-body-copy">{insights.rawText.slice(0, 280)}{insights.rawText.length > 280 ? "..." : ""}</p>
        </div>

        <div>
          <h3>Top concepts</h3>
          <ul className="v4-ranked-list">
            {topConcepts.map(([concept, score]) => (
              <li key={concept}>
                <span>{concept}</span>
                <strong>{score.toFixed(2)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Standards</h3>
          <ul className="v4-ranked-list">
            {topStandards.length > 0 ? topStandards.map(([standard, score]) => (
              <li key={standard}>
                <span>{standard}</span>
                <strong>{score.toFixed(2)}</strong>
              </li>
            )) : <li><span>No standards detected</span><strong>-</strong></li>}
          </ul>
        </div>
      </div>
    </section>
  );
}