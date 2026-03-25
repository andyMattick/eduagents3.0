import type { ProblemTagVector } from "../../schema/semantic";

function estimatedStepCount(tags: ProblemTagVector): number {
  return Math.max(1, Math.round(tags.reasoning?.adjustedExpectedSteps ?? tags.reasoning?.expectedSteps ?? tags.steps ?? 1));
}

export function generateScaffolds(tags: ProblemTagVector): string[] {
  const scaffolds: string[] = [];

  if (tags.linguisticLoad >= 0.6) {
    scaffolds.push("Rewrite the prompt in simpler language.");
  }

  if (tags.representation === "graph") {
    scaffolds.push("Highlight key points on the graph before solving.");
  }

  if (estimatedStepCount(tags) > 3) {
    scaffolds.push("Break the problem into smaller sub-steps.");
  }

  return scaffolds;
}