// What the LLM can do inside the text.
// Default: PASS (any suggestion not explicitly non-actionable is treated as actionable).
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
  "worked example",
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
  "scaffold",
  "sentence starters",
  "sentence stem",
  "vocabulary support",
  "add summary",
  "add heading",
  "add label",
  "fix formatting",
  "break into steps",
  "break down",
  "step-by-step",
  "add reminder",
  "add whitespace",
  "white space",
  "include a",
  "provide a",
  "z-score",
  "standardization",
  "guide",
];

// Must be multi-word phrases or very specific terms to avoid false positives.
const NON_ACTIONABLE_KEYWORDS = [
  "review with students",
  "review in class",
  "review as a class",
  "review together",
  "reteach",
  "reteaching",
  "have students",
  "ask students",
  "students should",
  "let students",
  "encourage students",
  "monitor students",
  "monitor progress",
  "monitor student",
  "assess students",
  "student progress",
  "class discussion",
  "group discussion",
  "lesson plan",
  "during lesson",
  "formative assessment",
  "use manipulatives",
  "classroom behavior",
  "give students",
  "assign to students",
  "whole class",
  "in-class activity",
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isActionableRewriteSuggestion(suggestion: string): boolean {
  const lower = normalize(suggestion);
  if (!lower) return false;

  // Non-actionable check uses multi-word phrases to prevent false positives.
  if (NON_ACTIONABLE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return false;
  }

  // Explicit actionable keywords.
  if (ACTIONABLE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return true;
  }

  // Default: pass — teacher-generated suggestions are assumed actionable
  // unless explicitly flagged as non-actionable above.
  return true;
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
