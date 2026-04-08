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
    .map((s) => `SECTION ${s.order}:\n${s.text}`)
    .join("\n\n");

  return `
SYSTEM:
You are rewriting instructional NOTES (not assessment items).
Your goal is to improve clarity, pacing, conceptual accuracy, and accessibility.

Teacher suggestions:
${teacherSuggestions.join("\n")}

Test-level suggestions:
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
    .map((s) => `SECTION ${s.order}:\n${s.text}`)
    .join("\n\n");

  const itemText = items
    .map((i) => `ITEM ${i.itemNumber}:\n${i.stem}`)
    .join("\n\n");

  return `
SYSTEM:
You are rewriting a MIXED instructional document containing BOTH:
1. Instructional notes
2. Assessment items

Rewrite BOTH parts while preserving meaning and grade-level intent.

Teacher suggestions:
${teacherSuggestions.join("\n")}

Test-level suggestions:
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
