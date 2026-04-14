import { describe, expect, it, vi } from "vitest";

import {
  applySuggestions,
  applyTeacherInput,
  generateAdminReport,
  generatePreparednessReport,
  getAlignment,
  getReverseAlignment,
  getSuggestions,
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

function makeLightweightAlignmentCaller(alignmentPayload: unknown, testConcepts?: unknown[]) {
  return vi
    .fn()
    .mockResolvedValueOnce(
      JSON.stringify({
        reviewConcepts: [
          {
            conceptLabel: "ci_proportion_z_interval",
            conceptBlurb: "Compute and interpret a z-based proportion interval.",
            difficulty: 2,
            count: 2,
          },
        ],
      })
    )
    .mockResolvedValueOnce(
      JSON.stringify({
        testConcepts: testConcepts ?? [
          {
            assessmentItemNumber: 1,
            conceptLabels: ["ci_proportion_z_interval"],
            testDifficulty: 2,
          },
        ],
      })
    )
    .mockResolvedValueOnce(JSON.stringify(alignmentPayload));
}

describe("Preparedness Hybrid Wiring", () => {
  it("A: alignment/suggestions/rewrite/reverse/report all use hybrid structures", async () => {
    const callAlignment = makeLightweightAlignmentCaller(
      {
        coveredItems: [
          {
            assessmentItemNumber: 1,
            concepts: [{ label: "ci_proportion_z_interval", count: 1, difficulties: [2] }],
            difficulty: 2,
            prepDifficulty: 2,
            alignment: "aligned",
          },
        ],
        uncoveredItems: [
          {
            assessmentItemNumber: 2,
            concepts: [],
            difficulty: 4,
            prepDifficulty: 0,
            alignment: "missing_in_prep",
          },
          {
            assessmentItemNumber: 3,
            concepts: [],
            difficulty: 3,
            prepDifficulty: 0,
            alignment: "missing_in_prep",
          },
        ],
      },
      [
        { assessmentItemNumber: 1, conceptLabels: ["ci_proportion_z_interval"], testDifficulty: 2 },
        { assessmentItemNumber: 2, conceptLabels: ["ci_mean_t_interval"], testDifficulty: 4 },
        { assessmentItemNumber: 3, conceptLabels: ["ci_interpretation"], testDifficulty: 3 },
      ]
    );

    const alignment = await getAlignment(prep, assessment, callAlignment);
    expect(alignment.coveredItems.length).toBe(1);
    expect(alignment.uncoveredItems.length).toBe(2);

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
      if (attempts === 2) {
        return JSON.stringify({ reviewConcepts: [] });
      }
      if (attempts === 3) {
        return JSON.stringify({ testConcepts: [] });
      }
      return JSON.stringify({ coveredItems: [], uncoveredItems: [] });
    });

    const result = await getAlignment(prep, assessment, callLLM);
    expect(result.coveredItems.length + result.uncoveredItems.length).toBeGreaterThan(0);
    expect(attempts).toBe(4);
  });

  it("D: derives non-aligned status when test is one level above prep", async () => {
    const callAlignment = makeLightweightAlignmentCaller({
      coveredItems: [
        {
          assessmentItemNumber: 1,
          concepts: [{ label: "ci_interpretation", count: 1, difficulties: [3] }],
          difficulty: 3,
          prepDifficulty: 2,
          alignment: "aligned",
        },
      ],
      uncoveredItems: [],
    });

    const alignment = await getAlignment(prep, assessment, callAlignment);
    expect(alignment.coveredItems[0].alignment).toBe("slightly_above");
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

  it("F: lightweight alignment pipeline runs review extract, test extract, and compare", async () => {
    const callLLM = makeLightweightAlignmentCaller({
      coveredItems: [
        {
          assessmentItemNumber: 1,
          concepts: { ci_proportion_z_interval: 2 },
          prepDifficulty: 2,
          testDifficulty: 2,
          alignment: "aligned",
        },
      ],
      uncoveredItems: [],
    });

    const alignment = await getAlignment(prep, assessment, callLLM);
    expect(callLLM).toHaveBeenCalledTimes(3);
    expect(String(callLLM.mock.calls[0]?.[0] ?? "")).toContain("Extract all instructional concepts taught in REVIEW_TEXT");
    expect(String(callLLM.mock.calls[1]?.[0] ?? "")).toContain("Extract instructional concepts assessed in ASSESSMENT_ITEMS");
    expect(String(callLLM.mock.calls[2]?.[0] ?? "")).toContain("Compare TEST_CONCEPTS to REVIEW_CONCEPTS");
    expect(alignment.coveredItems[0].concepts[0].label).toBe("ci_proportion_z_interval");
    expect(alignment.coveredItems[0].alignment).toBe("aligned");
  });

  it("G: falls back to deterministic alignment when model concept/alignment output is empty or mis-indexed", async () => {
    const callLLM = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ reviewConcepts: [] }))
      .mockResolvedValueOnce(
        JSON.stringify({
          testConcepts: [
            {
              assessmentItemNumber: 67,
              conceptLabels: ["ci_interpretation"],
              testDifficulty: 3,
            },
          ],
        })
      )
      .mockResolvedValueOnce(JSON.stringify({ coveredItems: [], uncoveredItems: [] }));

    const alignment = await getAlignment(prep, assessment, callLLM);
    const allItemNumbers = [
      ...alignment.coveredItems.map((item) => item.assessmentItemNumber),
      ...alignment.uncoveredItems.map((item) => item.assessmentItemNumber),
    ];

    expect(allItemNumbers.length).toBeGreaterThan(0);
    expect(allItemNumbers).not.toContain(67);
    expect(allItemNumbers.every((value) => value >= 1 && value <= assessment.items.length)).toBe(true);
  });
});
