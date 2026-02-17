import "./AssignmentAnalysisComponent.css";
import { UnifiedAssessmentResponse } from "../../components/Pipeline/contracts/assessmentContracts";

interface AssignmentAnalysisProps {
  assessment: UnifiedAssessmentResponse | null;
}

export function AssignmentAnalysisComponent({ assessment }: AssignmentAnalysisProps) {
  if (!assessment) {
    return (
      <div className="assignment-analysis">
        <h2>Assessment Analysis</h2>
        <p>No assessment has been generated yet.</p>
      </div>
    );
  }

  const problemCount = assessment.problemPayload?.length ?? 0;
  const hasAnswerKey = !!assessment.answerKey;
  const hasPhilosopherExplanation = !!assessment.philosopherExplanation;

  const astronomerClusterCount =
    assessment.astronomerClusters?.clusters?.length ?? 0;

  const misconceptionClusterCount =
    assessment.misconceptionClusters?.length ?? 0;

  const rewriteMeta = assessment.rewriteMeta; // { cycles, status }
  const finalSummary = assessment.finalSummary; // { totalCycles, finalStatus, keyImprovements, remainingRisks }

  return (
    <div className="assignment-analysis">
      <h2>Assessment Analysis</h2>

      <section>
        <h3>Summary</h3>
        <p>{assessment.documentSummary?.summaryText ?? "No summary available."}</p>
      </section>

      <section>
        <h3>Problems</h3>
        <p>Total problems: {problemCount}</p>
      </section>

      <section>
        <h3>Answer Key</h3>
        <p>{hasAnswerKey ? "Answer key generated." : "No answer key present."}</p>
      </section>

      <section>
        <h3>Philosopher Explanation</h3>
        <p>
          {hasPhilosopherExplanation
            ? assessment.philosopherExplanation.teacherSummary ??
              "Explanation present, but no teacher summary text."
            : "No philosopher explanation present."}
        </p>
      </section>

      <section>
        <h3>Astronomer & Misconceptions</h3>
        <p>Astronomer clusters: {astronomerClusterCount}</p>
        <p>Misconception clusters: {misconceptionClusterCount}</p>
      </section>

      <section>
        <h3>Rewrite Meta</h3>
        {rewriteMeta ? (
          <div>
            <p>Cycles: {rewriteMeta.cycles}</p>
            <p>Status: {rewriteMeta.status}</p>
          </div>
        ) : (
          <p>No rewrite metadata available.</p>
        )}
      </section>

      <section>
        <h3>Final Summary</h3>
        {!finalSummary && <p>No final summary available.</p>}

        {finalSummary && (
          <div>
            <p>Total cycles: {finalSummary.totalCycles}</p>
            <p>Final status: {finalSummary.finalStatus}</p>

            <h4>Key Improvements</h4>
            {finalSummary.keyImprovements.length === 0 ? (
              <p>None listed.</p>
            ) : (
              <ul>
                {finalSummary.keyImprovements.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            )}

            <h4>Remaining Risks</h4>
            {finalSummary.remainingRisks.length === 0 ? (
              <p>None listed.</p>
            ) : (
              <ul>
                {finalSummary.remainingRisks.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
