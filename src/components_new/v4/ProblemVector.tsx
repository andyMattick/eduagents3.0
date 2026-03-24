import type { ProblemTagVector } from "../../prism-v4/schema/semantic";

const SHOW_COGNITION_DEBUG = import.meta.env.DEV || import.meta.env.VITE_SHOW_COGNITION_DEBUG === "true";

function topEntries(record: Record<string, number> | undefined, limit: number) {
  return Object.entries(record ?? {}).sort((left, right) => right[1] - left[1]).slice(0, limit);
}

function dominantBloom(vector: ProblemTagVector) {
  return Object.entries(vector.bloom).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "remember";
}

function dominantCognitiveBloom(vector: ProblemTagVector) {
  return Object.entries(vector.cognitive.bloom).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "remember";
}

export function ProblemVector(props: { vector: ProblemTagVector }) {
  const { vector } = props;
  const concepts = topEntries(vector.concepts, 4);
  const misconceptions = topEntries(vector.misconceptionTriggers, 3);

  return (
    <div className="v4-vector-grid">
      <div className="v4-vector-card">
        <span className="v4-stat-label">Subject / domain</span>
        <strong>{vector.subject} / {vector.domain}</strong>
      </div>
      <div className="v4-vector-card">
        <span className="v4-stat-label">Bloom</span>
        <strong>{dominantBloom(vector)}</strong>
      </div>
      <div className="v4-vector-card">
        <span className="v4-stat-label">Representation</span>
        <strong>{vector.representation}</strong>
      </div>
      <div className="v4-vector-card">
        <span className="v4-stat-label">Difficulty</span>
        <strong>{vector.difficulty.toFixed(2)}</strong>
      </div>
      <div className="v4-vector-card">
        <span className="v4-stat-label">Linguistic load</span>
        <strong>{vector.linguisticLoad.toFixed(2)}</strong>
      </div>
      <div className="v4-vector-card">
        <span className="v4-stat-label">Steps</span>
        <strong>{vector.steps}</strong>
      </div>

      {SHOW_COGNITION_DEBUG && (
        <div className="v4-vector-span" data-testid="cognitive-debug">
          <span className="v4-stat-label">Cognitive profile</span>
          <strong>
            {`Bloom: ${dominantCognitiveBloom(vector)} · Difficulty: ${vector.cognitive.difficulty.toFixed(2)} · Multi-step: ${vector.cognitive.multiStep.toFixed(2)}`}
          </strong>
        </div>
      )}

      <div className="v4-vector-span">
        <span className="v4-stat-label">Concepts</span>
        <ul className="v4-inline-list">
          {concepts.map(([concept, score]) => (
            <li key={concept}>{concept} ({score.toFixed(2)})</li>
          ))}
        </ul>
      </div>

      <div className="v4-vector-span">
        <span className="v4-stat-label">Misconception triggers</span>
        <ul className="v4-inline-list">
          {misconceptions.length > 0 ? misconceptions.map(([trigger, score]) => (
            <li key={trigger}>{trigger} ({score.toFixed(2)})</li>
          )) : <li>None detected</li>}
        </ul>
      </div>
    </div>
  );
}