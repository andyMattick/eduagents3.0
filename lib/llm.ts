/**
 * lib/llm.ts — PII-safe LLM choke point
 *
 * ALL Gemini calls must go through `callLLM` rather than calling
 * `callGemini` directly.  This file:
 *   1. Detects PII patterns in the prompt before sending to Gemini.
 *   2. Throws if PII is found, preventing data leakage.
 *   3. Provides consistent model/token defaults for all routes.
 *
 * Privacy contract
 * ----------------
 * - Student names, teacher names, school names, IDs, emails, phone numbers,
 *   and addresses must NEVER appear in prompts.
 * - Use `toLLMStudentProfile` and `toLLMTeacherContext` to strip PII before
 *   building prompts.
 */

import { callGemini } from "./gemini";

// ---------------------------------------------------------------------------
// PII detection
// ---------------------------------------------------------------------------

/**
 * Returns true if `text` contains patterns that look like PII.
 *
 * Intentionally conservative: false positives are acceptable,
 * false negatives (sending PII to Gemini) are not.
 */
export function looksLikePII(text: string): boolean {
  if (!text) return false;

  const patterns: RegExp[] = [
    // Email addresses
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,

    // Phone numbers (US style)
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,

    // Student / teacher name prefix patterns
    /\b(Student|Teacher|Mr|Ms|Mrs|Dr)\.?\s+[A-Z][a-z]+/,

    // US school name patterns
    /\b(Elementary|Middle|High)\s+School\b/i,
    /\b(Academy|Charter\s+School|Magnet\s+School)\b/i,

    // Classroom identifiers
    /\bPeriod\s+\d\b/,
    /\bHomeroom\b/i,

    // SIS-style numeric identifiers
    /\bID[:\s]*\d{5,}\b/,

    // Street addresses
    /\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln)\b/i,
  ];

  return patterns.some((regex) => regex.test(text));
}

// ---------------------------------------------------------------------------
// Profile/context anonymizers
// ---------------------------------------------------------------------------

/**
 * Strip PII from a student profile object before sending to LLM.
 * Only passes trait-level descriptors (no names, IDs, etc.).
 */
export function toLLMStudentProfile(profile: Record<string, unknown>): Record<string, unknown> {
  return {
    confidence:        profile.confidence,
    anxietyLevel:      profile.anxietyLevel,
    pacingStyle:       profile.pacingStyle,
    readingProfile:    profile.readingProfile,
    attentionProfile:  profile.attentionProfile,
    mathBackground:    profile.mathBackground,
  };
}

/**
 * Strip PII from a teacher context object before sending to LLM.
 * Only passes pedagogical context (no school name, teacher name, etc.).
 */
export function toLLMTeacherContext(ctx: Record<string, unknown>): Record<string, unknown> {
  return {
    subject:   ctx.subject,
    gradeBand: ctx.gradeBand,
  };
}

// ---------------------------------------------------------------------------
// LLM choke point
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

/**
 * Central LLM caller.  Every route must use this instead of `callGemini`.
 *
 * @param prompt     - The prompt to send. Must NOT contain PII.
 * @param metadata   - Optional logging context (written to console.error on failure).
 * @param options    - Override model / token settings for specialised routes.
 */
export async function callLLM({
  prompt,
  metadata,
  options,
}: {
  prompt: string;
  metadata?: Record<string, unknown>;
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
}): Promise<string> {
  if (looksLikePII(prompt)) {
    console.error("[callLLM] PII detected in prompt — aborting LLM call", { metadata });
    throw new Error("PII detected in LLM prompt");
  }

  return callGemini({
    model:           options?.model           ?? DEFAULT_MODEL,
    prompt,
    temperature:     options?.temperature     ?? 0.2,
    maxOutputTokens: options?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  });
}
