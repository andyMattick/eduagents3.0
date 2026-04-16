import type {
  ConceptStat,
  PrepConceptStat,
  ConceptCoverage,
  TeacherAction,
} from "../../../prism-v4/schema/domain/ConceptMatch";

interface Props {
  testConceptStats: Record<string, ConceptStat>;
  prepConceptStats: Record<string, PrepConceptStat>;
  conceptCoverage: ConceptCoverage;
  teacherActions: TeacherAction[];
  onAddAction: (action: TeacherAction) => void;
}

function ActionSection({
  concept,
  questionNumbers,
  onAddAction,
}: {
  concept: string;
  questionNumbers: number[];
  onAddAction: (a: TeacherAction) => void;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <h3>{concept}</h3>
      <div className="cm-action-row">
        <span style={{ fontSize: "0.72rem", color: "#9c4d2b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Test:
        </span>
        <button
          className="cm-btn cm-btn--sm"
          onClick={() =>
            onAddAction({ concept, target: "test", action: "removeQuestions", questionNumbers })
          }
        >
          Remove Questions
        </button>
        <button
          className="cm-btn cm-btn--sm"
          onClick={() =>
            onAddAction({ concept, target: "test", action: "lowerDifficulty", questionNumbers })
          }
        >
          Lower Difficulty
        </button>
        <button
          className="cm-btn cm-btn--sm"
          onClick={() =>
            onAddAction({ concept, target: "test", action: "raiseDifficulty", questionNumbers })
          }
        >
          Raise Difficulty
        </button>
      </div>
      <div className="cm-action-row">
        <span style={{ fontSize: "0.72rem", color: "#9c4d2b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Prep:
        </span>
        <button
          className="cm-btn cm-btn--sm"
          onClick={() =>
            onAddAction({ concept, target: "prep", action: "addToReview" })
          }
        >
          Add to Review
        </button>
        <button
          className="cm-btn cm-btn--sm"
          onClick={() =>
            onAddAction({ concept, target: "prep", action: "raiseDifficulty" })
          }
        >
          Raise Prep Difficulty
        </button>
        <button
          className="cm-btn cm-btn--sm"
          onClick={() =>
            onAddAction({ concept, target: "prep", action: "addExample" })
          }
        >
          Add Example
        </button>
      </div>
    </div>
  );
}

export function TeacherActionPanel({
  testConceptStats,
  conceptCoverage,
  teacherActions,
  onAddAction,
}: Props) {
  const actionable = [
    ...new Set([
      ...conceptCoverage.missing,
      ...conceptCoverage.tooEasy,
      ...conceptCoverage.tooFewTimes,
    ]),
  ].sort();

  if (actionable.length === 0) {
    return (
      <div className="cm-panel">
        <p className="cm-kicker">Phase 3</p>
        <h2>Teacher Actions</h2>
        <p style={{ color: "#433228" }}>All concepts are well-covered. No actions needed.</p>
      </div>
    );
  }

  return (
    <div className="cm-panel">
      <p className="cm-kicker">Phase 3</p>
      <h2>Teacher Actions</h2>
      <p style={{ color: "#433228", marginBottom: "1rem", fontSize: "0.88rem" }}>
        {actionable.length} concept{actionable.length !== 1 ? "s" : ""} need attention.
        {teacherActions.length > 0 && (
          <> {teacherActions.length} action{teacherActions.length !== 1 ? "s" : ""} queued.</>
        )}
      </p>

      {actionable.map((concept) => (
        <ActionSection
          key={concept}
          concept={concept}
          questionNumbers={testConceptStats[concept]?.questionNumbers ?? []}
          onAddAction={onAddAction}
        />
      ))}

      {teacherActions.length > 0 && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(86,57,32,0.1)" }}>
          <h3>Queued Actions</h3>
          <ul className="cm-delta-list">
            {teacherActions.map((a, i) => (
              <li key={i}>
                <span className="cm-delta-target">{a.target}</span>
                {a.action} — {a.concept}
                {a.comment && <em> ({a.comment})</em>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
