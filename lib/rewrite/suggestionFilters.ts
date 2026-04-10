const ACTIONABLE_KEYWORDS = [
  "clarify",
  "definition",
  "define",
  "glossary",
  "flow",
  "readability",
  "simplify",
  "reword",
  "rephrase",
  "add example",
  "add examples",
  "add context",
  "add explanation",
  "add definitions",
  "add formula",
  "formula sheet",
  "add transition",
  "add transitions",
  "improve structure",
  "improve clarity",
  "improve flow",
  "accessibility",
  "scaffolding",
  "sentence starters",
  "vocabulary support",
  "add summary",
  "add heading",
  "add label",
  "fix formatting",
];

const NON_ACTIONABLE_KEYWORDS = [
  "review",
  "reteach",
  "teach",
  "students should",
  "have students",
  "ask students",
  "encourage",
  "monitor",
  "assess",
  "assessment",
  "feedback",
  "practice",
  "collaborate",
  "discussion",
  "discuss",
  "lesson",
  "instruction",
  "model",
  "classroom",
  "student progress",
  "formative",
  "reteaching",
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isActionableRewriteSuggestion(suggestion: string): boolean {
  const lower = normalize(suggestion);
  if (!lower) return false;

  if (NON_ACTIONABLE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return false;
  }

  if (ACTIONABLE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return true;
  }

  return false;
}

export function filterRewriteSuggestions(suggestions: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    if (!isActionableRewriteSuggestion(suggestion)) continue;
    const normalized = normalize(suggestion);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(suggestion.trim());
  }

  return out;
}
