import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../lib/supabase", () => {
  return {
    supabaseRest: vi.fn(async (table: string) => {
      if (table === "v4_items") {
        return [
          {
            id: "item-1",
            item_number: 1,
            stem: "Solve 2x + 3 = 11 and explain your reasoning.",
            metadata: {
              linguisticLoad: 3,
              confusionScore: 0.3,
              timeToProcessSeconds: 60,
              bloomsLevel: 4,
            },
          },
        ];
      }
      return [];
    }),
  };
});

import { createClassWithSyntheticStudents, listSimulationResults, runPhaseCSimulation } from "../../src/simulation/phase-c";

function defaultProfilePercentages() {
  return {
    ell: 20,
    sped: 10,
    gifted: 10,
    adhd: 10,
    dyslexia: 0,
    attention504: 10,
  };
}

describe("phase-c engine", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("runs simulation and persists run/results without phase-d fields", async () => {
    const { classRecord } = await createClassWithSyntheticStudents({
      name: "Period 3 - AP Statistics",
      level: "AP",
      profilePercentages: defaultProfilePercentages(),
      studentCount: 20,
      seed: "engine-seed",
    });

    const output = await runPhaseCSimulation({
      classId: classRecord.id,
      documentId: "doc-1",
      items: [
        {
          itemId: "item-1",
          itemNumber: 1,
          logicalLabel: "1",
          traits: {
            bloomLevel: 4,
            linguisticLoad: 0.6,
            cognitiveLoad: 0.6,
            representationLoad: 0.4,
          },
        },
      ],
    });

    expect(output.resultCount).toBe(20);

    const results = await listSimulationResults(output.simulationRun.id);
    expect(results).toHaveLength(20);
    for (const result of results) {
      expect(result.confusionScore).toBeGreaterThanOrEqual(0);
      expect(result.confusionScore).toBeLessThanOrEqual(1);
      expect(result.timeSeconds).toBeGreaterThanOrEqual(0);
      expect(result.difficultyScore).toBeGreaterThanOrEqual(0);
      expect(result.abilityScore).toBeGreaterThanOrEqual(0);
      expect(result.pCorrect).toBeGreaterThanOrEqual(0);
      expect(result.pCorrect).toBeLessThanOrEqual(1);
      expect(result).not.toHaveProperty("mastery");
      expect(result).not.toHaveProperty("correctness");
      expect(result).not.toHaveProperty("misconceptions");
      expect(result).not.toHaveProperty("exposure");
    }
  });

  it("does not contain phase-d semantic terms", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const enginePath = path.resolve(currentDir, "../../src/simulation/phase-c/engine.ts");
    const source = readFileSync(enginePath, "utf8").toLowerCase();

    expect(source).not.toContain("predictedcorrectness");
    expect(source).not.toContain("misconception");
    expect(source).not.toContain("exposure");
    expect(source).not.toContain("timescorrect");
  });
});
