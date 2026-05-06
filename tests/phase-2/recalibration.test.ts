import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClassWithSyntheticStudents, listSimulationResults, runPhaseCSimulation } from "../../src/simulation/phase-c";

describe("phase-2 measurable-driven recalibration", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("applies answer-key and worked-solution adjustments to difficulty/time/pCorrect", async () => {
    const { classRecord } = await createClassWithSyntheticStudents({
      name: "Phase2 Recalibration",
      level: "Standard",
      profilePercentages: {
        ell: 0,
        sped: 0,
        adhd: 0,
        dyslexia: 0,
        gifted: 0,
        attention504: 0,
      },
      studentCount: 1,
      seed: "phase2-recalibration-seed",
    });

    const output = await runPhaseCSimulation({
      classId: classRecord.id,
      documentId: "doc-phase2-recalibration",
      items: [
        {
          itemId: "baseline",
          itemNumber: 1,
          logicalLabel: "1",
          traits: {
            bloomLevel: 4,
            linguisticLoad: 0.6,
            cognitiveLoad: 0.6,
            representationLoad: 0.4,
          },
          measurables: {
            base: {
              linguisticLoad: 0.6,
              cognitiveLoad: 0.6,
              bloomEstimate: 4,
              conceptDensity: 0.4,
              representationLoad: 0.4,
              itemLength: 22,
              readingComplexity: 0.6,
              surfaceDifficulty: 1.2,
            },
          },
        },
        {
          itemId: "answer-steps",
          itemNumber: 2,
          logicalLabel: "2",
          traits: {
            bloomLevel: 4,
            linguisticLoad: 0.6,
            cognitiveLoad: 0.6,
            representationLoad: 0.4,
          },
          measurables: {
            base: {
              linguisticLoad: 0.6,
              cognitiveLoad: 0.6,
              bloomEstimate: 4,
              conceptDensity: 0.4,
              representationLoad: 0.4,
              itemLength: 22,
              readingComplexity: 0.6,
              surfaceDifficulty: 1.2,
            },
            answerKey: {
              hasAnswerKey: true,
              correctAnswer: "B",
              answerType: "mc",
              answerAmbiguityScore: 0.1,
              answerFormatComplexity: 0.2,
              answerKeyDifficultyAdjustment: 0.2,
              answerKeyPCorrectAdjustment: -0.15,
            },
            steps: {
              hasWorkedSolution: true,
              stepCount: 3,
              stepTypes: {
                computational: 1,
                inferential: 1,
                conceptual: 1,
                procedural: 0,
                interpretive: 0,
              },
              stepComplexity: 0.62,
              branchingFactor: 2,
              transformationDensity: 0.41,
              errorOpportunityCount: 2,
              stepDifficultyCurve: [0.6, 0.68, 0.74],
              stepTimeCurve: [36, 42, 48],
              stepCognitiveLoadCurve: [0.5, 0.62, 0.71],
              conceptTransitionMap: ["equation", "substitute", "interpret"],
            },
          },
        },
      ],
    });

    const results = await listSimulationResults(output.simulationRun.id);
    expect(results).toHaveLength(2);

    const baseline = results.find((row) => row.itemId === "baseline");
    const adjusted = results.find((row) => row.itemId === "answer-steps");

    expect(baseline).toBeDefined();
    expect(adjusted).toBeDefined();

    expect((adjusted?.difficultyScore ?? 0)).toBeGreaterThan(baseline?.difficultyScore ?? 0);
    expect((adjusted?.timeSeconds ?? 0)).toBeGreaterThan(baseline?.timeSeconds ?? 0);
    expect((adjusted?.pCorrect ?? 1)).toBeLessThan(baseline?.pCorrect ?? 1);
    expect(adjusted?.confusionScore ?? 0).toBeGreaterThanOrEqual(0);
    expect(adjusted?.confusionScore ?? 0).toBeLessThanOrEqual(1);
  });
});
