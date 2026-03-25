import { defaultTeacherStyle } from "../schema/defaults/defaultTeacherStyle";

export function mapToConceptGraph(internal: any) {
  return internal?.conceptCoverage ?? { nodes: [], edges: [] };
}
