/**
 * Preparedness LLM Orchestration
 * 
 * Three-phase analysis: Alignment → Suggestions → Rewrite
 * Each phase calls the LLM with structured prompts and returns validated JSON.
 */

import {
  type AlignmentResult,
  type ConceptItem,
  type SuggestionsResult,
  type RewriteResult,
  type ReverseAlignmentResult,
  type PreparednessReportResult,
  type AssessmentDocument,
  type PrepDocument,
  type Suggestion,
} from "../schema/domain/Preparedness";

/**
 * Generic LLM caller (to be injected).
 * Implementations can use Gemini, Claude, or any LLM service.
 */
export type LLMCaller = (prompt: string, options?: {
  temperature?: number;
  maxOutputTokens?: number;
}) => Promise<string>;

// ── PROMPTS ──────────────────────────────────────────────────────────────

const ALIGNMENT_PROMPT_TEMPLATE = `You are an instructional alignment engine.

Your task is to align each ASSESSMENT item to the REVIEW content.

For each assessment item:
- Identify concepts as objects:
    { "label": "...", "count": <number>, "difficulties": [1–5] }
- Assign difficulty from 1 to 5
- Assign prepDifficulty from 1 to 5
- Assign alignment category:
  "aligned"
  "slightly_above"
  "misaligned_above"
  "missing_in_prep"

Do NOT include:
- sentences
- long text
- explanations
- examples
- quotes
- markdown
- commentary

Return ONLY valid JSON.

FORMAT:
[
  {
    "assessmentItemNumber": 1,
    "concepts": [
      { "label": "mean", "count": 2, "difficulties": [2,3] },
      { "label": "sampling", "count": 1, "difficulties": [3] }
    ],
    "difficulty": 3,
    "prepDifficulty": 2,
    "alignment": "slightly_above"
  }
]`;

const SUGGESTIONS_PROMPT_TEMPLATE = `You are an instructional suggestion engine.

Your task is to analyze ALIGNMENT_DATA and produce structured suggestions.

Rules:
- If alignment = "aligned" → no suggestion
- If alignment = "slightly_above" → suggestionType = "add_prep_support"
- If alignment = "misaligned_above" → suggestionType = "add_prep_support"
- If alignment = "missing_in_prep" → suggestionType = "remove_question" or "add_prep_support"

Use ONLY short labels. No sentences.

Return ONLY valid JSON.

FORMAT:
[
  {
    "assessmentItemNumber": 1,
    "issue": "missing_in_prep",
    "suggestionType": "add_prep_support"
  }
]`;

const REWRITE_PROMPT_TEMPLATE = `You are an instructional rewrite engine.

Your task is to apply the teacher-selected suggestions to the ASSESSMENT.

Inputs:
ORIGINAL_ASSESSMENT:
<<<ASSESSMENT>>>

FINAL_SUGGESTIONS:
<<<SUGGESTIONS_JSON>>>

For each assessment item:
- If suggestionType = "remove_question" → remove it
- If suggestionType = "add_prep_support" → keep the question and generate a short prep addendum item
- If no suggestion → leave unchanged

Return ONLY valid JSON.

FORMAT:
{
  "rewrittenAssessment": "...full rewritten test text...",
  "prepAddendum": ["label1", "label2"]
}`;

const REVERSE_ALIGNMENT_PROMPT_TEMPLATE = `You are an instructional alignment engine.

Your task is to analyze how each REVIEW item connects to the ASSESSMENT.

For each review item:
- Identify concepts as objects:
    { "label": "...", "count": <number>, "difficulties": [1–5] }
- Assign prepDifficulty from 1 to 5
- Identify which assessment items use those concepts
- For each match, assign:
  "aligned"
  "review_above_test"
  "review_below_test"
  "not_used_in_test"

Do NOT include:
- sentences
- long text
- explanations
- examples
- quotes
- markdown
- commentary

Return ONLY valid JSON.

FORMAT:
[
  {
    "prepItemNumber": 1,
    "concepts": [
      { "label": "mean", "count": 3, "difficulties": [1,2,2] }
    ],
    "prepDifficulty": 2,
    "testEvidence": [
      {
        "assessmentItemNumber": 4,
        "difficulty": 4,
        "alignment": "review_below_test"
      }
    ]
  }
]`;

