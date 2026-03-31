import type { Problem } from "../../schema/domain";
import { ProblemTagVector } from "../../schema/semantic/ProblemTagVector";

export interface ConceptGraph {
  nodes: { id: string; label: string; weight: number }[];
  edges: { from: string; to: string; weight: number }[];
}

export function buildConceptGraph(problemVectors: ProblemTagVector[], problems: Problem[] = []): ConceptGraph {
  const conceptCounts: Record<string, number> = {};
  const conceptScores: Record<string, number> = {};
  const multipartCounts: Record<string, number> = {};
  const cooccurrence: Record<string, Record<string, number>> = {};
  const problemGroupSizes = new Map<string, number>();

  for (const problem of problems) {
    const groupId = problem.problemGroupId ?? problem.problemId;
    problemGroupSizes.set(groupId, (problemGroupSizes.get(groupId) ?? 0) + 1);
  }

  for (const [index, v] of problemVectors.entries()) {
    const problem = problems[index];
    const isMultipart = Boolean(problem && (problemGroupSizes.get(problem.problemGroupId ?? problem.problemId) ?? 0) > 1);
    const concepts = Object.keys(v.concepts ?? {});
    for (const c of concepts) {
      conceptCounts[c] = (conceptCounts[c] ?? 0) + 1;
      conceptScores[c] = (conceptScores[c] ?? 0) + (v.concepts[c] ?? 0);
      if (isMultipart) {
        multipartCounts[c] = (multipartCounts[c] ?? 0) + 1;
      }
    }
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const a = concepts[i];
        const b = concepts[j];
        cooccurrence[a] = cooccurrence[a] || {};
        cooccurrence[b] = cooccurrence[b] || {};
        cooccurrence[a][b] = (cooccurrence[a][b] ?? 0) + 1;
        cooccurrence[b][a] = (cooccurrence[b][a] ?? 0) + 1;
      }
    }
  }

  const nodes = Object.entries(conceptCounts).map(([id, weight]) => ({
    id,
    label: id,
    weight: Number((weight + (conceptScores[id] ?? 0) * 0.75 + ((multipartCounts[id] ?? 0) / Math.max(weight, 1)) * 0.5).toFixed(4)),
  }));

  const edges: { from: string; to: string; weight: number }[] = [];
  for (const [from, targets] of Object.entries(cooccurrence)) {
    for (const [to, weight] of Object.entries(targets)) {
      if (from < to) {
        const fromScore = conceptScores[from] ?? 0;
        const toScore = conceptScores[to] ?? 0;
        const fromMultipart = (multipartCounts[from] ?? 0) / Math.max(conceptCounts[from] ?? 1, 1);
        const toMultipart = (multipartCounts[to] ?? 0) / Math.max(conceptCounts[to] ?? 1, 1);
        edges.push({
          from,
          to,
          weight: Number((weight + ((fromScore + toScore) / 2) * 0.35 + ((fromMultipart + toMultipart) / 2) * 0.3).toFixed(4)),
        });
      }
    }
  }

  return { nodes, edges };
}
