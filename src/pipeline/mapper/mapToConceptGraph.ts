export function mapToConceptGraph(internal: any) {
  return internal.conceptCoverage ?? { nodes: [], edges: [] };
}
