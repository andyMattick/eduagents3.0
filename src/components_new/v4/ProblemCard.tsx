import type { Problem } from "../../prism-v4/schema/domain";
import type { ProblemTagVector } from "../../prism-v4/schema/semantic";

import { ProblemVector } from "./ProblemVector";

export function ProblemCard(props: { problem: Problem; vector: ProblemTagVector }) {
  const { problem, vector } = props;
  const title = problem.partLabel
    ? `${problem.teacherLabel ?? `${problem.partLabel})`} ${problem.problemId}`
    : `Problem ${problem.problemNumber ?? problem.problemId.replace(/^p/, "")}`;
  const body = problem.partText ?? problem.cleanedText ?? problem.rawText;

  return (
    <article className="v4-problem-card">
      <div className="v4-problem-header">
        <div>
          <p className="v4-kicker">{problem.partLabel ? `Part ${problem.partLabel.toUpperCase()}` : "Problem"}</p>
          <h3>{title}</h3>
        </div>
        <span className="v4-pill">page {problem.sourcePageNumber ?? "-"}</span>
      </div>

      <p className="v4-body-copy">{body}</p>
      <ProblemVector vector={vector} />
    </article>
  );
}