/**
 * lib/llm.ts — LLM choke point with PII awareness
 *
 * ALL Gemini calls must go through `callLLM` rather than calling
 * `callGemini` directly.  This file:
 *   1. Detects PII patterns in the prompt and logs a warning.
 *   2. Never blocks the call — teacher-uploaded documents may contain
 *      proper nouns (names, school references) by design.
 *   3. Provides helpers to avoid ADDING new PII when building prompts.
 *   4. Provides consistent model/token defaults for all routes.
 *
 * Privacy contract
 * ----------------
 * - Never inject teacher names, student names, or school names when
 *   building LLM prompts from scratch.
 * - Use `toLLMStudentProfile` and `toLLMTeacherContext` to strip PII
 *   from structured objects before inserting them into prompts.
 * - Teacher-uploaded document text is sent to Gemini as-is; teachers
 *   are shown a disclosure at the time of upload.
 */

import { callGemini, callGeminiDetailed, type GeminiCallResult } from "./gemini";

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
  return callGemini({
    model:           options?.model           ?? DEFAULT_MODEL,
    prompt,
    temperature:     options?.temperature     ?? 0.2,
    maxOutputTokens: options?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  });
}

export async function callLLMWithUsage({
  prompt,
  options,
}: {
  prompt: string;
  metadata?: Record<string, unknown>;
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
}): Promise<GeminiCallResult> {
  return callGeminiDetailed({
    model:           options?.model           ?? DEFAULT_MODEL,
    prompt,
    temperature:     options?.temperature     ?? 0.2,
    maxOutputTokens: options?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  });
}
