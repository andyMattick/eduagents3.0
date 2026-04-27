import { defaultTeacherStyle } from "../schema/defaults/defaultTeacherStyle";


export function mapToComparisonProfile(internal: any) {
  return {
    structure: internal.sectionStructures ?? [],
    items: internal.items ?? [],
    concepts: internal.conceptCoverage ?? { nodes: [], edges: [] },
    style: internal.teacherStyle ?? defaultTeacherStyle
  };
}
