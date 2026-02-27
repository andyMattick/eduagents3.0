/**
 * parseChunk.ts
 *
 * Parses a raw LLM response that may contain one or more JSON problem objects,
 * each terminated by the sentinel `<END_OF_PROBLEM>`.
 *
 * Contract:
 *   - LLM is instructed to emit:  { ...problem json... }\n<END_OF_PROBLEM>\n
 *   - Multiple problems appear sequentially in the same response.
 *   - Any leftover text after the last delimiter, or any block that fails
 *     JSON.parse, marks the entire parse as truncated.
 */

import type { GeneratedItem } from "../types";

export interface ParseChunkResult {
  items: GeneratedItem[];
  truncated: boolean;
  /** Raw blocks that failed JSON.parse (for logging) */
  failedBlocks: string[];
}

export const END_SENTINEL = "<END_OF_PROBLEM>";

export function parseChunk(raw: string): ParseChunkResult {
  const items: GeneratedItem[] = [];
  const failedBlocks: string[] = [];
  let truncated = false;

  // Split on the sentinel
  const segments = raw.split(END_SENTINEL);

  const remainder = segments[segments.length - 1].trim();
  const sawAtLeastOneDelimiter = segments.length > 1;

  if (!sawAtLeastOneDelimiter) {
    // No sentinel at all — the LLM skipped it.
    // Attempt to parse the entire response as a single JSON object
    // before marking as truncated.
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as GeneratedItem;
        // Valid JSON, no sentinel — accept the item but still flag truncated
        // so the adaptive engine knows the LLM is dropping sentinels.
        items.push(parsed);
      } catch {
        failedBlocks.push(cleaned);
      }
    } else {
      failedBlocks.push(cleaned);
    }
    truncated = true;
    return { items, truncated, failedBlocks };
  }

  if (remainder.length > 0) {
    truncated = true;
  }

  // Process all segments except the trailing remainder
  const blocks = segments.slice(0, segments.length - 1);

  for (const block of blocks) {
    const cleaned = block
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    if (!cleaned) continue;

    // Attempt to extract the outermost JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      failedBlocks.push(cleaned);
      truncated = true;
      continue;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedItem;
      items.push(parsed);
    } catch {
      failedBlocks.push(cleaned);
      truncated = true;
    }
  }

  return { items, truncated, failedBlocks };
}
