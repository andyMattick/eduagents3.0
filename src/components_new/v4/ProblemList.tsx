import type { Problem } from "../../prism-v4/schema/domain";
import type { ProblemTagVector } from "../../prism-v4/schema/semantic";

import { ProblemCard } from "./ProblemCard";

interface ProblemGroupViewModel {
  rootProblemId: string;
  problemNumber?: number;
  stemText?: string;
  sourcePageNumber?: number;
  displayOrder: number;
  parentItem?: { problem: Problem; vector: ProblemTagVector };
  items: Array<{ problem: Problem; vector: ProblemTagVector }>;
}

function groupProblems(problems: Problem[], problemVectors: ProblemTagVector[]): ProblemGroupViewModel[] {
  const groups = new Map<string, ProblemGroupViewModel>();

  problems.forEach((problem, index) => {
    const rootProblemId = problem.rootProblemId ?? problem.problemId;
    const existing = groups.get(rootProblemId);
    const entry = { problem, vector: problemVectors[index] };
    const isRootProblem = problem.problemId === rootProblemId && !problem.partLabel;

    if (existing) {
      if (isRootProblem) {
        existing.parentItem = entry;
      } else {
        existing.items.push(entry);
      }
      if (!existing.stemText && problem.stemText) {
        existing.stemText = problem.stemText;
      }
      if (!existing.sourcePageNumber && problem.sourcePageNumber) {
        existing.sourcePageNumber = problem.sourcePageNumber;
      }
      if (problem.displayOrder !== undefined) {
        existing.displayOrder = Math.min(existing.displayOrder, problem.displayOrder);
      }
      return;
    }

    groups.set(rootProblemId, {
      rootProblemId,
      problemNumber: problem.problemNumber,
      stemText: isRootProblem ? problem.cleanedText ?? problem.stemText : problem.stemText,
      sourcePageNumber: problem.sourcePageNumber,
      displayOrder: problem.displayOrder ?? Number.MAX_SAFE_INTEGER,
      parentItem: isRootProblem ? entry : undefined,
      items: isRootProblem ? [] : [entry],
    });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => (left.problem.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.problem.displayOrder ?? Number.MAX_SAFE_INTEGER)),
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

export function ProblemList(props: { problems: Problem[]; problemVectors: ProblemTagVector[]; onRerun: () => Promise<void> }) {
  const { problems, problemVectors, onRerun } = props;
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
        {groups.map((group) => {
          const visibleItems = group.items.length > 0
            ? group.items
            : group.parentItem
              ? [group.parentItem]
              : [];

          return (
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
              {visibleItems.map(({ problem, vector }) => (
                <ProblemCard key={problem.problemId} problem={problem} vector={vector} onRerun={onRerun} />
              ))}
            </div>
          </section>
        )})}
      </div>
    </section>
  );
}