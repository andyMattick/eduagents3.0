import type { ProblemTagVector } from "../../schema/semantic";

function topConcepts(tags: ProblemTagVector): string[] {
  return Object.entries(tags.concepts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([key]) => key);
}

export function generateEnrichments(tags: ProblemTagVector): string[] {
  const enrichments: string[] = [];
  const concepts = topConcepts(tags);

  if (concepts.length > 0) {
    enrichments.push(`Extend the problem by connecting to: ${concepts.join(", ")}`);
  }

  if (tags.representation === "equation") {
    enrichments.push("Ask students to represent the solution using a graph or table.");
  }

  return enrichments;
}