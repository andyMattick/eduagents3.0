/**
 * comparator.ts — Document Intelligence Layer: Comparator.
 *
 * Compares a generated assessment's concepts against the source document
 * summary to identify coverage gaps and extras.
 *
 * DIL runs before Architect (Master Spec §15).
 */

export interface ComparatorInput {
  /** Concepts extracted from the source document by the Summarizer */
  sourceConcepts: string[];
  /** Concepts present in the generated assessment / blueprint */
  assessmentConcepts: string[];
}

export interface ComparatorOutput {
  /** 0.0–1.0 — fraction of source concepts covered by the assessment */
  coverage_score: number;
  /** Source concepts not found in the assessment */
  missing_concepts: string[];
  /** Assessment concepts not found in the source (potential drift) */
  extra_concepts: string[];
  /** Source concepts that are covered */
  covered_concepts: string[];
}

/**
 * runComparator — deterministic comparison, no LLM calls.
 *
 * Uses case-insensitive substring matching for flexibility
 * (e.g. "linear equation" matches "linear equations").
 */
export function runComparator(input: ComparatorInput): ComparatorOutput {
  const normalize = (s: string) => s.toLowerCase().trim();

  const sourceNorm = input.sourceConcepts.map(normalize);
  const assessNorm = input.assessmentConcepts.map(normalize);

  const covered: string[] = [];
  const missing: string[] = [];

  for (let i = 0; i < sourceNorm.length; i++) {
    const src = sourceNorm[i];
    const found = assessNorm.some(
      (a) => a.includes(src) || src.includes(a)
    );
    if (found) {
      covered.push(input.sourceConcepts[i]);
    } else {
      missing.push(input.sourceConcepts[i]);
    }
  }

  const extra: string[] = [];
  for (let i = 0; i < assessNorm.length; i++) {
    const a = assessNorm[i];
    const found = sourceNorm.some(
      (s) => s.includes(a) || a.includes(s)
    );
    if (!found) {
      extra.push(input.assessmentConcepts[i]);
    }
  }

  const coverage_score =
    sourceNorm.length === 0
      ? 1.0
      : covered.length / sourceNorm.length;

  return {
    coverage_score: Math.round(coverage_score * 100) / 100,
    missing_concepts: missing,
    extra_concepts: extra,
    covered_concepts: covered,
  };
}
