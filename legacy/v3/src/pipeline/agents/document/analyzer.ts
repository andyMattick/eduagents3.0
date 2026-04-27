/**
 * analyzer.ts — Document Intelligence Layer: Analyzer.
 *
 * Analyzes a generated assessment to produce structural metadata:
 * difficulty distribution, question types, concept coverage, and gaps.
 *
 * DIL runs before Architect (Master Spec §15).
 */

export interface AnalyzerInput {
  /** Array of generated items / problems */
  items: Array<{
    questionType?: string;
    difficulty?: string;
    concepts?: string[];
    cognitive_demand?: string;
    [key: string]: any;
  }>;
  /** Expected concepts from the source document summary */
  expectedConcepts?: string[];
}

export interface AnalyzerOutput {
  /** Distribution of difficulty levels */
  difficulty_distribution: Record<string, number>;
  /** Distribution of question types */
  question_types: Record<string, number>;
  /** All concepts assessed across the items */
  concepts_assessed: string[];
  /** Expected concepts that are missing from the items */
  missing_concepts: string[];
  /** Distribution of cognitive demand / Bloom levels */
  bloom_distribution: Record<string, number>;
  /** Total item count */
  item_count: number;
}

/**
 * runAnalyzer — deterministic analysis, no LLM calls.
 */
export function runAnalyzer(input: AnalyzerInput): AnalyzerOutput {
  const { items, expectedConcepts = [] } = input;

  // Difficulty distribution
  const difficulty_distribution: Record<string, number> = {};
  for (const item of items) {
    const d = item.difficulty ?? "unspecified";
    difficulty_distribution[d] = (difficulty_distribution[d] ?? 0) + 1;
  }

  // Question type distribution
  const question_types: Record<string, number> = {};
  for (const item of items) {
    const t = item.questionType ?? "unknown";
    question_types[t] = (question_types[t] ?? 0) + 1;
  }

  // Bloom distribution
  const bloom_distribution: Record<string, number> = {};
  for (const item of items) {
    const b = item.cognitive_demand ?? "unspecified";
    bloom_distribution[b] = (bloom_distribution[b] ?? 0) + 1;
  }

  // Concepts assessed (deduplicated)
  const conceptSet = new Set<string>();
  for (const item of items) {
    for (const c of item.concepts ?? []) {
      conceptSet.add(c.toLowerCase().trim());
    }
  }
  const concepts_assessed = [...conceptSet];

  // Missing concepts
  const missing_concepts = expectedConcepts.filter(
    (ec) => !conceptSet.has(ec.toLowerCase().trim())
  );

  return {
    difficulty_distribution,
    question_types,
    concepts_assessed,
    missing_concepts,
    bloom_distribution,
    item_count: items.length,
  };
}
