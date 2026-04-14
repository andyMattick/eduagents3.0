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
import {
  renderPreparednessGenerateReviewPrompt,
  renderPreparednessGenerateTestPrompt,
  renderPreparednessPracticePrompt,
  renderPreparednessReviewSnippetPrompt,
  renderPreparednessRewriteToDifficultyPrompt,
  renderPreparednessRewritePrompt,
  renderPreparednessV2AlignmentPrompt,
} from "./preparednessPrompts";

export type LLMCaller = (
  prompt: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
  }
) => Promise<string>;

const REWRITE_PROMPT_TEMPLATE = `You are an assessment rewriting engine. Rewrite the test according to TEACHER_DECISIONS, TEACHER_SUGGESTIONS, and ALIGNMENT_OVERRIDES.

INPUTS:
- ORIGINAL_ASSESSMENT: the full test text.
- TEACHER_DECISIONS: an array of objects:
    {
      "assessmentItemNumber": number,
      "action": "delete_question" OR "add_prep_support"
    }

- TEACHER_SUGGESTIONS: an array of objects:
    {
      "assessmentItemNumber": number | null,
      "suggestionText": string
    }
  Notes:
  - If assessmentItemNumber is null, the suggestion applies to the entire assessment.
  - If a suggestion targets a specific question, apply it only to that question.

- ALIGNMENT_OVERRIDES: an array of objects:
    {
      "assessmentItemNumber": number,
      "correctedAlignment": "aligned" | "slightly_above" | "misaligned_above" | "missing_in_prep"
    }
  Notes:
  - Overrides do NOT change delete/add decisions.
  - Overrides may influence how you interpret teacher suggestions (e.g., if a teacher marks an item as aligned, do not treat it as uncovered).

RULES:
- If action = "delete_question": remove the question entirely.
- If action = "add_prep_support": keep the question AND generate a short concept label for the prep addendum.
- Apply TEACHER_SUGGESTIONS:
  - If suggestion targets a specific question, rewrite only that question.
  - If suggestion is global (assessmentItemNumber = null), apply it to the entire assessment.
  - Suggestions may request: wording changes, difficulty adjustments, context changes, clarity improvements, or structural edits.
- Maintain numbering and formatting consistency.
- Do NOT rewrite unrelated questions.
- Do NOT include explanations, markdown, or commentary.

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "rewrittenAssessment": "full rewritten test text",
  "prepAddendum": ["concept_label_1", "concept_label_2"]
}

NOTES:
- prepAddendum must contain only short concept labels for items where action = "add_prep_support".
- rewrittenAssessment must be clean, continuous test text with deleted items removed and teacher suggestions applied.`;

type RewriteTeacherSuggestion = {
  assessmentItemNumber: number | null;
  suggestionText: string;
};

type AlignmentOverride = {
  assessmentItemNumber: number;
  correctedAlignment: "aligned" | "slightly_above" | "misaligned_above" | "missing_in_prep";
};

type ReviewConcept = {
  conceptLabel: string;
  conceptBlurb: string;
  difficulty: number;
  count: number;
};

type TestConcept = {
  assessmentItemNumber: number;
  conceptLabels: string[];
  testDifficulty: number;
};

type AlignmentDebugInfo = {
  prepConcepts: string[];
  prepDifficulty: number;
  testItems: Array<{
    questionNumber: number;
    questionText: string;
    concepts: string[];
    alignment: "covered" | "uncovered" | "misaligned";
    difficulty: number;
    explanation: string;
  }>;
  coverageSummary: {
    coveredItems: number[];
    misalignedItems: number[];
    uncoveredItems: number[];
    overallAlignment: string;
  };
  teacherSummary: string;
  usedDeterministicFallback: boolean;
  alignmentSource: "llm" | "deterministic";
  sanitizedItemNumbers: number[];
};

type SingleCallAlignmentItem = {
  questionNumber: number;
  questionText: string;
  concepts: string[];
  alignment: "covered" | "uncovered" | "misaligned";
  difficulty: number;
  explanation: string;
};

