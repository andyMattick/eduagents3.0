import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabaseRest: vi.fn(async (table: string) => {
    if (table === "v4_items") {
      return [
        {
          id: "item-camel",
          item_number: 1,
          stem: "Explain and solve the first problem.",
          metadata: {
            bloomLevel: 6,
            cognitiveLoad: 4,
            linguisticLoad: 3,
            representationLoad: 2,
            confusionScore: 0.25,
            timeToProcessSeconds: 30,
          },
        },
        {
          id: "item-snake",
          item_number: 2,
          stem: "Interpret this graph.",
          metadata: {
            bloom_level: 5,
            cognitive_load: 3,
            linguistic_load: 2,
            representation_load: 1,
            confusion_score: 0.2,
            time_seconds: 40,
          },
        },
        {
          id: "item-phaseb",
          item_number: 3,
          stem: "Model a geometric relationship.",
          metadata: {
            phaseB: {
              bloomLevel: 4,
              cognitiveLoad: 2,
              linguisticLoad: 1,
              representationLoad: 3,
            },
            confusionScore: 0.2,
            timeToProcessSeconds: 35,
          },
        },
        {
          id: "item-metrics",
          item_number: 4,
          stem: "Choose and justify an approach.",
          metadata: {
            metrics: {
              bloom_level: 3,
              cognitive_load: 1,
              linguistic_load: 4,
              representation_load: 2,
            },
            confusion_score: 0.3,
            time_seconds: 45,
          },
        },
      ];
    }

    return [];
  }),
}));

import { createClassWithSyntheticStudents, listSimulationResults, runPhaseCSimulation } from "../../src/simulation/phase-c";

const EXPECTED_DIFFICULTY: Record<string, number> = {
  "item-camel": 3.85,
  "item-snake": 2.85,
  "item-phaseb": 2.15,
  "item-metrics": 2.55,
};

describe("Phase B->C boundary (loader)", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("reads numeric traits from multiple metadata key shapes", async () => {
    const { classRecord } = await createClassWithSyntheticStudents({
      name: "Boundary Loader Class",
      level: "AP",
      profilePercentages: {
        ell: 0,
        sped: 0,
        adhd: 0,
        dyslexia: 0,
        gifted: 0,
        attention504: 0,
      },
      studentCount: 1,
      seed: "boundary-loader-seed",
    });

    const output = await runPhaseCSimulation({
      classId: classRecord.id,
      documentId: "doc-meta-variants",
    });

    const results = await listSimulationResults(output.simulationRun.id);
    expect(results).toHaveLength(4);

    for (const result of results) {
      expect(Number.isFinite(result.difficultyScore)).toBe(true);
      expect(Number.isFinite(result.abilityScore)).toBe(true);
      expect(Number.isFinite(result.pCorrect)).toBe(true);
      expect(result.pCorrect).toBeGreaterThan(0);
      expect(result.pCorrect).toBeLessThan(1);
      expect(result.difficultyScore).toBeCloseTo(EXPECTED_DIFFICULTY[result.itemId] ?? -1, 6);
    }
  });
});
