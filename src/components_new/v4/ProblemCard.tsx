import type { Problem } from "../../prism-v4/schema/domain";
import type { ProblemTagVector } from "../../prism-v4/schema/semantic";

import { ProblemVector } from "./ProblemVector";

export function ProblemCard(props: { index: number; problem: Problem; vector: ProblemTagVector }) {
  const { index, problem, vector } = props;

  return (
    <article className="v4-problem-card">
      <div className="v4-problem-header">
        <div>
          <p className="v4-kicker">Problem {index + 1}</p>
          <h3>{problem.problemId}</h3>
        </div>
        <span className="v4-pill">page {problem.sourcePageNumber ?? "-"}</span>
      </div>

      <p className="v4-body-copy">{problem.cleanedText ?? problem.rawText}</p>
      <ProblemVector vector={vector} />
    </article>
  );
}