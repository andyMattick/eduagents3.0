import type { Problem } from "../../prism-v4/schema/domain";
import type { ProblemTagVector } from "../../prism-v4/schema/semantic";

import { ProblemCard } from "./ProblemCard";

export function ProblemList(props: { problems: Problem[]; problemVectors: ProblemTagVector[] }) {
  const { problems, problemVectors } = props;

  return (
    <section className="v4-panel">
      <div className="v4-section-heading">
        <div>
          <p className="v4-kicker">Problem list</p>
          <h2>Problem semantic vectors</h2>
        </div>
        <span className="v4-pill">{problems.length} items</span>
      </div>

      <div className="v4-problem-list">
        {problems.map((problem, index) => (
          <ProblemCard key={problem.problemId} index={index} problem={problem} vector={problemVectors[index]} />
        ))}
      </div>
    </section>
  );
}