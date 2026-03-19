import { defaultTeacherStyle } from "../schema/defaults/defaultTeacherStyle";

export function mapToDifficultyProfile(internal: any) {
  
    const insights = internal.insights ?? {};

    const azureDifficulty = insights.difficulty ?? null;
    const azureReadingLevel = insights.readingLevel ?? null;

    const items = Array.isArray(internal?.items) ? internal.items : [];

    const mappedItems = items.map((it: any) => ({
    id: it.id,
    difficulty: it.difficulty ?? 0,
    concepts: it.concepts ?? []
  }));

    const itemCurve = items.map((it: any) => it.difficulty ?? 0);

    return {
    // ✔ Preserve existing item list
    items: mappedItems,

    // 🔥 Prefer Azure difficulty if available
    difficulty_curve:
      azureDifficulty != null
        ? [azureDifficulty]
        : internal.distributions?.difficulty ?? itemCurve,

    // ✔ Preserve existing concept graph
    concept_graph: internal.conceptCoverage ?? { nodes: [], edges: [] },

    // 🔥 NEW: reading level (Azure first, fallback second)
    reading_level:
      azureReadingLevel ??
      internal.metadata?.reading_level ??
      null
  };
  //added a 3-patch bug fix
}
