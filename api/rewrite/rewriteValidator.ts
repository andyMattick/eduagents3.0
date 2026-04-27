export type RewriteValidationInput = {
  original: string;
  appliedSuggestions: string[];
  actionableSuggestions: string[];
  profileApplied?: unknown;
};

export type RewriteValidationResult = {
  valid: boolean;
  errors: string[];
};

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function validateRewriteRequest({
  original,
  appliedSuggestions,
  actionableSuggestions,
  profileApplied,
}: RewriteValidationInput): RewriteValidationResult {
  const errors: string[] = [];

  if (!original || original.trim().length === 0) {
    errors.push("Missing original text.");
  }

  if (!Array.isArray(appliedSuggestions)) {
    errors.push("Suggestions must be an array.");
  }

  if (!Array.isArray(actionableSuggestions) || actionableSuggestions.length === 0) {
    errors.push("No actionable suggestions selected.");
  }

  if (typeof profileApplied !== "undefined" && profileApplied !== null && typeof profileApplied !== "string") {
    errors.push("Profile context must be a string.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isNoOpRewrite(original: string, rewritten: string): boolean {
  return normalize(original) === normalize(rewritten);
}
