/**
 * Preparedness LLM Orchestration
 *
 * Simplified pipeline order:
 * 1) alignment (covered/uncovered)
 * 2) suggestions (deterministic from uncovered items)
 * 3) rewrite (teacher delete/add decisions)
 * 4) optional addendum merge into review
 */

import {
  type AlignmentResult,
  type AlignmentRecord,
  type ConceptItem,
  type SuggestionsResult,
  type RewriteResult,
  type ReverseAlignmentResult,
  type ReverseAlignmentRecord,
  type CoveredReportItem,
  type UncoveredReportItem,
  type TeacherCorrection,
  type CorrectedPreparednessResult,
  type AdminReportPayload,
  type AdminReportEnvelope,
  type PreparednessReportResult,
  type AssessmentDocument,
  type PrepDocument,
  type Suggestion,
} from "../schema/domain/Preparedness";

export type LLMCaller = (
  prompt: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
  }
) => Promise<string>;

const ALIGNMENT_PROMPT_TEMPLATE = `You are an instructional alignment engine. Compare ASSESSMENT_ITEMS to PREP_TEXT and determine which test questions are covered by the review and which are not.

Your output must contain TWO arrays only:
{
  "coveredItems": [...],
  "uncoveredItems": [...]
}

DEFINITIONS:
- A concept is “covered” if the prep text meaningfully teaches, explains, or practices it.
- A concept is “uncovered” if the prep text does not teach it at all.
- Difficulty is a 1–5 scale:
  1 = very basic recall
  2 = basic computation or direct application
  3 = moderate multi-step reasoning
  4 = advanced reasoning or abstraction
  5 = very advanced multi-concept integration

ALIGNMENT RULES:
- If the prep text covers the concept -> item goes in coveredItems.
- If the prep text does NOT cover the concept -> item goes in uncoveredItems.
- For covered items, include:
  - assessmentItemNumber
  - concepts with counts (e.g., "ci_mean_t_interval": 2)
  - prepDifficulty (1–5)
  - testDifficulty (1–5)
  - alignment:
      "aligned" (testDifficulty <= prepDifficulty)
      "slightly_above" (testDifficulty = prepDifficulty + 1)
      "misaligned_above" (testDifficulty >= prepDifficulty + 2)

FOR UNCOVERED ITEMS:
- concepts = []
- prepDifficulty = 0
- alignment = "missing_in_prep"

RESPONSE FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "coveredItems": [
    {
      "assessmentItemNumber": 1,
      "concepts": { "concept_label": count },
      "prepDifficulty": 2,
      "testDifficulty": 3,
      "alignment": "aligned"
    }
  ],
  "uncoveredItems": [
    {
      "assessmentItemNumber": 5,
      "concepts": {},
      "prepDifficulty": 0,
      "testDifficulty": 3,
      "alignment": "missing_in_prep"
    }
  ]
}

Return ONLY valid JSON. No explanations, no markdown, no commentary.`;

const REWRITE_PROMPT_TEMPLATE = `You are an assessment rewriting engine. Rewrite the test according to TEACHER_DECISIONS.

INPUTS:
- ORIGINAL_ASSESSMENT: the full test text
- TEACHER_DECISIONS: an array of objects:
    {
      "assessmentItemNumber": 8,
      "action": "delete_question" OR "add_prep_support"
    }

RULES:
- If action = "delete_question": remove the question entirely.
- If action = "add_prep_support": keep the question AND generate a short concept label for the prep addendum.
- All other questions remain unchanged.

OUTPUT:
Return ONLY valid JSON with this structure:
{
  "rewrittenAssessment": "full rewritten test text",
  "prepAddendum": ["concept_label_1", "concept_label_2"]
}

NOTES:
- prepAddendum must contain only short concept labels (e.g., "ci_mean_t_interval").
- Do NOT include explanations, markdown, or commentary.
- rewrittenAssessment must be clean, continuous test text with deleted items removed.`;

