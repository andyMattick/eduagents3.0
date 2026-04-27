import type { ProblemTagVector } from "../../schema/semantic";

function estimatedStepCount(tags: ProblemTagVector): number {
  return Math.max(1, Math.round(tags.reasoning?.adjustedExpectedSteps ?? tags.reasoning?.expectedSteps ?? tags.steps ?? 1));
}

function hasKeywordMatchingSignal(tags: ProblemTagVector): boolean {
  return Object.entries(tags.misconceptionTriggers).some(([key, score]) => /keyword[-_ ]?matching/i.test(key) && score >= 0.5);
}

export function analyzeCheatingVulnerabilities(tags: ProblemTagVector) {
  const issues: string[] = [];
  const analysisSignal = tags.bloom.analyze + tags.bloom.evaluate;

  if (tags.representation === "graph" && (estimatedStepCount(tags) <= 2 || analysisSignal < 0.35)) {
    issues.push("Students may guess based on graph shape without reasoning.");
  }

  if (hasKeywordMatchingSignal(tags)) {
    issues.push("Prompt may allow keyword guessing instead of understanding.");
  }

  return {
    vulnerabilitySummary: issues.join(" "),
    suggestedChanges: issues.map((issue) => `Fix: ${issue}`),
  };
}