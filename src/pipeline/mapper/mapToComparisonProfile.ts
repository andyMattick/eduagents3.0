import { defaultTeacherStyle } from "../schema/teacherStyleProfile";

export function mapToComparisonProfile(internal: any) {
  return {
    structure: internal.sectionStructures ?? [],
    items: internal.items ?? [],
    concepts: internal.conceptCoverage ?? { nodes: [], edges: [] },
    style: internal.teacherStyle ?? defaultTeacherStyle
  };
}
