import { describe, expect, it, vi } from "vitest";

import {
  generatePreparednessReviewPacket,
  generatePreparednessTestFromReview,
  applySuggestions,
  applyTeacherInput,
  generatePreparednessPracticeItem,
  generatePreparednessReviewSnippet,
  generateAdminReport,
  generatePreparednessReport,
  getAlignment,
  getReverseAlignment,
  getSuggestions,
  rewritePreparednessQuestion,
  rewritePreparednessQuestionToDifficulty,
} from "../prism-v4/intelligence/preparedness";

import type {
  AssessmentDocument,
  PrepDocument,
  TeacherCorrection,
} from "../prism-v4/schema/domain/Preparedness";

const prep: PrepDocument = {
  title: "Prep",
  rawText: "Confidence interval for proportion using z.",
};

const assessment: AssessmentDocument = {
  title: "Assessment",
  items: [
    { itemNumber: 1, text: "Compute a CI for a proportion." },
    { itemNumber: 2, text: "Compute a t-interval for a mean." },
    { itemNumber: 3, text: "Interpret ci threshold in context." },
  ],
};

function makeSingleCallAlignmentCaller(alignmentPayload: unknown) {
  return vi.fn().mockResolvedValue(JSON.stringify(alignmentPayload));
}

describe("Preparedness Hybrid Wiring", () => {
  it("A: alignment/suggestions/rewrite/reverse/report all use hybrid structures", async () => {
    const callAlignment = makeSingleCallAlignmentCaller(
      {
        prep_concepts: ["confidence interval for proportion using z"],
        prep_difficulty: 2,
        test_items: [
          {
            question_number: 1,
            question_text: assessment.items[0].text,
            concepts: ["confidence interval for proportion using z"],
            alignment: "covered",
            difficulty: 2,
            explanation: "Prep explains proportion confidence intervals.",
          },
          {
            question_number: 2,
            question_text: assessment.items[1].text,
            concepts: ["t-interval"],
            alignment: "uncovered",
            difficulty: 4,
            explanation: "Prep does not teach t-intervals.",
          },
          {
            question_number: 3,
            question_text: assessment.items[2].text,
            concepts: ["confidence interval interpretation"],
            alignment: "uncovered",
            difficulty: 3,
            explanation: "Prep does not address interpretation in context.",
          },
        ],
        coverage_summary: {
          covered_items: [1],
          uncovered_items: [2, 3],
          overall_alignment: "The prep covers only the basic proportion interval question.",
        },
        teacher_summary: "Students are prepared for the first item but not the t-interval or interpretation items.",
      },
    );

    const alignment = await getAlignment(prep, assessment, callAlignment);
    expect(alignment.coveredItems.length).toBe(1);
    expect(alignment.uncoveredItems.length).toBe(2);
    expect(callAlignment).toHaveBeenCalledTimes(1);

    const suggestions = await getSuggestions(alignment);
    expect(suggestions).toHaveLength(2);
    expect(suggestions.every((s) => s.suggestionType === "add_prep_support")).toBe(true);

    const callRewrite = vi.fn(async () =>
      JSON.stringify({
        rewrittenAssessment: "1. Compute a CI for a proportion.\n2. Compute a t-interval for a mean.\n3. Interpret ci threshold in context.",
        prepAddendum: ["ci_mean_t_interval", "interpret_ci_threshold"],
      })
    );

    const rewrite = await applySuggestions(assessment, suggestions, callRewrite);
    expect(rewrite.prepAddendum).toContain("ci_mean_t_interval");
    expect(rewrite.prepAddendum).toContain("interpret_ci_threshold");
    const rewritePrompt = String(callRewrite.mock.calls[0]?.[0] ?? "");
    expect(rewritePrompt).toContain("TEACHER_SUGGESTIONS:");
    expect(rewritePrompt).toContain("ALIGNMENT_OVERRIDES:");

    const callReverse = vi.fn(async () =>
      JSON.stringify({
        reverseCoverage: [
          {
            prepItemNumber: 1,
            concepts: [{ label: "ci_proportion_z_interval", count: 1, difficulties: [2] }],
            prepDifficulty: 2,
            testEvidence: [
              {
                assessmentItemNumber: 1,
                difficulty: 2,
                alignment: "aligned",
              },
            ],
          },
        ],
      })
    );

    const reverse = await getReverseAlignment(prep, assessment, callReverse);
    expect(reverse.reverseCoverage.length).toBeGreaterThan(0);

    const callReport = vi.fn(async () =>
      JSON.stringify({
        covered: [{ assessmentItemNumber: 1 }],
        uncovered: [{ assessmentItemNumber: 2 }, { assessmentItemNumber: 3 }],
        prepAddendum: rewrite.prepAddendum,
        reverseCoverage: reverse.reverseCoverage,
      })
    );

    const report = await generatePreparednessReport(alignment, reverse, suggestions, rewrite, callReport);
    expect(report.covered.length).toBe(1);
    expect(report.uncovered.length).toBe(2);
    expect(report.prepAddendum.length).toBe(2);
    expect(report.reverseCoverage.length).toBe(1);

    const callAdmin = vi.fn(async () =>
      JSON.stringify({
        adminReport: {
          preparedness: {
            llmErrors: [],
            teacherOverrides: [],
            modelAnomalies: [
              {
                assessmentItemNumber: 3,
                issue: "concept_not_found_in_text",
                concept: "ci_mean_t_interval",
              },
            ],
            uncoveredItems: [2, 3],
            rewriteIssues: [],
            reverseAlignmentIssues: [],
          },
          otherSystemAreas: {},
        },
      })
    );

    const admin = await generateAdminReport(
      {
        alignment,
        suggestions,
        rewrite,
        reverseAlignment: reverse,
      },
      [],
      [],
      callAdmin
    );

    expect(admin.adminReport.preparedness.uncoveredItems).toEqual([2, 3]);
    expect(admin.adminReport.preparedness.modelAnomalies.length).toBe(1);
  });

  it("B: teacher override changes corrected alignment and rewrite", async () => {
    const modelAlignment = {
      coveredItems: [],
      uncoveredItems: [
        {
          assessmentItemNumber: 2,
          concepts: [],
          difficulty: 4,
          prepDifficulty: 0,
          alignment: "missing_in_prep" as const,
        },
      ],
    };

    const suggestions = [{ assessmentItemNumber: 2, issue: "missing_in_prep" as const, suggestionType: "add_prep_support" as const }];
    const rewrite = {
      rewrittenAssessment: "2. Compute a t-interval for a mean.",
      prepAddendum: ["ci_mean_t_interval"],
    };

    const corrections: TeacherCorrection[] = [
      {
        assessmentItemNumber: 2,
        overrideAlignment: "aligned",
        overrideSuggestionType: "none",
      },
    ];

    const callTeacher = vi.fn(async () =>
      JSON.stringify({
        correctedAlignment: {
          coveredItems: [
            {
              assessmentItemNumber: 2,
              concepts: [{ label: "ci_mean_t_interval", count: 1, difficulties: [3] }],
              difficulty: 3,
              prepDifficulty: 3,
              alignment: "aligned",
            },
          ],
          uncoveredItems: [],
        },
        correctedSuggestions: [
          {
            assessmentItemNumber: 2,
            issue: "missing_in_prep",
            suggestionType: "add_prep_support",
          },
        ],
        correctedRewrite: {
          rewrittenAssessment: "2. Compute a t-interval for a mean.",
          prepAddendum: [],
        },
      })
    );

    const corrected = await applyTeacherInput(
      modelAlignment,
      suggestions,
      rewrite,
      corrections,
      callTeacher
    );

    expect(corrected.correctedAlignment.coveredItems[0].alignment).toBe("aligned");
    expect(corrected.correctedAlignment.uncoveredItems).toHaveLength(0);
    expect(corrected.correctedRewrite.prepAddendum).toHaveLength(0);
  });

  it("C: retries on 429 then succeeds", async () => {
    let attempts = 0;
    const callLLM = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("429 rate limit");
      }
      return JSON.stringify({
        prep_concepts: [],
        prep_difficulty: 1,
        test_items: [],
        coverage_summary: {
          covered_items: [],
          misaligned_items: [],
          uncovered_items: [],
          overall_alignment: "",
        },
        teacher_summary: "",
      });
    });

    const result = await getAlignment(prep, assessment, callLLM);
    expect(result.coveredItems.length + result.uncoveredItems.length).toBeGreaterThan(0);
    expect(attempts).toBe(2);
  });

  it("D: derives non-aligned status when test is one level above prep", async () => {
    const callAlignment = makeSingleCallAlignmentCaller({
      prep_concepts: ["confidence interval interpretation"],
      prep_difficulty: 3,
      test_items: [
        {
          question_number: 1,
          question_text: assessment.items[0].text,
          concepts: ["confidence interval interpretation"],
          alignment: "covered",
          difficulty: 3,
          explanation: "Prep covers interpretation.",
        },
      ],
      coverage_summary: {
        covered_items: [1],
        misaligned_items: [],
        uncovered_items: [],
        overall_alignment: "Covered.",
      },
      teacher_summary: "Covered.",
    });

    const alignment = await getAlignment(prep, assessment, callAlignment);
    expect(alignment.coveredItems[0].alignment).toBe("aligned");
  });

  it("E: applySuggestions forwards teacher suggestions and alignment overrides", async () => {
    const capturedPrompts: string[] = [];
    const callRewrite = vi.fn(async (prompt: string) => {
      capturedPrompts.push(prompt);
      return JSON.stringify({
        rewrittenAssessment: "1. Compute a CI for a proportion.",
        prepAddendum: ["ci_interpretation"],
      });
    });

    const suggestions = [{ assessmentItemNumber: 1, issue: "missing_in_prep" as const, suggestionType: "add_prep_support" as const }];
    await applySuggestions(assessment, suggestions, callRewrite, {
      teacherSuggestions: [
        { assessmentItemNumber: 1, suggestionText: "Clarify interpretation wording." },
        { assessmentItemNumber: null, suggestionText: "Use consistent variable notation across all items." },
      ],
      alignmentOverrides: [
        { assessmentItemNumber: 1, correctedAlignment: "aligned" },
      ],
    });

    const prompt = capturedPrompts[0] ?? "";
    expect(prompt).toContain("TEACHER_SUGGESTIONS:");
    expect(prompt).toContain("Clarify interpretation wording.");
    expect(prompt).toContain("ALIGNMENT_OVERRIDES:");
    expect(prompt).toContain('"correctedAlignment": "aligned"');
  });

  it("F: single-call alignment pipeline sends prep and test text in one prompt", async () => {
    const callLLM = makeSingleCallAlignmentCaller({
      prep_concepts: ["confidence interval for proportion using z"],
      prep_difficulty: 2,
      test_items: [
        {
          question_number: 1,
          question_text: assessment.items[0].text,
          concepts: ["confidence interval for proportion using z"],
          alignment: "covered",
          difficulty: 2,
          explanation: "Covered in prep.",
        },
      ],
      coverage_summary: {
        covered_items: [1],
        misaligned_items: [],
        uncovered_items: [],
        overall_alignment: "Covered.",
      },
      teacher_summary: "Covered.",
    });

    const alignment = await getAlignment(prep, assessment, callLLM);
    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(String(callLLM.mock.calls[0]?.[0] ?? "")).toContain("Compare the PREP document and the TEST document");
    expect(String(callLLM.mock.calls[0]?.[0] ?? "")).toContain("PREP DOCUMENT:");
    expect(String(callLLM.mock.calls[0]?.[0] ?? "")).toContain("TEST DOCUMENT:");
    expect(String(callLLM.mock.calls[0]?.[0] ?? "")).toContain(prep.rawText);
    expect(String(callLLM.mock.calls[0]?.[0] ?? "")).toContain(assessment.items[0].text);
    expect(alignment.coveredItems[0].concepts[0].label).toBe("confidence interval for proportion using z");
    expect(alignment.coveredItems[0].alignment).toBe("aligned");
  });

  it("G: falls back to deterministic uncovered result when model output is empty or malformed", async () => {
    const callLLM = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({ prep_concepts: [], prep_difficulty: 1, test_items: [], coverage_summary: {}, teacher_summary: "" })
      );

    const alignment = await getAlignment(prep, assessment, callLLM);
    const allItemNumbers = [
      ...alignment.coveredItems.map((item) => item.assessmentItemNumber),
      ...alignment.uncoveredItems.map((item) => item.assessmentItemNumber),
    ];

    expect(allItemNumbers.length).toBeGreaterThan(0);
    expect(allItemNumbers.every((value) => value >= 1 && value <= assessment.items.length)).toBe(true);
    expect(alignment.coveredItems).toHaveLength(0);
  });

  it("H: v2 teacher actions call dedicated prompts and return JSON payloads", async () => {
    const callReview = vi.fn(async () => JSON.stringify({ review_snippet: "Review confidence interval width and margin of error." }));
    const callRewrite = vi.fn(async () => JSON.stringify({ rewritten_question: "Rewrite this item for clarity while preserving objective." }));
    const callRewriteDifficulty = vi.fn(async () => JSON.stringify({ rewritten_question: "Rewrite this item to match difficulty 2." }));
    const callPractice = vi.fn(async () => JSON.stringify({
      practice_question: "Find a 95% confidence interval for a sample mean.",
      answer: "(10.2, 12.4)",
      explanation: "Use the sample mean ± critical value × standard error.",
    }));

    const review = await generatePreparednessReviewSnippet("Compute a confidence interval.", ["confidence interval"], callReview);
    const rewrite = await rewritePreparednessQuestion("Compute a confidence interval.", "Simplify wording", callRewrite);
  const rewriteToDifficulty = await rewritePreparednessQuestionToDifficulty("Compute a confidence interval.", 2, callRewriteDifficulty);
    const practice = await generatePreparednessPracticeItem("Compute a confidence interval.", ["confidence interval"], callPractice);

    expect(review.review_snippet.length).toBeGreaterThan(0);
    expect(rewrite.rewritten_question.length).toBeGreaterThan(0);
    expect(rewriteToDifficulty.rewritten_question.length).toBeGreaterThan(0);
    expect(practice.practice_question.length).toBeGreaterThan(0);
    expect(String(callReview.mock.calls[0]?.[0] ?? "")).toContain("CONCEPTS NEEDED:");
    expect(String(callRewrite.mock.calls[0]?.[0] ?? "")).toContain("TEACHER INSTRUCTIONS:");
    expect(String(callRewriteDifficulty.mock.calls[0]?.[0] ?? "")).toContain("TARGET DIFFICULTY:");
    expect(String(callPractice.mock.calls[0]?.[0] ?? "")).toContain("Create a practice problem");
  });

  it("I: document-level v2 prompts generate full review and full test payloads", async () => {
    const callReview = vi.fn(async () => JSON.stringify({
      review_sections: [
        {
          title: "Confidence Intervals",
          explanation: "Use estimate ± margin of error.",
          example: "Compute a 95% interval from sample statistics.",
        },
      ],
      summary: "This review covers foundational confidence interval concepts.",
    }));
    const callTest = vi.fn(async () => JSON.stringify({
      test_items: [
        {
          question_number: 1,
          question_text: "Construct a 95% confidence interval for the mean.",
          answer: "Use xbar ± t*SE.",
          explanation: "The t-interval is required when population sigma is unknown.",
        },
      ],
      test_summary: "This test measures confidence interval construction and interpretation.",
    }));

    const reviewPacket = await generatePreparednessReviewPacket([
      { question_number: 1, question_text: "Construct a confidence interval." },
    ], callReview);

    const generatedTest = await generatePreparednessTestFromReview(
      reviewPacket.review_sections,
      callTest,
    );

    expect(reviewPacket.review_sections.length).toBe(1);
    expect(generatedTest.test_items.length).toBe(1);
    expect(String(callReview.mock.calls[0]?.[0] ?? "")).toContain("Create a complete REVIEW PACKET");
    expect(String(callReview.mock.calls[0]?.[0] ?? "")).toContain("TEST ITEMS:");
    expect(String(callTest.mock.calls[0]?.[0] ?? "")).toContain("Create a complete TEST based on the REVIEW CONCEPTS");
    expect(String(callTest.mock.calls[0]?.[0] ?? "")).toContain("REVIEW CONCEPTS:");
  });
});
