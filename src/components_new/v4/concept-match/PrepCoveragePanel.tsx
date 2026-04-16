import type {
  ConceptStat,
  PrepConceptStat,
  ConceptCoverage,
} from "../../../prism-v4/schema/domain/ConceptMatch";

function statusBadge(concept: string, coverage: ConceptCoverage) {
  if (coverage.missing.includes(concept))
    return <span className="cm-badge cm-badge--missing">Missing</span>;
  if (coverage.tooEasy.includes(concept))
    return <span className="cm-badge cm-badge--too-easy">Too Easy</span>;
  if (coverage.tooFewTimes.includes(concept))
    return <span className="cm-badge cm-badge--too-few">Too Few</span>;
  if (coverage.covered.includes(concept))
    return <span className="cm-badge cm-badge--covered">Covered</span>;
  return <span className="cm-badge">—</span>;
}

function rowClass(concept: string, coverage: ConceptCoverage) {
  if (coverage.missing.includes(concept)) return "cm-concept-row--missing";
  if (coverage.tooEasy.includes(concept)) return "cm-concept-row--too-easy";
  if (coverage.tooFewTimes.includes(concept)) return "cm-concept-row--too-few";
  return "";
}

interface Props {
  testConceptStats: Record<string, ConceptStat>;
  prepConceptStats: Record<string, PrepConceptStat>;
  conceptCoverage: ConceptCoverage;
}

export function PrepCoveragePanel({
  testConceptStats,
  prepConceptStats,
  conceptCoverage,
}: Props) {
  const concepts = Object.keys(testConceptStats).sort();

  return (
    <div className="cm-panel">
      <p className="cm-kicker">Phase 2 — Coverage</p>
      <h2>Prep vs Test Alignment</h2>

      <table className="cm-table">
        <thead>
          <tr>
            <th>Concept</th>
            <th>Test Avg Difficulty</th>
            <th>Prep Avg Difficulty</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {concepts.map((concept) => {
            const testStat = testConceptStats[concept];
            const prepStat = prepConceptStats[concept];
            return (
              <tr key={concept} className={rowClass(concept, conceptCoverage)}>
                <td>{concept}</td>
                <td>{testStat.avgDifficulty.toFixed(1)}</td>
                <td>{prepStat ? prepStat.avgDifficulty.toFixed(1) : "—"}</td>
                <td>{statusBadge(concept, conceptCoverage)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