type SingleCallAlignmentResponse = {
  prepConcepts: string[];
  prepDifficulty: number;
  testItems: SingleCallAlignmentItem[];
  coverageSummary: {
    coveredItems: number[];
    misalignedItems: number[];
    uncoveredItems: number[];
    overallAlignment: string;
  };
  teacherSummary: string;
};

type ConceptRule = {
  label: string;
  difficulty: number;
  patterns: RegExp[];
};

const CONCEPT_RULES: ConceptRule[] = [
  {
    label: "ci_factors_affecting_width",
    difficulty: 2,
    patterns: [/larger confidence interval|smaller confidence interval|wider|narrower|interval width|width/i],
  },
  {
    label: "ci_interpretation",
    difficulty: 3,
    patterns: [/interpret.*confidence interval|does the data suggest|state an appropriate conclusion|evidence/i],
  },
  {
    label: "standard_error",
    difficulty: 2,
    patterns: [/standard error|\bse\b/i],
  },
  {
    label: "margin_of_error",
    difficulty: 2,
    patterns: [/margin of error|\bme\b/i],
  },
  {
    label: "point_estimate",
    difficulty: 2,
    patterns: [/point estimate|point estimator/i],
  },
  {
    label: "confidence_level",
    difficulty: 2,
    patterns: [/confidence level|\b90%\b|\b95%\b|\b97%\b|\b99%\b/i],
  },
  {
    label: "degrees_of_freedom",
    difficulty: 3,
    patterns: [/degrees of freedom|\bdf\b/i],
  },
  {
    label: "ci_proportion",
    difficulty: 3,
    patterns: [/one[-\s]?proportion|proportion.*confidence interval|z\* value.*proportion|z[-\s]?interval.*proportion/i],
  },
  {
    label: "ci_mean_t_interval",
    difficulty: 4,
    patterns: [/t[-\s]?interval|\bt\*\b|student'?s t|mean .* confidence interval/i],
  },
  {
    label: "ci_mean_z_interval",
    difficulty: 3,
    patterns: [/z[-\s]?interval.*mean|known.*standard deviation|population standard deviation.*known|\bz\*\b/i],
  },
  {
    label: "conditions_checking",
    difficulty: 3,
    patterns: [/conditions|random sample|independence|normal|large counts/i],
  },
  {
    label: "sample_size_effect",
    difficulty: 2,
    patterns: [/sample size|survey \d+|\bn\b/i],
  },
  {
    label: "confidence_interval_general",
    difficulty: 2,
    patterns: [/confidence interval|interval estimate/i],
  },
];

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

function deriveAlignmentStatus(testDifficulty: number, prepDifficulty: number): AlignmentRecord["alignment"] {
  if (!Number.isFinite(prepDifficulty) || prepDifficulty <= 0) {
    return "missing_in_prep";
  }

  const gap = testDifficulty - prepDifficulty;
  if (gap <= 0) {
    return "aligned";
  }
  if (gap === 1) {
    return "slightly_above";
  }
  return "misaligned_above";
}

function normalizeAlignmentRecord(raw: Record<string, unknown>): AlignmentRecord {
  const difficulty = Number(raw.testDifficulty ?? raw.difficulty ?? 1);
  const prepDifficulty = Number(raw.prepDifficulty ?? 0);
  return {
    assessmentItemNumber: Number(raw.assessmentItemNumber ?? 0),
    concepts: normalizeConceptItems(raw.concepts, difficulty),
    difficulty,
    prepDifficulty,
    alignment: deriveAlignmentStatus(difficulty, prepDifficulty),
  };
}

function normalizeReviewConcept(raw: unknown): ReviewConcept {
  const c = raw as Record<string, unknown>;
  return {
    conceptLabel: String(c.conceptLabel ?? "").trim(),
    conceptBlurb: String(c.conceptBlurb ?? "").trim(),
    difficulty: Number(c.difficulty ?? 1),
    count: Math.max(0, Number(c.count ?? 1)),
  };
}

function normalizeTestConcept(raw: unknown): TestConcept {
  const c = raw as Record<string, unknown>;
  return {
    assessmentItemNumber: Number(c.assessmentItemNumber ?? 0),
    conceptLabels: Array.isArray(c.conceptLabels)
      ? c.conceptLabels.map((label) => String(label).trim()).filter((label) => label.length > 0)
      : [],
    testDifficulty: Number(c.testDifficulty ?? 1),
  };
}

function normalizeReviewConcepts(raw: unknown): ReviewConcept[] {
  const obj = raw as Record<string, unknown>;
  return Array.isArray(obj.reviewConcepts)
    ? obj.reviewConcepts.map(normalizeReviewConcept).filter((c) => c.conceptLabel.length > 0)
    : [];
}

function normalizeTestConcepts(raw: unknown): TestConcept[] {
  const obj = raw as Record<string, unknown>;
  return Array.isArray(obj.testConcepts)
    ? obj.testConcepts.map(normalizeTestConcept).filter((c) => c.assessmentItemNumber > 0)
    : [];
}

function normalizeSingleCallAlignmentResponse(raw: unknown, assessment: AssessmentDocument): SingleCallAlignmentResponse {
  const obj = raw as Record<string, unknown>;
  const prepConcepts = Array.isArray(obj.prep_concepts)
    ? obj.prep_concepts.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const prepDifficultyRaw = Number(obj.prep_difficulty ?? 1);
  const prepDifficulty = Math.min(5, Math.max(1, Number.isFinite(prepDifficultyRaw) ? prepDifficultyRaw : 1));

  const testItems = Array.isArray(obj.test_items)
    ? obj.test_items.map((entry, index) => {
        const item = entry as Record<string, unknown>;
        const questionNumberRaw = Number(item.question_number ?? assessment.items[index]?.itemNumber ?? index + 1);
        const alignmentRaw = String(item.alignment ?? "uncovered").trim().toLowerCase();
        const alignment = alignmentRaw === "covered" || alignmentRaw === "misaligned" || alignmentRaw === "uncovered"
          ? alignmentRaw
          : "uncovered";
        return {
          questionNumber: Number.isFinite(questionNumberRaw) && questionNumberRaw > 0 ? questionNumberRaw : index + 1,
          questionText: String(item.question_text ?? assessment.items[index]?.text ?? "").trim(),
          concepts: Array.isArray(item.concepts)
            ? item.concepts.map((value) => String(value).trim()).filter(Boolean)
            : [],
          alignment,
          difficulty: Math.min(5, Math.max(1, Number(item.difficulty ?? 1))),
          explanation: String(item.explanation ?? "").trim(),
        } satisfies SingleCallAlignmentItem;
      })
    : [];

  const coverageSummaryRaw = (obj.coverage_summary ?? {}) as Record<string, unknown>;
  const coverageSummary = {
    coveredItems: Array.isArray(coverageSummaryRaw.covered_items)
      ? coverageSummaryRaw.covered_items.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [],
    misalignedItems: Array.isArray(coverageSummaryRaw.misaligned_items)
      ? coverageSummaryRaw.misaligned_items.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [],
    uncoveredItems: Array.isArray(coverageSummaryRaw.uncovered_items)
      ? coverageSummaryRaw.uncovered_items.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [],
    overallAlignment: String(coverageSummaryRaw.overall_alignment ?? "").trim(),
  };

  return {
    prepConcepts,
    prepDifficulty,
    testItems,
    coverageSummary,
    teacherSummary: String(obj.teacher_summary ?? "").trim(),
  };
}

function fallbackSingleCallAlignment(assessment: AssessmentDocument): SingleCallAlignmentResponse {
  return {
    prepConcepts: [],
    prepDifficulty: 1,
    testItems: assessment.items.map((item) => ({
      questionNumber: item.itemNumber,
      questionText: item.text,
      concepts: [],
      alignment: "uncovered",
      difficulty: 1,
      explanation: "Preparedness analysis could not classify this item.",
    })),
    coverageSummary: {
      coveredItems: [],
      misalignedItems: [],
      uncoveredItems: assessment.items.map((item) => item.itemNumber),
      overallAlignment: "Preparedness analysis could not be completed from the model response.",
    },
    teacherSummary: "Preparedness analysis could not be completed from the model response.",
  };
}

function mapSingleCallToAlignmentResult(payload: SingleCallAlignmentResponse, assessment: AssessmentDocument): AlignmentResult {
  const itemMap = new Map(payload.testItems.map((item) => [item.questionNumber, item]));
  const coveredFromSummary = new Set(payload.coverageSummary.coveredItems);
  const misalignedFromSummary = new Set(payload.coverageSummary.misalignedItems);
  const uncoveredFromSummary = new Set(payload.coverageSummary.uncoveredItems);
  const coveredItems: AlignmentRecord[] = [];
  const uncoveredItems: AlignmentRecord[] = [];

  for (const assessmentItem of assessment.items) {
    const payloadItem = itemMap.get(assessmentItem.itemNumber);
    const concepts = (payloadItem?.concepts ?? []).map((concept) => ({
      label: concept,
      count: 1,
      difficulties: payloadItem ? [payloadItem.difficulty] : [],
    }));
    const difficulty = payloadItem?.difficulty ?? 1;
    const alignment = payloadItem?.alignment
      ?? (misalignedFromSummary.has(assessmentItem.itemNumber)
        ? "misaligned"
        : coveredFromSummary.has(assessmentItem.itemNumber)
        ? "covered"
        : uncoveredFromSummary.has(assessmentItem.itemNumber)
        ? "uncovered"
        : "uncovered");

    if (alignment === "covered" || alignment === "misaligned") {
      coveredItems.push({
        assessmentItemNumber: assessmentItem.itemNumber,
        concepts,
        difficulty,
        prepDifficulty: payload.prepDifficulty,
        alignment: alignment === "misaligned" ? "misaligned_above" : "aligned",
      });
      continue;
    }

    uncoveredItems.push({
      assessmentItemNumber: assessmentItem.itemNumber,
      concepts,
      difficulty,
      prepDifficulty: 0,
      alignment: "missing_in_prep",
    });
  }

  return { coveredItems, uncoveredItems };
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(new RegExp(pattern.source, `${pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`}`));
  return matches?.length ?? 0;
}

function extractReviewConceptsHeuristic(rawText: string): ReviewConcept[] {
  const source = rawText || "";
  const concepts: ReviewConcept[] = [];
  for (const rule of CONCEPT_RULES) {
    const count = rule.patterns.reduce((sum, pattern) => sum + countMatches(source, pattern), 0);
    if (count > 0) {
      concepts.push({
        conceptLabel: rule.label,
        conceptBlurb: rule.label.replace(/_/g, " "),
        difficulty: rule.difficulty,
        count,
      });
    }
  }
  return concepts;
}

function inferDifficulty(text: string, labels: string[]): number {
  const byConcept = labels
    .map((label) => CONCEPT_RULES.find((rule) => rule.label === label)?.difficulty ?? 2)
    .reduce((max, value) => Math.max(max, value), 1);

  if (/interpret|explain|conclusion|suggest/i.test(text)) {
    return Math.max(byConcept, 3);
  }
  if (/construct|calculate|compute|find/i.test(text)) {
    return Math.max(byConcept, 2);
  }

  return byConcept;
}

function extractTestConceptsHeuristic(assessment: AssessmentDocument): TestConcept[] {
  return assessment.items.map((item, idx) => {
    const labels = CONCEPT_RULES
      .filter((rule) => rule.patterns.some((pattern) => pattern.test(item.text)))
      .map((rule) => rule.label);

    const conceptLabels = labels.length > 0
      ? labels
      : /confidence interval|interval/i.test(item.text)
      ? ["confidence_interval_general"]
      : [];

    return {
      assessmentItemNumber: idx + 1,
      conceptLabels,
      testDifficulty: Math.min(5, Math.max(1, inferDifficulty(item.text, conceptLabels))),
    };
  });
}

function sanitizeTestConcepts(testConcepts: TestConcept[], assessment: AssessmentDocument): TestConcept[] {
  const validNumbers = new Set(assessment.items.map((item) => item.itemNumber));
  const filtered = testConcepts.filter((concept) => validNumbers.has(concept.assessmentItemNumber));
  if (filtered.length > 0) {
    return filtered;
  }
  return extractTestConceptsHeuristic(assessment);
}

function computeAlignmentLocally(reviewConcepts: ReviewConcept[], testConcepts: TestConcept[]): AlignmentResult {
  const reviewMap = new Map(reviewConcepts.map((concept) => [concept.conceptLabel, concept]));
  const coveredItems: AlignmentRecord[] = [];
  const uncoveredItems: AlignmentRecord[] = [];

  for (const item of testConcepts) {
    const labels = item.conceptLabels;
    const missing = labels.filter((label) => !reviewMap.has(label));

    if (labels.length === 0 || missing.length > 0) {
      uncoveredItems.push({
        assessmentItemNumber: item.assessmentItemNumber,
        concepts: [],
        difficulty: item.testDifficulty,
        prepDifficulty: 0,
        alignment: "missing_in_prep",
      });
      continue;
    }

    const matched = labels
      .map((label) => reviewMap.get(label))
      .filter((concept): concept is ReviewConcept => Boolean(concept));

    const prepDifficulty = matched.length > 0
      ? matched.reduce((sum, concept) => sum + concept.difficulty, 0) / matched.length
      : 0;

    coveredItems.push({
      assessmentItemNumber: item.assessmentItemNumber,
      concepts: matched.map((concept) => ({
        label: concept.conceptLabel,
        count: concept.count,
        difficulties: [concept.difficulty],
      })),
      difficulty: item.testDifficulty,
      prepDifficulty,
      alignment: deriveAlignmentStatus(item.testDifficulty, prepDifficulty),
    });
  }

  return {
    coveredItems,
    uncoveredItems,
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
        const difficulty = Number(c.difficulty ?? 1);
        const prepDifficulty = Number(c.prepDifficulty ?? 1);
        const derivedAlignment = deriveAlignmentStatus(difficulty, prepDifficulty);
        return {
          assessmentItemNumber: Number(c.assessmentItemNumber ?? 0),
          concepts: Array.isArray(c.concepts) ? c.concepts.map(normalizeConceptItem) : [],
          difficulty,
          prepDifficulty,
          alignment:
            derivedAlignment === "missing_in_prep"
              ? "aligned"
              : derivedAlignment,
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
  const assessmentText = assessment.items
    .map((item) => `${item.itemNumber}. ${item.text}`)
    .join("\n\n");
  const prompt = renderPreparednessV2AlignmentPrompt(prep.rawText, assessmentText);
  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 4096, temperature: 0.2 }));

  let parsed = fallbackSingleCallAlignment(assessment);
  let usedDeterministicFallback = false;
  try {
    parsed = normalizeSingleCallAlignmentResponse(parseJsonWithRepair<Record<string, unknown>>(raw), assessment);
    if (parsed.testItems.length === 0) {
      parsed = fallbackSingleCallAlignment(assessment);
      usedDeterministicFallback = true;
    }
  } catch {
    parsed = fallbackSingleCallAlignment(assessment);
    usedDeterministicFallback = true;
  }

  const normalized = mapSingleCallToAlignmentResult(parsed, assessment);
  const sanitizedItemNumbers = parsed.testItems.map((item) => item.questionNumber).sort((a, b) => a - b);

  return {
    ...normalized,
    debug: {
      prepConcepts: parsed.prepConcepts,
      prepDifficulty: parsed.prepDifficulty,
      testItems: parsed.testItems,
      coverageSummary: parsed.coverageSummary,
      teacherSummary: parsed.teacherSummary,
      usedDeterministicFallback,
      alignmentSource: usedDeterministicFallback ? "deterministic" : "llm",
      sanitizedItemNumbers,
    },
  } as AlignmentResult;
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

export async function generatePreparednessReviewSnippet(
  questionText: string,
  concepts: string[],
  callLLM: LLMCaller
): Promise<{ review_snippet: string }> {
  const prompt = renderPreparednessReviewSnippetPrompt(questionText, concepts.join(", "));
  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 1024, temperature: 0.2 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  return {
    review_snippet: String(parsed.review_snippet ?? "").trim(),
  };
}

export async function rewritePreparednessQuestion(
  questionText: string,
  teacherNotes: string,
  callLLM: LLMCaller
): Promise<{ rewritten_question: string }> {
  const prompt = renderPreparednessRewritePrompt(questionText, teacherNotes);
  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 1024, temperature: 0.2 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  return {
    rewritten_question: String(parsed.rewritten_question ?? "").trim(),
  };
}

export async function rewritePreparednessQuestionToDifficulty(
  questionText: string,
  targetDifficulty: number,
  callLLM: LLMCaller
): Promise<{ rewritten_question: string }> {
  const prompt = renderPreparednessRewriteToDifficultyPrompt(questionText, targetDifficulty);
  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 1024, temperature: 0.2 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  return {
    rewritten_question: String(parsed.rewritten_question ?? "").trim(),
  };
}

export async function generatePreparednessPracticeItem(
  questionText: string,
  concepts: string[],
  callLLM: LLMCaller
): Promise<{ practice_question: string; answer: string; explanation: string }> {
  const prompt = renderPreparednessPracticePrompt(questionText, concepts.join(", "));
  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 1536, temperature: 0.2 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);
  return {
    practice_question: String(parsed.practice_question ?? "").trim(),
    answer: String(parsed.answer ?? "").trim(),
    explanation: String(parsed.explanation ?? "").trim(),
  };
}

export async function generatePreparednessReviewPacket(
  testItems: Array<{ question_number: number; question_text: string; concepts?: string[]; covered?: boolean; difficulty?: number; explanation?: string }>,
  callLLM: LLMCaller
): Promise<{ review_sections: Array<{ title: string; explanation: string; example?: string }>; summary: string }> {
  const prompt = renderPreparednessGenerateReviewPrompt(JSON.stringify(testItems, null, 2));
  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 3072, temperature: 0.2 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);

  return {
    review_sections: Array.isArray(parsed.review_sections)
      ? parsed.review_sections.map((entry) => {
          const section = entry as Record<string, unknown>;
          return {
            title: String(section.title ?? "").trim(),
            explanation: String(section.explanation ?? "").trim(),
            example: String(section.example ?? "").trim() || undefined,
          };
        }).filter((section) => section.title && section.explanation)
      : [],
    summary: String(parsed.summary ?? "").trim(),
  };
}

export async function generatePreparednessTestFromReview(
  reviewConcepts: Array<{ title: string; explanation?: string; example?: string } | string>,
  callLLM: LLMCaller
): Promise<{ test_items: Array<{ question_number: number; question_text: string; answer: string; explanation: string }>; test_summary: string }> {
  const prompt = renderPreparednessGenerateTestPrompt(JSON.stringify(reviewConcepts, null, 2));
  const raw = await withRetry429(() => callLLM(prompt, { maxOutputTokens: 3072, temperature: 0.2 }));
  const parsed = parseJsonWithRepair<Record<string, unknown>>(raw);

  return {
    test_items: Array.isArray(parsed.test_items)
      ? parsed.test_items.map((entry, index) => {
          const item = entry as Record<string, unknown>;
          const number = Number(item.question_number ?? index + 1);
          return {
            question_number: Number.isFinite(number) && number > 0 ? number : index + 1,
            question_text: String(item.question_text ?? "").trim(),
            answer: String(item.answer ?? "").trim(),
            explanation: String(item.explanation ?? "").trim(),
          };
        }).filter((item) => item.question_text)
      : [],
    test_summary: String(parsed.test_summary ?? "").trim(),
  };
}

export async function applySuggestions(
  assessment: AssessmentDocument,
  suggestions: Suggestion[],
  callLLM: LLMCaller,
  options?: {
    teacherSuggestions?: RewriteTeacherSuggestion[];
    alignmentOverrides?: AlignmentOverride[];
  }
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
  const teacherSuggestions = options?.teacherSuggestions ?? [];
  const alignmentOverrides = options?.alignmentOverrides ?? [];
  const decisionsJson = JSON.stringify(teacherDecisions, null, 2);
  const teacherSuggestionsJson = JSON.stringify(teacherSuggestions, null, 2);
  const alignmentOverridesJson = JSON.stringify(alignmentOverrides, null, 2);
  const prompt = `${REWRITE_PROMPT_TEMPLATE}\n\nORIGINAL_ASSESSMENT:\n${assessmentText}\n\nTEACHER_DECISIONS:\n${decisionsJson}\n\nTEACHER_SUGGESTIONS:\n${teacherSuggestionsJson}\n\nALIGNMENT_OVERRIDES:\n${alignmentOverridesJson}`;

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
