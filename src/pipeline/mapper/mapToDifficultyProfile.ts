import { defaultTeacherStyle } from "../schema/defaults/defaultTeacherStyle";

export function mapToDifficultyProfile(internal: any) {
  const items = Array.isArray(internal?.items) ? internal.items : [];

  return {
    items: items.map((it: any) => ({
      id: it.id,
      difficulty: it.difficulty ?? 0,
      concepts: it.concepts ?? []
    })),
    difficulty_curve: internal.distributions?.difficulty ?? [],
    concept_graph: internal.conceptCoverage ?? { nodes: [], edges: [] }
  };
}