const PREPAREDNESS_REPORT_PROMPT_TEMPLATE = `You are an instructional report generator.

Your task is to produce a clear, teacher-friendly Preparedness Report using the provided data.

Use the following inputs:
ALIGNMENT_DATA:
<<<ALIGNMENT_JSON>>>

REVERSE_ALIGNMENT_DATA:
<<<REVERSE_ALIGNMENT_JSON>>>

SUGGESTIONS:
<<<SUGGESTIONS_JSON>>>

REWRITE_RESULTS:
<<<REWRITE_JSON>>>

Create a concise narrative report with four sections:

SECTION 1: Test Questions and How They Were Reviewed
For each assessment item:
- concepts required
- where it appeared in the review (short evidence)
- prep Bloom vs test Bloom
- alignment classification
- teacher’s chosen fix

SECTION 2: Review Questions and How They Appear on the Test
For each review question:
- concepts taught
- which test questions use those concepts
- whether review is above/below/same level as test

SECTION 3: Teacher Decisions for Missing-in-Prep Items
List each missing-in-prep test question and the teacher’s selected action.

SECTION 4: Review Addendum
Include all prep addendum text in one merged block.

Return ONLY valid JSON with this structure:
{
  "section1": "...",
  "section2": "...",
  "section3": "...",
  "section4": "..."
}`;

function cleanModelJson(raw: string): string {
  return raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
}

function repairJson(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F]+/g, "")
    .replace(/\\(?!["\\/bfnrt])/g, "\\\\")
    .replace(/"([^"]*)$/g, '"$1"');
}

function parseJsonWithRepair<T>(raw: string): T {
  const cleaned = cleanModelJson(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const repaired = repairJson(cleaned);
    return JSON.parse(repaired) as T;
  }
}

function isRateLimitError(err: unknown): boolean {
  return String(err instanceof Error ? err.message : err).includes("429");
}

function normalizeConceptItem(raw: unknown): ConceptItem {
  const c = raw as Record<string, unknown>;
  return {
    label: String(c.label ?? ""),
    count: Number(c.count ?? 1),
    difficulties: Array.isArray(c.difficulties)
      ? c.difficulties.map((d) => Number(d))
      : [Number(c.difficulty ?? 1)],
  };
}

function normalizeAlignmentResult(raw: Array<Record<string, unknown>>): AlignmentResult {
  return raw.map((item) => ({
    assessmentItemNumber: Number(item.assessmentItemNumber),
    concepts: Array.isArray(item.concepts)
      ? item.concepts.map(normalizeConceptItem)
      : [],
    difficulty: Number(item.difficulty ?? 1),
    prepDifficulty: Number(item.prepDifficulty ?? 1),
    alignment: String(item.alignment) as AlignmentResult[number]["alignment"],
  }));
}

function normalizeReverseAlignmentResult(raw: Array<Record<string, unknown>>): ReverseAlignmentResult {
  return raw.map((item) => ({
    prepItemNumber: Number(item.prepItemNumber),
    concepts: Array.isArray(item.concepts)
      ? item.concepts.map(normalizeConceptItem)
      : [],
    prepDifficulty: Number(item.prepDifficulty ?? 1),
    testEvidence: Array.isArray(item.testEvidence)
      ? item.testEvidence.map((ev) => ({
          assessmentItemNumber: Number((ev as Record<string, unknown>).assessmentItemNumber ?? 0),
          difficulty: Number((ev as Record<string, unknown>).difficulty ?? 1),
          alignment: String((ev as Record<string, unknown>).alignment) as ReverseAlignmentResult[number]["testEvidence"][number]["alignment"],
        }))
      : [],
  }));
}

function normalizeRewriteResult(raw: Record<string, unknown>): RewriteResult {
  const rewrittenAssessment = String(raw.rewrittenAssessment ?? "");
  const prepAddendum = Array.isArray(raw.prepAddendum)
    ? raw.prepAddendum.map((v) => String(v))
    : typeof raw.prepAddendum === "string" && raw.prepAddendum.trim()
    ? [raw.prepAddendum.trim()]
    : [];
  return { rewrittenAssessment, prepAddendum };
}