const ADDENDUM_MERGE_PROMPT_TEMPLATE = `You are a review-updating engine. Merge ADDENDUM_CONCEPTS into REVIEW_TEXT.

GOAL:
Insert short, clear instructional explanations for each concept in ADDENDUM_CONCEPTS into the appropriate place in REVIEW_TEXT. If no natural place exists, add a short section at the end titled "Additional Concepts".

RULES:
- Keep the teacher's writing style.
- Keep the review structure intact.
- Add only concise, teacher-friendly explanations (2-4 sentences per concept).
- Do NOT rewrite unrelated parts of the review.

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "updatedReview": "full updated review text"
}

No commentary, no markdown, no extra fields.`;

const REVERSE_ALIGNMENT_PROMPT_TEMPLATE = `You are an instructional alignment engine.

Your task is to analyze how each REVIEW item connects to the ASSESSMENT.

Output one array: reverseCoverage.

For each review item:
- Extract concepts as objects:
    { "label": "...", "count": <number>, "difficulties": [1-5] }
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
{
  "reverseCoverage": [
    {
      "prepItemNumber": 1,
      "concepts": [
        { "label": "ci_proportion_z_interval", "count": 2, "difficulties": [2,3] }
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
  ]
}`;

const PREPAREDNESS_REPORT_PROMPT_TEMPLATE = `You are an instructional report generator.

Your task is to produce a structured Preparedness Report using:
- coveredItems:
<<<COVERED_ITEMS_JSON>>>
- uncoveredItems:
<<<UNCOVERED_ITEMS_JSON>>>
- suggestions:
<<<SUGGESTIONS_JSON>>>
- rewriteResults:
<<<REWRITE_RESULTS_JSON>>>
- reverseCoverage:
<<<REVERSE_COVERAGE_JSON>>>

Use ONLY short labels. No sentences.

SECTION 1: Covered Assessment Items
- assessmentItemNumber
- concepts
- difficulty
- prepDifficulty
- alignment
- teacherAction

SECTION 2: Uncovered Assessment Items
- assessmentItemNumber
- difficulty
- concepts (empty array)
- alignment = "missing_in_prep"

SECTION 3: Prep Addendum
- list of prepAddendum labels

SECTION 4: Reverse Coverage
- reverseCoverage array

Return ONLY valid JSON.

FORMAT:
{
  "covered": [...],
  "uncovered": [...],
  "prepAddendum": [...],
  "reverseCoverage": [...]
}`;

const TEACHER_INPUT_PROMPT_TEMPLATE = `You are an instructional correction engine.

Your task is to apply TEACHER_CORRECTIONS to the MODEL_OUTPUT.

Teacher corrections override all model decisions.

For each correction:
- Replace alignment, concepts, difficulty, or suggestionType with teacher-provided values.
- Recompute prepAddendum if concepts change.
- Ensure rewrittenAssessment honors teacher overrides.

Return ONLY valid JSON.

FORMAT:
{
  "correctedAlignment": {
    "coveredItems": [...],
    "uncoveredItems": [...]
  },
  "correctedSuggestions": [...],
  "correctedRewrite": {
    "rewrittenAssessment": "...",
    "prepAddendum": [...]
  }
}`;

