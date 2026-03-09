export function mapToDifficultyProfile(internal: any) {
  return {
    items: internal.items.map((it: any) => ({
      id: it.id,
      difficulty: it.difficulty ?? 0,
      concepts: it.concepts ?? []
    })),
    difficulty_curve: internal.distributions?.difficulty ?? [],
    concept_graph: internal.conceptCoverage ?? { nodes: [], edges: [] }
  };
}
