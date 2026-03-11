export function computeDefaults(history: any[]) {
  if (!history || history.length === 0) {
    return {
      preferred_question_types: null,
      preferred_question_count: null,
      preferred_difficulty_profile: null,
      preferred_ordering_strategy: null,
      preferred_pacing_seconds: null,
      preferred_guardrails: null,
    };
  }

  // Helper functions
  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  const mode = (arr: string[]) => {
    if (arr.length === 0) return null;
    const freq: Record<string, number> = {};
    arr.forEach((v) => (freq[v] = (freq[v] || 0) + 1));
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  };

  const frequencySort = (arr: string[]) => {
    const freq: Record<string, number> = {};
    arr.forEach((v) => (freq[v] = (freq[v] || 0) + 1));
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
  };

  // Extract fields from history
  const allQuestionTypes = history.flatMap((h) => h.question_types || []);
  const allQuestionCounts = history.map((h) => h.question_count).filter(Boolean);
  const allDifficultyProfiles = history
    .map((h) => h.difficulty_profile)
    .filter(Boolean);
  const allOrderingStrategies = history
    .map((h) => h.ordering_strategy)
    .filter(Boolean);
  const allPacing = history
    .map((h) => h.pacing_seconds_per_item)
    .filter(Boolean);

  // Guardrails: boolean majority rule (≥ 60%)
  const guardrailCounts: Record<string, number> = {};
  const guardrailTotals: Record<string, number> = {};

  history.forEach((h) => {
    const g = h.guardrails || {};
    Object.keys(g).forEach((key) => {
      guardrailTotals[key] = (guardrailTotals[key] || 0) + 1;
      if (g[key] === true) {
        guardrailCounts[key] = (guardrailCounts[key] || 0) + 1;
      }
    });
  });

  const preferredGuardrails: Record<string, boolean> = {};
  Object.keys(guardrailTotals).forEach((key) => {
    const pct = guardrailCounts[key] / guardrailTotals[key];
    preferredGuardrails[key] = pct >= 0.6;
  });

  return {
    preferred_question_types: frequencySort(allQuestionTypes),
    preferred_question_count: median(allQuestionCounts),
    preferred_difficulty_profile: mode(allDifficultyProfiles),
    preferred_ordering_strategy: mode(allOrderingStrategies),
    preferred_pacing_seconds: median(allPacing),
    preferred_guardrails: preferredGuardrails,
  };
}
