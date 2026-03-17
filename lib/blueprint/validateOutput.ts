/**
 * lib/blueprint/validateOutput.ts — Output Verification
 *
 * Post-generation validation: checks that LLM output actually
 * follows the blueprint. Returns structured validation result
 * with actionable correction prompt if invalid.
 *
 * Design rules:
 *   - Deterministic (no LLM calls)
 *   - Never crashes
 *   - Provides correction prompt for retry
 */

import type { Blueprint } from "./buildBlueprint";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  missingConcepts: string[];
  missingTypes: string[];
  score: number; // 0.0–1.0 coverage ratio
}

// ── Validator ───────────────────────────────────────────────────────────────

/**
 * Validate that LLM output adheres to the blueprint.
 * Checks concept coverage and question type presence.
 */
export function validateOutput(
  output: string,
  blueprint: Blueprint
): ValidationResult {
  const lower = output.toLowerCase();

  // Check concept coverage
  const missingConcepts = blueprint.concepts.filter(
    (c) => !lower.includes(c.toLowerCase())
  );

  // Check question type coverage
  const typeKeywords: Record<string, string[]> = {
    multiple_choice: ["a)", "b)", "c)", "a.", "b.", "c.", "(a)", "(b)", "(c)"],
    short_answer: ["short answer", "briefly", "explain", "describe", "answer:"],
    true_false: ["true or false", "true/false", "t/f"],
    open_ended: ["discuss", "analyze", "evaluate", "essay", "open"],
  };

  const requiredTypes = new Set(blueprint.questionPlan.map((q) => q.type));
  const missingTypes = [...requiredTypes].filter((type) => {
    const keywords = typeKeywords[type] ?? [];
    return !keywords.some((kw) => lower.includes(kw));
  });

  // Score: percentage of checks passed
  const totalChecks = blueprint.concepts.length + requiredTypes.size;
  const passedChecks = totalChecks - missingConcepts.length - missingTypes.length;
  const score = totalChecks > 0 ? passedChecks / totalChecks : 1;

  return {
    valid: missingConcepts.length === 0 && missingTypes.length === 0,
    missingConcepts,
    missingTypes,
    score,
  };
}

// ── Correction prompt ───────────────────────────────────────────────────────

/**
 * Build a correction prompt to retry generation with specific fixes.
 */
export function buildCorrectionPrompt(
  originalOutput: string,
  validation: ValidationResult,
  blueprint: Blueprint
): string {
  const fixes: string[] = [];

  if (validation.missingConcepts.length > 0) {
    fixes.push(
      `Missing concepts that MUST appear: ${validation.missingConcepts.join(", ")}`
    );
  }

  if (validation.missingTypes.length > 0) {
    fixes.push(
      `Missing question types: ${validation.missingTypes.join(", ")}`
    );
  }

  return `Your previous output did not fully follow the blueprint.

--- PREVIOUS OUTPUT ---
${originalOutput.slice(0, 2000)}

--- REQUIRED CORRECTIONS ---
${fixes.join("\n")}

--- BLUEPRINT (reference) ---
${JSON.stringify(blueprint, null, 2)}

--- INSTRUCTIONS ---
Revise the output to include ALL missing concepts and question types.
Keep everything that was correct. Only fix what's missing.`;
}
