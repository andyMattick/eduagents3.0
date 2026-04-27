import type { ProblemTagVector } from "../../schema/semantic";
import { pickDominantKey, scoreToDifficultyBand } from "../utils/heuristics";

function topKeys(record: Record<string, number> | undefined, limit: number): string[] {
  return Object.entries(record ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function humanizeKey(value: string): string {
  return value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function dominantBloom(tags: ProblemTagVector): string {
  return humanizeKey(pickDominantKey(tags.bloom, "understand")).toLowerCase();
}

function dominantConcepts(tags: ProblemTagVector, limit = 3): string[] {
  return topKeys(tags.concepts, limit).map(humanizeKey);
}

function dominantStandards(tags: ProblemTagVector, limit = 3): string[] {
  return topKeys(tags.standards, limit).map(humanizeKey);
}

function misconceptionLabels(tags: ProblemTagVector, limit = 3): string[] {
  return topKeys(tags.misconceptionTriggers, limit).map(humanizeKey);
}

function describeRepresentation(tags: ProblemTagVector): string {
  if (tags.representationCount > 1) {
    return "multiple representations";
  }

  return tags.representation;
}

function describeDifficulty(tags: ProblemTagVector): string {
  const band = scoreToDifficultyBand(tags.difficulty);
  const difficultyText = humanizeKey(band).toLowerCase().replace(/_/g, " ");
  const loadText = tags.linguisticLoad >= 0.6 ? "high" : tags.linguisticLoad >= 0.35 ? "moderate" : "low";
  return `${difficultyText} difficulty with ${loadText} linguistic demand`;
}

function estimatedStepCount(tags: ProblemTagVector): number {
  return Math.max(1, Math.round(tags.reasoning?.adjustedExpectedSteps ?? tags.reasoning?.expectedSteps ?? tags.steps ?? 1));
}

function buildReasoningSteps(tags: ProblemTagVector): string[] {
  const steps: string[] = [];
  const count = estimatedStepCount(tags);

  if (tags.representation === "graph") {
    steps.push("interpret graph");
  } else if (tags.representation === "table") {
    steps.push("read table");
  } else if (tags.representation === "equation") {
    steps.push("analyze equation");
  } else {
    steps.push("read prompt carefully");
  }

  if (count >= 2) {
    steps.push(`apply ${humanizeKey(tags.domain).toLowerCase()} reasoning`);
  }

  if (count >= 3) {
    steps.push(`use ${dominantBloom(tags)} thinking to justify the answer`);
  }

  while (steps.length < count) {
    steps.push("check the solution against the prompt");
  }

  return steps.slice(0, count);
}

function summarizeScaffolding(tags: ProblemTagVector): string {
  const parts: string[] = [];

  if (tags.linguisticLoad >= 0.6) {
    parts.push("simplify the wording");
  }

  if (estimatedStepCount(tags) > 3) {
    parts.push("chunk the work into smaller steps");
  }

  if (tags.representation === "graph") {
    parts.push("annotate the graph before solving");
  }

  return parts.length > 0 ? formatList(parts) : "provide a brief think-aloud before independent work";
}

function summarizeEnrichment(tags: ProblemTagVector): string {
  const concepts = dominantConcepts(tags, 2);
  const parts: string[] = [];

  if (concepts.length > 0) {
    parts.push(`connect the task to ${formatList(concepts.map((concept) => concept.toLowerCase()))}`);
  }

  if (tags.representation === "equation") {
    parts.push("translate the solution into a graph or table");
  }

  return parts.length > 0 ? formatList(parts) : "extend the reasoning into a new context";
}

export function generateNarrativeBundle(tags: ProblemTagVector) {
  const concepts = dominantConcepts(tags, 3);
  const standards = dominantStandards(tags, 3);
  const misconceptions = misconceptionLabels(tags, 3);
  const reasoningSteps = buildReasoningSteps(tags);

  return {
    whatProblemAsks:
      concepts.length > 0
        ? `Students are asked to work with ${formatList(concepts.map((concept) => concept.toLowerCase()))} through ${describeRepresentation(tags)}.`
        : `Students are asked to solve a ${humanizeKey(tags.domain).toLowerCase()} problem through ${describeRepresentation(tags)}.`,
    reasoningPath: reasoningSteps.join(" -> "),
    studentStruggles:
      misconceptions.length > 0
        ? misconceptions.map((item) => item.toLowerCase()).join(", ")
        : tags.representationCount > 1
          ? "coordinating multiple representations"
          : "sustaining the reasoning across the full prompt",
    complexity: describeDifficulty(tags),
    skillsTouched:
      concepts.length > 0
        ? concepts.join(", ")
        : humanizeKey(tags.domain),
    connections:
      concepts.length > 0
        ? concepts.join(", ")
        : humanizeKey(tags.subject),
    scaffolding: summarizeScaffolding(tags),
    enrichment: summarizeEnrichment(tags),
    standards: standards.join(", "),
    whyThisInterpretation: `This interpretation is based on ${describeRepresentation(tags)}, ${estimatedStepCount(tags)} expected step${estimatedStepCount(tags) === 1 ? "" : "s"}, and a dominant ${dominantBloom(tags)} signal.`,
  };
}