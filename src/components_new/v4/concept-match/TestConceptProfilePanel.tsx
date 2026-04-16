import { useState } from "react";
import type { ConceptStat } from "../../../prism-v4/schema/domain/ConceptMatch";

/* ── Difficulty dots helper ── */
function DifficultyDots({ avg }: { avg: number }) {
  const filled = Math.round(avg);
  return (
    <span className="cm-diff-bar" title={`${avg.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`cm-diff-dot ${n <= filled ? "cm-diff-dot--filled" : ""}`}
        />
      ))}
    </span>
  );
}

interface Props {
  testConceptStats: Record<string, ConceptStat>;
  testDifficulty: number;
  onViewEvidence: (concept: string) => void;
}

export function TestConceptProfilePanel({ testConceptStats, testDifficulty, onViewEvidence }: Props) {
  const concepts = Object.entries(testConceptStats).sort(
    ([, a], [, b]) => b.count - a.count
  );

  const [sortKey, setSortKey] = useState<"count" | "diff">("count");
  const sorted = [...concepts].sort(([, a], [, b]) =>
    sortKey === "count" ? b.count - a.count : b.avgDifficulty - a.avgDifficulty
  );

  return (
    <div className="cm-panel">
      <p className="cm-kicker">Phase 1</p>
      <h2>Test Concept Profile</h2>

      <div className="cm-overall">
        <div>
          <div className="cm-overall-label">Overall Test Difficulty</div>
          <div className="cm-overall-value">{testDifficulty.toFixed(1)}</div>
        </div>
        <div>
          <div className="cm-overall-label">Concepts Detected</div>
          <div className="cm-overall-value">{concepts.length}</div>
        </div>
      </div>

      <div className="cm-action-row" style={{ marginBottom: "0.75rem" }}>
        <button
          className={`cm-btn cm-btn--sm ${sortKey === "count" ? "cm-btn--primary" : ""}`}
          onClick={() => setSortKey("count")}
        >
          Sort by count
        </button>
        <button
          className={`cm-btn cm-btn--sm ${sortKey === "diff" ? "cm-btn--primary" : ""}`}
          onClick={() => setSortKey("diff")}
        >
          Sort by difficulty
        </button>
      </div>

      <table className="cm-table">
        <thead>
          <tr>
            <th>Concept</th>
            <th>Times Tested</th>
            <th>Difficulty</th>
            <th>Avg</th>
            <th>Questions</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([concept, stat]) => (
            <tr key={concept}>
              <td>{concept}</td>
              <td>{stat.count}</td>
              <td><DifficultyDots avg={stat.avgDifficulty} /></td>
              <td>{stat.avgDifficulty.toFixed(1)}</td>
              <td>{stat.questionNumbers.join(", ")}</td>
              <td>
                <button
                  className="cm-btn cm-btn--sm"
                  onClick={() => onViewEvidence(concept)}
                >
                  View Evidence
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