function splitReportSections(text: string): PreparednessReportResult {
  const normalized = text.trim();
  const sectionPattern = /SECTION\s*([1-4])\s*:\s*([^\n]+)\n?/gi;
  const matches: Array<{ number: number; index: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = sectionPattern.exec(normalized)) !== null) {
    matches.push({
      number: Number(match[1]),
      index: match.index,
    });
  }

  if (matches.length === 0) {
    return {
      section1: [{ text: normalized }],
      section2: [],
      section3: [],
      section4: [],
      fullText: normalized,
    };
  }

  const sections: Record<number, string> = {
    1: "",
    2: "",
    3: "",
    4: "",
  };

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index;
    const end = next ? next.index : normalized.length;
    sections[current.number] = normalized.slice(start, end).trim();
  }

  return {
    section1: sections[1] ? [{ text: sections[1] }] : [],
    section2: sections[2] ? [{ text: sections[2] }] : [],
    section3: sections[3] ? [{ text: sections[3] }] : [],
    section4: sections[4] ? sections[4].split(/\n/).filter(Boolean) : [],
    fullText: normalized,
  };
}

// ── ORCHESTRATION ────────────────────────────────────────────────────────

/**
 * Phase 1: Analyze alignment between assessment and prep.
 */
export async function getAlignment(
  prep: PrepDocument,
  assessment: AssessmentDocument,
  callLLM: LLMCaller,
  attempt = 0
): Promise<AlignmentResult> {
  const assessmentText = assessment.items
    .map((item) => `${item.itemNumber}. ${item.text}`)
    .join("\n");

  const prompt = `${ALIGNMENT_PROMPT_TEMPLATE}\n\nREVIEW_CONTENT:\n${prep.rawText}\n\nASSESSMENT:\n${assessmentText}`;

  try {
    const raw = await callLLM(prompt, { maxOutputTokens: 2048 });
    const parsed = parseJsonWithRepair<Array<Record<string, unknown>>>(raw);
    return normalizeAlignmentResult(parsed);
  } catch (err) {
    if (isRateLimitError(err) && attempt < 1) {
      await new Promise((r) => setTimeout(r, 300));
      return getAlignment(prep, assessment, callLLM, attempt + 1);
    }
    console.error("Alignment LLM parse error:", err);
    throw new Error(`Failed to parse alignment response: ${String(err)}`);
  }
}

/**
 * Phase 2: Generate suggestions based on alignment.
 */
export async function getSuggestions(
  alignment: AlignmentResult,
  callLLM: LLMCaller,
  attempt = 0
): Promise<SuggestionsResult> {
  const alignmentJson = JSON.stringify(alignment, null, 2);

  const prompt = `${SUGGESTIONS_PROMPT_TEMPLATE}\n\nALIGNMENT_DATA:\n${alignmentJson}`;

  try {
    const raw = await callLLM(prompt, { maxOutputTokens: 2048 });
    const parsed = parseJsonWithRepair<SuggestionsResult>(raw);
    return parsed;
  } catch (err) {
    if (isRateLimitError(err) && attempt < 1) {
      await new Promise((r) => setTimeout(r, 300));
      return getSuggestions(alignment, callLLM, attempt + 1);
    }
    console.error("Suggestions LLM parse error:", err);
    throw new Error(`Failed to parse suggestions response: ${String(err)}`);
  }
}

/**
 * Phase 3: Rewrite assessment and/or prep based on selected suggestions.
 */
export async function applySuggestions(
  assessment: AssessmentDocument,
  suggestions: Suggestion[],
  callLLM: LLMCaller,
  attempt = 0
): Promise<RewriteResult> {
  // Only rewrite if there are suggestions to apply
  if (suggestions.length === 0) {
    const fallbackText = assessment.items
      .map((item) => `${item.itemNumber}. ${item.text}`)
      .join("\n\n");
    return { rewrittenAssessment: fallbackText, prepAddendum: [] };
  }

  const assessmentText = assessment.items
    .map((item) => `${item.itemNumber}. ${item.text}`)
    .join("\n");

  const suggestionsJson = JSON.stringify(suggestions, null, 2);

  const prompt = REWRITE_PROMPT_TEMPLATE
    .replace("<<<ASSESSMENT>>>", assessmentText)
    .replace("<<<SUGGESTIONS_JSON>>>", suggestionsJson);

  try {
    const raw = await callLLM(prompt, { maxOutputTokens: 2048 });
    const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
    return normalizeRewriteResult(parsed);
  } catch (err) {
    if (isRateLimitError(err) && attempt < 1) {
      await new Promise((r) => setTimeout(r, 300));
      return applySuggestions(assessment, suggestions, callLLM, attempt + 1);
    }
    console.error("Rewrite LLM parse error:", err);
    throw new Error(`Failed to parse rewrite response: ${String(err)}`);
  }
}

