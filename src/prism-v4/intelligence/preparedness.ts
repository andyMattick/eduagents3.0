/**
 * Preparedness LLM Orchestration
 *
 * Hybrid pipeline order:
 * 1) alignment (covered/uncovered)
 * 2) suggestions
 * 3) rewrite
 * 4) reverse alignment
 * 5) report
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

const ALIGNMENT_PROMPT_TEMPLATE = `You are an instructional alignment engine.

Your task is to align every ASSESSMENT item to the REVIEW content.

You must output two arrays:
1. coveredItems: assessment items with at least one matching concept in the review
2. uncoveredItems: assessment items with no matching concepts in the review

For each assessment item:
- Extract concepts as objects:
    { "label": "...", "count": <number>, "difficulties": [1-5] }
- Assign difficulty from 1 to 5 (based on the assessment item itself)

If concepts appear in the review:
- Assign prepDifficulty from 1 to 5
- Assign alignment as one of:
    "aligned"
    "slightly_above"
    "misaligned_above"

If no concepts match the review:
- Place the item in uncoveredItems
- Use:
    "concepts": [],
    "prepDifficulty": 0,
    "alignment": "missing_in_prep"

Do NOT include:
- sentences
- long text
- explanations
- examples
- quotes
- markdown
- commentary

Use specific concept labels where possible (examples: ci_proportion_z_interval, ci_mean_t_interval, t_star_selection, interpret_ci_threshold, margin_of_error_proportion, margin_of_error_mean, conditions_for_t_interval, conditions_for_z_interval).

Return ONLY valid JSON.

FORMAT:
{
  "coveredItems": [
    {
      "assessmentItemNumber": 1,
      "concepts": [
        { "label": "ci_proportion_z_interval", "count": 2, "difficulties": [2,3] }
      ],
      "difficulty": 3,
      "prepDifficulty": 2,
      "alignment": "aligned"
    }
  ],
  "uncoveredItems": [
    {
      "assessmentItemNumber": 2,
      "concepts": [],
      "difficulty": 4,
      "prepDifficulty": 0,
      "alignment": "missing_in_prep"
    }
  ]
}`;

const SUGGESTIONS_PROMPT_TEMPLATE = `You are an instructional suggestion engine.

Your task is to analyze ALIGNMENT_DATA and produce structured suggestions.

Rules:
- If alignment = "aligned" -> no suggestion
- If alignment = "slightly_above" -> suggestionType = "add_prep_support"
- If alignment = "misaligned_above" -> suggestionType = "add_prep_support"
- If alignment = "missing_in_prep" -> suggestionType = "add_prep_support" or "remove_question"

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

Your task is to apply FINAL_SUGGESTIONS to the ORIGINAL_ASSESSMENT.

Rules:
- If suggestionType = "remove_question" -> remove the question
- If suggestionType = "add_prep_support" -> keep the question and generate a short prepAddendum label (not a sentence)
- If no suggestion -> leave unchanged

Do NOT include:
- long text
- sentences
- explanations
- examples
- markdown
- commentary

Return ONLY valid JSON.

FORMAT:
{
  "rewrittenAssessment": "...full rewritten test text...",
  "prepAddendum": ["ci_mean_t_interval", "interpret_ci_threshold"]
}`;

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
    "llmErrors": [...],
    "teacherOverrides": [...],
    "modelAnomalies": [...],
    "uncoveredItems": [...],
    "rewriteIssues": [...],
    "reverseAlignmentIssues": [...]
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

function normalizeAlignmentRecord(raw: Record<string, unknown>): AlignmentRecord {
  return {
    assessmentItemNumber: Number(raw.assessmentItemNumber ?? 0),
    concepts: Array.isArray(raw.concepts) ? raw.concepts.map(normalizeConceptItem) : [],
    difficulty: Number(raw.difficulty ?? 1),
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
  alignment: AlignmentResult,
  callLLM: LLMCaller
): Promise<SuggestionsResult> {
  const alignmentJson = JSON.stringify(alignment, null, 2);
  const prompt = `${SUGGESTIONS_PROMPT_TEMPLATE}\n\nALIGNMENT_DATA:\n${alignmentJson}`;

  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 2048 }));
  const parsed = parseJsonWithRepair<SuggestionsResult>(raw);
  return parsed;
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
  const suggestionsJson = JSON.stringify(suggestions, null, 2);
  const prompt = `${REWRITE_PROMPT_TEMPLATE}\n\nORIGINAL_ASSESSMENT:\n${assessmentText}\n\nFINAL_SUGGESTIONS:\n${suggestionsJson}`;

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
  return normalizeReportResult(parsed);
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
    reverseAlignment: ReverseAlignmentResult;
  },
  teacherCorrections: TeacherCorrection[],
  llmErrors: Array<{ phase: string; errorType: string }>,
  callLLM: LLMCaller
): Promise<AdminReportPayload> {
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
  )}\n\nreverseCoverage:\n${JSON.stringify(modelOutput.reverseAlignment.reverseCoverage, null, 2)}`;

  const raw = await withRetry429(() =>
    callLLM(prompt, { maxOutputTokens: 2048, temperature: 0.2 })
  );

  const parsed = parseJsonWithRepair<{ adminReport?: AdminReportPayload }>(raw);
  return (
    parsed.adminReport ?? {
      llmErrors,
      teacherOverrides: [],
      modelAnomalies: [],
      uncoveredItems: modelOutput.alignment.uncoveredItems.map((item) => item.assessmentItemNumber),
      rewriteIssues: [],
      reverseAlignmentIssues: [],
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
  const allSuggestions = await getSuggestions(alignment, callLLM);
  const suggestionsToApply = selectedSuggestions ?? allSuggestions;
  const rewrite = await applySuggestions(assessment, suggestionsToApply, callLLM);
  const reverseAlignment = await getReverseAlignment(prep, assessment, callLLM);
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
