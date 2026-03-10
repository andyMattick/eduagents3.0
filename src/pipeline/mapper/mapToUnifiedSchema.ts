import {
  UnifiedAnalyzerOutput,
  UnifiedSectionStructure,
  UnifiedItem,
  UnifiedConceptGraph,
  UnifiedTeacherStyleProfile,
  UnifiedMetadata,
  UnifiedTemplateProfile
} from "../schema/unifiedSchema";

import { defaultTeacherStyle } from "../schema/defaults/defaultTeacherStyle";

export function mapToUnifiedSchema(internal: any): UnifiedAnalyzerOutput {
  const structure: UnifiedSectionStructure[] = internal.sectionStructures.map((s: any) => ({
    id: s.id,
    title: s.title ?? null,
    itemIds: s.itemIds ?? [],
    taskType: s.taskType ?? null
  }));

  const items: UnifiedItem[] = internal.items.map((it: any) => ({
    id: it.id,
    type: it.type ?? "unknown",
    source_text: it.source_text ?? "",
    normalized_text: it.normalized_text ?? "",
    concepts: it.concepts ?? [],
    difficulty: it.difficulty ?? 0,
    style_features: it.style_features ?? {}
  }));

  const concepts: UnifiedConceptGraph = {
    nodes: internal.conceptCoverage?.nodes ?? [],
    edges: internal.conceptCoverage?.edges ?? []
  };

  const style: UnifiedTeacherStyleProfile =
    internal.teacherStyle && Object.keys(internal.teacherStyle).length > 0
      ? internal.teacherStyle
      : defaultTeacherStyle;

  const template: UnifiedTemplateProfile = {
    sections: (internal.genericTemplates ?? []).map((t: any) => ({
      title: t.title ?? null,
      count: t.count ?? 0,
      type: t.type ?? null
    })),
    question_distribution: internal.distributions?.questionTypes ?? {},
    difficulty_curve: internal.distributions?.difficulty ?? [],
    pacing: style.pacing ?? "normal"
  };

  const metadata: UnifiedMetadata = {
    domain: internal.metadata?.domain ?? "unknown",
    reading_level: internal.metadata?.reading_level ?? "unknown",
    length: internal.metadata?.length ?? 0,
    confidence: internal.metadata?.confidence ?? 0.0
  };

  return {
    document_type: internal.document_type ?? "assessment",
    structure,
    items,
    concepts,
    style,
    template,
    metadata
  };
}