/**
 * Reverse alignment: map prep items to assessment coverage.
 */
export async function getReverseAlignment(
  prep: PrepDocument,
  assessment: AssessmentDocument,
  callLLM: LLMCaller,
  attempt = 0
): Promise<ReverseAlignmentResult> {
  const assessmentText = assessment.items
    .map((item) => `${item.itemNumber}. ${item.text}`)
    .join("\n");

  const prompt = `${REVERSE_ALIGNMENT_PROMPT_TEMPLATE}\n\nREVIEW_DOCUMENT:\n${prep.rawText}\n\nASSESSMENT:\n${assessmentText}`;

  try {
    const raw = await callLLM(prompt, { maxOutputTokens: 2048 });
    const parsed = parseJsonWithRepair<Array<Record<string, unknown>>>(raw);
    return normalizeReverseAlignmentResult(parsed);
  } catch (err) {
    if (isRateLimitError(err) && attempt < 1) {
      await new Promise((r) => setTimeout(r, 300));
      return getReverseAlignment(prep, assessment, callLLM, attempt + 1);
    }
    console.error("Reverse alignment LLM parse error:", err);
    throw new Error(`Failed to parse reverse alignment response: ${String(err)}`);
  }
}

/**
 * Final narrative report synthesis.
 */
export async function generatePreparednessReport(
  alignment: AlignmentResult,
  reverseAlignment: ReverseAlignmentResult,
  suggestions: SuggestionsResult,
  rewrite: RewriteResult,
  callLLM: LLMCaller,
  attempt = 0
): Promise<PreparednessReportResult> {
  const prompt = PREPAREDNESS_REPORT_PROMPT_TEMPLATE
    .replace("<<<ALIGNMENT_JSON>>>", JSON.stringify(alignment, null, 2))
    .replace("<<<REVERSE_ALIGNMENT_JSON>>>", JSON.stringify(reverseAlignment, null, 2))
    .replace("<<<SUGGESTIONS_JSON>>>", JSON.stringify(suggestions, null, 2))
    .replace("<<<REWRITE_JSON>>>", JSON.stringify(rewrite, null, 2));

  try {
    const raw = await callLLM(prompt, { maxOutputTokens: 2048, temperature: 0.2 });
    const parsed = parseJsonWithRepair<{
      section1?: unknown[];
      section2?: unknown[];
      section3?: unknown[];
      section4?: unknown[];
    }>(raw);
    const section1 = Array.isArray(parsed.section1) ? parsed.section1 : [];
    const section2 = Array.isArray(parsed.section2) ? parsed.section2 : [];
    const section3 = Array.isArray(parsed.section3) ? parsed.section3 : [];
    const section4 = Array.isArray(parsed.section4)
      ? parsed.section4.map((v) => String(v))
      : [];
    return {
      section1,
      section2,
      section3,
      section4,
      fullText: JSON.stringify({ section1, section2, section3, section4 }),
    };
  } catch (err) {
    if (isRateLimitError(err) && attempt < 1) {
      await new Promise((r) => setTimeout(r, 300));
      return generatePreparednessReport(alignment, reverseAlignment, suggestions, rewrite, callLLM, attempt + 1);
    }
    const fallback = splitReportSections(String(err instanceof Error ? err.message : err));
    return fallback;
  }
}

export const getPreparednessReport = generatePreparednessReport;

/**
 * End-to-end orchestration: alignment → suggestions → rewrite.
 */
export async function orchestratePreparedness(
  prep: PrepDocument,
  assessment: AssessmentDocument,
  selectedSuggestions: Suggestion[] | null,
  callLLM: LLMCaller
) {
  // Phase 1: Alignment
  const alignment = await getAlignment(prep, assessment, callLLM);

  // Phase 2: Suggestions
  const allSuggestions = await getSuggestions(alignment, callLLM);

  // Phase 2b: Reverse alignment
  const reverseAlignment = await getReverseAlignment(prep, assessment, callLLM);

  // Phase 3: Rewrite (if suggestions were selected)
  let rewrite: RewriteResult | null = null;
  if (selectedSuggestions && selectedSuggestions.length > 0) {
    rewrite = await applySuggestions(assessment, selectedSuggestions, callLLM);
  }

  return {
    alignment,
    reverseAlignment,
    suggestions: allSuggestions,
    rewrite,
  };
}
