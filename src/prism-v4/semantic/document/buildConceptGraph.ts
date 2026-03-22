import { ProblemTagVector } from "../../schema/semantic/ProblemTagVector";

export interface ConceptGraph {
  nodes: { id: string; label: string; weight: number }[];
  edges: { from: string; to: string; weight: number }[];
}

export function buildConceptGraph(problemVectors: ProblemTagVector[]): ConceptGraph {
  const conceptCounts: Record<string, number> = {};
  const cooccurrence: Record<string, Record<string, number>> = {};

  for (const v of problemVectors) {
    const concepts = Object.keys(v.concepts ?? {});
    for (const c of concepts) {
      conceptCounts[c] = (conceptCounts[c] ?? 0) + 1;
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
    weight
  }));

  const edges: { from: string; to: string; weight: number }[] = [];
  for (const [from, targets] of Object.entries(cooccurrence)) {
    for (const [to, weight] of Object.entries(targets)) {
      if (from < to) {
        edges.push({ from, to, weight });
      }
    }
  }

  return { nodes, edges };
}
