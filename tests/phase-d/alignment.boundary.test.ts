import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabaseRest: vi.fn(async (table: string) => {
    if (table === "v4_items") {
      return [
        {
          id: "item-alignment-1",
          item_number: 1,
          stem: "Analyze the argument and justify your answer.",
          metadata: {
            bloomLevel: 5,
            cognitiveLoad: 3.5,
            linguisticLoad: 2.5,
            representationLoad: 1.5,
            confusionScore: 0.3,
            timeToProcessSeconds: 50,
          },
        },
      ];
    }
    return [];
  }),
}));

import { createClassWithSyntheticStudents, listSimulationResults, runPhaseCSimulation } from "../../src/simulation/phase-c";

describe("Phase C->D boundary", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("produces complete alignment-ready simulation metrics", async () => {
    const { classRecord } = await createClassWithSyntheticStudents({
      name: "Alignment Boundary Class",
      level: "Honors",
      profilePercentages: {
        ell: 10,
        sped: 10,
        adhd: 10,
        dyslexia: 10,
        gifted: 10,
        attention504: 10,
      },
      studentCount: 2,
      seed: "alignment-boundary-seed",
    });

    const output = await runPhaseCSimulation({
      classId: classRecord.id,
      documentId: "doc-alignment-boundary",
      items: [
        {
          itemId: "item-alignment-1",
          itemNumber: 1,
          logicalLabel: "1",
          traits: {
            bloomLevel: 5,
            cognitiveLoad: 0.8,
            linguisticLoad: 0.7,
            representationLoad: 0.4,
          },
        },
      ],
    });

    const results = await listSimulationResults(output.simulationRun.id);
    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(result.difficultyScore).toEqual(expect.any(Number));
      expect(result.abilityScore).toEqual(expect.any(Number));
      expect(result.pCorrect).toEqual(expect.any(Number));
      expect(result.confusionScore).toEqual(expect.any(Number));
      expect(result.timeSeconds).toEqual(expect.any(Number));
      expect(result.bloomGap).toEqual(expect.any(Number));

      expect(Number.isNaN(result.difficultyScore)).toBe(false);
      expect(Number.isNaN(result.abilityScore)).toBe(false);
      expect(Number.isNaN(result.pCorrect)).toBe(false);
      expect(Number.isNaN(result.confusionScore)).toBe(false);
      expect(Number.isNaN(result.timeSeconds)).toBe(false);
      expect(Number.isNaN(result.bloomGap)).toBe(false);

      expect(result.pCorrect).toBeGreaterThan(0);
      expect(result.pCorrect).toBeLessThan(1);
      expect(result.confusionScore).toBeGreaterThanOrEqual(0);
      expect(result.confusionScore).toBeLessThanOrEqual(1);
      expect(result.timeSeconds).toBeGreaterThan(0);
      expect(result.traitsSnapshot).toBeDefined();
    }
  });
});