const ADMIN_REPORT_PROMPT_TEMPLATE = `You are an instructional audit engine.

Your task is to generate an ADMIN_REPORT using:
- modelOutput
- teacherCorrections
- llmErrors
- uncoveredItems
- reverseCoverage

Identify:
- llmErrors
- teacherOverrides
- modelAnomalies
- uncoveredItems
- rewriteIssues
- reverseAlignmentIssues

Return ONLY valid JSON.

FORMAT:
{
  "adminReport": {
    "preparedness": {
      "llmErrors": [...],
      "teacherOverrides": [...],
      "modelAnomalies": [...],
      "uncoveredItems": [...],
      "rewriteIssues": [...],
      "reverseAlignmentIssues": [...]
    },
    "otherSystemAreas": {}
  }
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

async function withRetry429<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  let delay = 300;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const is429 = String(err instanceof Error ? err.message : err).includes("429");
      if (!is429 || attempt >= maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
      delay *= 2;
    }
  }
}

function normalizeConceptItem(raw: unknown): ConceptItem {
  const c = raw as Record<string, unknown>;
  return {
    label: String(c.label ?? ""),
    count: Math.max(0, Number(c.count ?? 1)),
    difficulties: Array.isArray(c.difficulties)
      ? c.difficulties.map((d) => Number(d)).filter((d) => Number.isFinite(d))
      : [],
  };
}

function normalizeConceptItems(raw: unknown, fallbackDifficulty: number): ConceptItem[] {
  if (Array.isArray(raw)) {
    return raw.map(normalizeConceptItem);
  }

  if (raw && typeof raw === "object") {
    const entries = Object.entries(raw as Record<string, unknown>);
    return entries.map(([label, count]) => ({
      label,
      count: Math.max(0, Number(count ?? 1)),
      difficulties: Number.isFinite(fallbackDifficulty) ? [fallbackDifficulty] : [],
    }));
  }

  return [];
}

function normalizeAlignmentRecord(raw: Record<string, unknown>): AlignmentRecord {
  const difficulty = Number(raw.testDifficulty ?? raw.difficulty ?? 1);
  return {
    assessmentItemNumber: Number(raw.assessmentItemNumber ?? 0),
    concepts: normalizeConceptItems(raw.concepts, difficulty),
    difficulty,
    prepDifficulty: Number(raw.prepDifficulty ?? 0),
    alignment: String(raw.alignment ?? "missing_in_prep") as AlignmentRecord["alignment"],
  };
}

function normalizeAlignmentResult(raw: unknown): AlignmentResult {
  const obj = raw as Record<string, unknown>;
  const coveredItems = Array.isArray(obj.coveredItems)
    ? obj.coveredItems.map((item) => normalizeAlignmentRecord(item as Record<string, unknown>))
    : [];

  const uncoveredItems = Array.isArray(obj.uncoveredItems)
    ? obj.uncoveredItems.map((item) => {
        const normalized = normalizeAlignmentRecord(item as Record<string, unknown>);
        return {
          ...normalized,
          concepts: [],
          prepDifficulty: 0,
          alignment: "missing_in_prep" as const,
        };
      })
    : [];

  return { coveredItems, uncoveredItems };
}

function normalizeReverseAlignmentResult(raw: unknown): ReverseAlignmentResult {
  const obj = raw as Record<string, unknown>;
  const reverseCoverage = Array.isArray(obj.reverseCoverage)
    ? obj.reverseCoverage.map((item) => {
        const entry = item as Record<string, unknown>;
        return {
          prepItemNumber: Number(entry.prepItemNumber ?? 0),
          concepts: Array.isArray(entry.concepts) ? entry.concepts.map(normalizeConceptItem) : [],
          prepDifficulty: Number(entry.prepDifficulty ?? 1),
          testEvidence: Array.isArray(entry.testEvidence)
            ? entry.testEvidence.map((ev) => {
                const evidence = ev as Record<string, unknown>;
                return {
                  assessmentItemNumber: Number(evidence.assessmentItemNumber ?? 0),
                  difficulty: Number(evidence.difficulty ?? 1),
                  alignment: String(evidence.alignment ?? "aligned") as ReverseAlignmentResult["reverseCoverage"][number]["testEvidence"][number]["alignment"],
                };
              })
            : [],
        };
      })
    : [];
  return { reverseCoverage };
}

function normalizeRewriteResult(raw: Record<string, unknown>): RewriteResult {
  const rewrittenAssessment = String(raw.rewrittenAssessment ?? "");
  const prepAddendum = Array.isArray(raw.prepAddendum)
    ? raw.prepAddendum.map((v) => String(v))
    : [];
  return { rewrittenAssessment, prepAddendum };
}

function normalizeReportResult(raw: Record<string, unknown>): PreparednessReportResult {
  const covered = Array.isArray(raw.covered)
    ? raw.covered.map((item) => {
        const c = item as Record<string, unknown>;
        const alignment = String(c.alignment ?? "aligned");
        return {
          assessmentItemNumber: Number(c.assessmentItemNumber ?? 0),
          concepts: Array.isArray(c.concepts) ? c.concepts.map(normalizeConceptItem) : [],
          difficulty: Number(c.difficulty ?? 1),
          prepDifficulty: Number(c.prepDifficulty ?? 1),
          alignment:
            alignment === "slightly_above" || alignment === "misaligned_above"
              ? alignment
              : "aligned",
          teacherAction:
            String(c.teacherAction ?? "no_action") === "remove_question"
              ? "remove_question"
              : String(c.teacherAction ?? "no_action") === "add_prep_support"
              ? "add_prep_support"
              : "no_action",
        } satisfies CoveredReportItem;
      })
    : [];

  const uncovered = Array.isArray(raw.uncovered)
    ? raw.uncovered.map((item) => {
        const u = item as Record<string, unknown>;
        return {
          assessmentItemNumber: Number(u.assessmentItemNumber ?? 0),
          concepts: [] as [],
          difficulty: Number(u.difficulty ?? 1),
          prepDifficulty: 0 as const,
          alignment: "missing_in_prep" as const,
        } satisfies UncoveredReportItem;
      })
    : [];

  const prepAddendum = Array.isArray(raw.prepAddendum)
    ? raw.prepAddendum.map((v) => String(v))
    : [];

  const reverseCoverage = Array.isArray(raw.reverseCoverage)
    ? raw.reverseCoverage.map((item) => {
        const entry = item as Record<string, unknown>;
        return {
          prepItemNumber: Number(entry.prepItemNumber ?? 0),
          concepts: Array.isArray(entry.concepts) ? entry.concepts.map(normalizeConceptItem) : [],
          prepDifficulty: Number(entry.prepDifficulty ?? 1),
          testEvidence: Array.isArray(entry.testEvidence)
            ? entry.testEvidence.map((ev) => {
                const evidence = ev as Record<string, unknown>;
                const alignment = String(evidence.alignment ?? "aligned");
                return {
                  assessmentItemNumber: Number(evidence.assessmentItemNumber ?? 0),
                  difficulty: Number(evidence.difficulty ?? 1),
                  alignment:
                    alignment === "review_above_test" ||
                    alignment === "review_below_test" ||
                    alignment === "not_used_in_test"
                      ? alignment
                      : "aligned",
                };
              })
            : [],
        } satisfies ReverseAlignmentRecord;
      })
    : [];

  return {
    covered,
    uncovered,
    prepAddendum,
    reverseCoverage,
    fullText: JSON.stringify({ covered, uncovered, prepAddendum, reverseCoverage }),
  };
}

export async function getAlignment(
  prep: PrepDocument,
  assessment: AssessmentDocument,
  callLLM: LLMCaller
): Promise<AlignmentResult> {
  const assessmentText = assessment.items.map((item) => `${item.itemNumber}. ${item.text}`).join("\n");
  const prompt = `${ALIGNMENT_PROMPT_TEMPLATE}\n\nREVIEW_CONTENT:\n${prep.rawText}\n\nASSESSMENT:\n${assessmentText}`;

  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 2048 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  return normalizeAlignmentResult(parsed);
}

export async function getSuggestions(
  alignment: AlignmentResult
): Promise<SuggestionsResult> {
  return alignment.uncoveredItems.map((item) => ({
    assessmentItemNumber: item.assessmentItemNumber,
    issue: "missing_in_prep" as const,
    suggestionType: "add_prep_support" as const,
  }));
}

export async function applySuggestions(
  assessment: AssessmentDocument,
  suggestions: Suggestion[],
  callLLM: LLMCaller
): Promise<RewriteResult> {
  if (suggestions.length === 0) {
    const fallbackText = assessment.items.map((item) => `${item.itemNumber}. ${item.text}`).join("\n\n");
    return { rewrittenAssessment: fallbackText, prepAddendum: [] };
  }

  const assessmentText = assessment.items.map((item) => `${item.itemNumber}. ${item.text}`).join("\n");
  const teacherDecisions = suggestions.map((suggestion) => ({
    assessmentItemNumber: suggestion.assessmentItemNumber,
    action: suggestion.suggestionType === "remove_question" ? "delete_question" : "add_prep_support",
  }));
  const decisionsJson = JSON.stringify(teacherDecisions, null, 2);
  const prompt = `${REWRITE_PROMPT_TEMPLATE}\n\nORIGINAL_ASSESSMENT:\n${assessmentText}\n\nTEACHER_DECISIONS:\n${decisionsJson}`;

  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 2048 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  return normalizeRewriteResult(parsed);
}

export async function getReverseAlignment(
  prep: PrepDocument,
  assessment: AssessmentDocument,
  callLLM: LLMCaller
): Promise<ReverseAlignmentResult> {
  const assessmentText = assessment.items.map((item) => `${item.itemNumber}. ${item.text}`).join("\n");
  const prompt = `${REVERSE_ALIGNMENT_PROMPT_TEMPLATE}\n\nREVIEW_DOCUMENT:\n${prep.rawText}\n\nASSESSMENT:\n${assessmentText}`;

  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 2048 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  return normalizeReverseAlignmentResult(parsed);
}

export async function generatePreparednessReport(
  alignment: AlignmentResult,
  reverseAlignment: ReverseAlignmentResult,
  suggestions: SuggestionsResult,
  rewrite: RewriteResult,
  callLLM: LLMCaller
): Promise<PreparednessReportResult> {
  const prompt = PREPAREDNESS_REPORT_PROMPT_TEMPLATE
    .replace("<<<COVERED_ITEMS_JSON>>>", JSON.stringify(alignment.coveredItems, null, 2))
    .replace("<<<UNCOVERED_ITEMS_JSON>>>", JSON.stringify(alignment.uncoveredItems, null, 2))
    .replace("<<<SUGGESTIONS_JSON>>>", JSON.stringify(suggestions, null, 2))
    .replace("<<<REWRITE_RESULTS_JSON>>>", JSON.stringify(rewrite, null, 2))
    .replace("<<<REVERSE_COVERAGE_JSON>>>", JSON.stringify(reverseAlignment.reverseCoverage, null, 2));

  const raw = await withRetry429(() =>
    callLLM(prompt, { maxOutputTokens: 2048, temperature: 0.2 })
  );
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  const normalized = normalizeReportResult(parsed);
  return {
    ...normalized,
    reverseCoverage: reverseAlignment.reverseCoverage ?? [],
    fullText: JSON.stringify({
      covered: normalized.covered,
      uncovered: normalized.uncovered,
      prepAddendum: normalized.prepAddendum,
    }),
  };
}

export async function mergeAddendumIntoReview(
  reviewText: string,
  addendumConcepts: string[],
  callLLM: LLMCaller
): Promise<{ updatedReview: string }> {
  if (addendumConcepts.length === 0) {
    return { updatedReview: reviewText };
  }

  const prompt = `${ADDENDUM_MERGE_PROMPT_TEMPLATE}\n\nREVIEW_TEXT:\n${reviewText}\n\nADDENDUM_CONCEPTS:\n${JSON.stringify(addendumConcepts, null, 2)}`;
  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 2048 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  return {
    updatedReview: String(parsed.updatedReview ?? reviewText),
  };
}

export async function applyTeacherInput(
  alignment: AlignmentResult,
  suggestions: SuggestionsResult,
  rewrite: RewriteResult,
  teacherCorrections: TeacherCorrection[],
  callLLM: LLMCaller
): Promise<CorrectedPreparednessResult> {
  const prompt = `${TEACHER_INPUT_PROMPT_TEMPLATE}\n\nMODEL_OUTPUT:\n${JSON.stringify(
    { alignment, suggestions, rewrite },
    null,
    2
  )}\n\nTEACHER_CORRECTIONS:\n${JSON.stringify(teacherCorrections, null, 2)}`;

  const raw = await withRetry429(() =>
    callLLM(prompt, { maxOutputTokens: 2048, temperature: 0.2 })
  );

  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  const correctedAlignmentRaw = parsed.correctedAlignment as Record<string, unknown> | undefined;
  const correctedSuggestionsRaw = parsed.correctedSuggestions as unknown[] | undefined;
  const correctedRewriteRaw = parsed.correctedRewrite as Record<string, unknown> | undefined;

  return {
    correctedAlignment: correctedAlignmentRaw
      ? normalizeAlignmentResult(correctedAlignmentRaw)
      : {
          coveredItems: alignment.coveredItems,
          uncoveredItems: alignment.uncoveredItems,
        },
    correctedSuggestions: Array.isArray(correctedSuggestionsRaw)
      ? (correctedSuggestionsRaw as CorrectedPreparednessResult["correctedSuggestions"])
      : (suggestions as CorrectedPreparednessResult["correctedSuggestions"]),
    correctedRewrite: correctedRewriteRaw
      ? normalizeRewriteResult(correctedRewriteRaw)
      : rewrite,
  };
}

export async function generateAdminReport(
  modelOutput: {
    alignment: AlignmentResult;
    suggestions: SuggestionsResult;
    rewrite: RewriteResult;
    reverseAlignment?: ReverseAlignmentResult;
  },
  teacherCorrections: TeacherCorrection[],
  llmErrors: Array<{ phase: string; errorType: string }>,
  callLLM: LLMCaller
): Promise<AdminReportEnvelope> {
  const prompt = `${ADMIN_REPORT_PROMPT_TEMPLATE}\n\nmodelOutput:\n${JSON.stringify(
    modelOutput,
    null,
    2
  )}\n\nteacherCorrections:\n${JSON.stringify(teacherCorrections, null, 2)}\n\nllmErrors:\n${JSON.stringify(
    llmErrors,
    null,
    2
  )}\n\nuncoveredItems:\n${JSON.stringify(
    modelOutput.alignment.uncoveredItems.map((item) => item.assessmentItemNumber),
    null,
    2
  )}\n\nreverseCoverage:\n${JSON.stringify(modelOutput.reverseAlignment?.reverseCoverage ?? [], null, 2)}`;

  const raw = await withRetry429(() =>
    callLLM(prompt, { maxOutputTokens: 2048, temperature: 0.2 })
  );

  const parsed = parseJsonWithRepair<{ adminReport?: { preparedness?: AdminReportPayload; otherSystemAreas?: Record<string, unknown> } }>(raw);
  const fallbackPreparedness: AdminReportPayload = {
    llmErrors,
    teacherOverrides: [],
    modelAnomalies: [],
    uncoveredItems: modelOutput.alignment.uncoveredItems.map((item) => item.assessmentItemNumber),
    rewriteIssues: [],
    reverseAlignmentIssues: [],
  };

  return (
    parsed.adminReport
      ? {
          adminReport: {
            preparedness: parsed.adminReport.preparedness ?? fallbackPreparedness,
            otherSystemAreas: parsed.adminReport.otherSystemAreas,
          },
        }
      : {
          adminReport: {
            preparedness: fallbackPreparedness,
            otherSystemAreas: {},
          },
        }
  );
}

export const getPreparednessReport = generatePreparednessReport;

export async function orchestratePreparedness(
  prep: PrepDocument,
  assessment: AssessmentDocument,
  selectedSuggestions: Suggestion[] | null,
  callLLM: LLMCaller
) {
  const alignment = await getAlignment(prep, assessment, callLLM);
  const allSuggestions = await getSuggestions(alignment);
  const suggestionsToApply = selectedSuggestions ?? allSuggestions;
  const rewrite = await applySuggestions(assessment, suggestionsToApply, callLLM);
  const reverseAlignment: ReverseAlignmentResult = { reverseCoverage: [] };
  const report = await getPreparednessReport(
    alignment,
    reverseAlignment,
    suggestionsToApply,
    rewrite,
    callLLM
  );

  return {
    alignment,
    suggestions: allSuggestions,
    rewrite,
    reverseAlignment,
    report,
  };
}
