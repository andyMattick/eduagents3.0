import type { Problem } from "../../prism-v4/schema/domain";
import type { ProblemTagVector } from "../../prism-v4/schema/semantic";

import { ProblemCard } from "./ProblemCard";

interface ProblemGroupViewModel {
  rootProblemId: string;
  problemNumber?: number;
  stemText?: string;
  sourcePageNumber?: number;
  items: Array<{ problem: Problem; vector: ProblemTagVector }>;
}

function groupProblems(problems: Problem[], problemVectors: ProblemTagVector[]): ProblemGroupViewModel[] {
  const groups = new Map<string, ProblemGroupViewModel>();

  problems.forEach((problem, index) => {
    const rootProblemId = problem.rootProblemId ?? problem.problemId;
    const existing = groups.get(rootProblemId);
    const entry = { problem, vector: problemVectors[index] };

    if (existing) {
      existing.items.push(entry);
      if (!existing.stemText && problem.stemText) {
        existing.stemText = problem.stemText;
      }
      if (!existing.sourcePageNumber && problem.sourcePageNumber) {
        existing.sourcePageNumber = problem.sourcePageNumber;
      }
      return;
    }

    groups.set(rootProblemId, {
      rootProblemId,
      problemNumber: problem.problemNumber,
      stemText: problem.stemText,
      sourcePageNumber: problem.sourcePageNumber,
      items: [entry],
    });
  });

  return [...groups.values()];
}

export function ProblemList(props: { problems: Problem[]; problemVectors: ProblemTagVector[] }) {
  const { problems, problemVectors } = props;
  const groups = groupProblems(problems, problemVectors);
  const partCount = problems.filter((problem) => Boolean(problem.partLabel)).length;

  return (
    <section className="v4-panel">
      <div className="v4-section-heading">
        <div>
          <p className="v4-kicker">Problem list</p>
          <h2>Problem semantic vectors</h2>
        </div>
        <span className="v4-pill">{groups.length} problems / {partCount || problems.length} parts</span>
      </div>

      <div className="v4-problem-list">
        {groups.map((group) => (
          <section key={group.rootProblemId} className="v4-problem-group">
            <div className="v4-problem-group-header">
              <div>
                <p className="v4-kicker">Teacher view</p>
                <h3>{`Problem ${group.problemNumber ?? group.rootProblemId.replace(/^p/, "")}`}</h3>
              </div>
              <div className="v4-problem-group-meta">
                <span className="v4-pill">{group.rootProblemId}</span>
                <span className="v4-pill">page {group.sourcePageNumber ?? "-"}</span>
              </div>
            </div>

            {group.stemText && group.items.some(({ problem }) => Boolean(problem.partLabel)) && (
              <p className="v4-body-copy v4-problem-stem">{group.stemText}</p>
            )}

            <div className="v4-problem-group-items">
              {group.items.map(({ problem, vector }) => (
                <ProblemCard key={problem.problemId} problem={problem} vector={vector} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}