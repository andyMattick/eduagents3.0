export function mapToSummaryView(internal: any) {
  return {
    item_count: internal.items?.length ?? 0,
    sections: internal.sectionStructures?.length ?? 0,
    key_concepts: internal.conceptCoverage?.nodes?.slice(0, 10) ?? [],
    difficulty_curve: internal.distributions?.difficulty ?? [],
    domain: internal.metadata?.domain ?? "unknown"
  };
}
