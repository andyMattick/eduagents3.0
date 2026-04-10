import type { V4Item, V4Section } from "../simulator/shared";

/**
 * NOTES-ONLY REWRITE PROMPT
 * Used when doc_type = "notes"
 */
export function buildNotesRewritePrompt({
  sections,
  selectedSuggestions,
  teacherSuggestions,
  preferences
}: {
  sections: V4Section[];
  selectedSuggestions: { testLevel: string[]; itemLevel: Record<number, string[]> };
  teacherSuggestions: string[];
  preferences: Record<string, unknown>;
}): string {
  const sectionText = sections
    .map((s) => ({ sectionId: s.sectionId, order: s.order, text: s.text }))
    .map((s) => JSON.stringify(s, null, 2))
    .join("\n\n");

  return `
SYSTEM:
You are rewriting instructional NOTES (not assessment items).
Apply ONLY the selected rewrite suggestions.

STRICT RULES:
- Do not apply any suggestion that is not listed under Selected suggestions.
- Preserve meaning, factual correctness, section count, section order, and section IDs.
- Do not add new sections, tables, headings, or duplicated text unless explicitly requested.
- If no change is needed for a section, return it unchanged.
- Return valid JSON only.

Selected teacher suggestions:
${teacherSuggestions.join("\n")}

Selected test-level suggestions:
${selectedSuggestions.testLevel.join("\n")}

Preferences:
${JSON.stringify(preferences, null, 2)}

NOTES TO REWRITE:
${sectionText}

Return ONLY JSON:
{
  "sections": [
    {
      "sectionId": "string",
      "rewrittenText": "string"
    }
  ],
  "testLevel": ["string"],
  "metadata": {}
}
`;
}

/**
 * MIXED REWRITE PROMPT
 * Used when doc_type = "mixed"
 */
export function buildMixedRewritePrompt({
  items,
  sections,
  selectedSuggestions,
  teacherSuggestions,
  selectedItems,
  preferences
}: {
  items: V4Item[];
  sections: V4Section[];
  selectedSuggestions: { testLevel: string[]; itemLevel: Record<number, string[]> };
  teacherSuggestions: string[];
  selectedItems: number[];
  preferences: Record<string, unknown>;
}): string {
  const sectionText = sections
    .map((s) => ({ sectionId: s.sectionId, order: s.order, text: s.text }))
    .map((s) => JSON.stringify(s, null, 2))
    .join("\n\n");

  const itemText = items
    .map((i) => ({ itemNumber: i.itemNumber, stem: i.stem }))
    .map((i) => JSON.stringify(i, null, 2))
    .join("\n\n");

  return `
SYSTEM:
You are rewriting a MIXED instructional document containing BOTH:
1. Instructional notes
2. Assessment items

Apply ONLY the selected rewrite suggestions.

STRICT RULES:
- Do not apply any suggestion that is not listed under Selected suggestions.
- Preserve section IDs, section count, section order, item numbers, and item count.
- Do not introduce new structure, tables, headings, or duplicated text unless explicitly requested.
- Keep each rewritten section mapped to the same sectionId.
- Keep each rewritten item mapped to the same itemNumber.
- If no change is needed for an entry, return it unchanged.
- Return valid JSON only.

Selected teacher suggestions:
${teacherSuggestions.join("\n")}

Selected test-level suggestions:
${selectedSuggestions.testLevel.join("\n")}

Preferences:
${JSON.stringify(preferences, null, 2)}

NOTES TO REWRITE:
${sectionText}

ITEMS TO REWRITE:
${itemText}

Return ONLY JSON:
{
  "sections": [
    {
      "sectionId": "string",
      "rewrittenText": "string"
    }
  ],
  "items": [
    {
      "itemNumber": number,
      "rewrittenStem": "string"
    }
  ],
  "testLevel": ["string"],
  "metadata": {}
}
`;
}
