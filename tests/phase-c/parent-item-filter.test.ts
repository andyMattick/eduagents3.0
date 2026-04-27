import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabaseRest: vi.fn(async (table: string) => {
    if (table === "v4_items") {
      return [
        {
          id: "parent-3",
          item_number: 3,
          stem: "3. Shared parent stem with context only.",
          answer_key: null,
          metadata: {
            bloomLevel: 4,
            cognitiveLoad: 0.7,
            linguisticLoad: 0.6,
            representationLoad: 0.5,
          },
        },
        {
          id: "sub-3a",
          item_number: 4,
          stem: "3a. Solve part A.",
          answer_key: { correct: "A" },
          metadata: {
            bloomLevel: 3,
            cognitiveLoad: 0.5,
            linguisticLoad: 0.4,
            representationLoad: 0.4,
          },
        },
        {
          id: "sub-3b",
          item_number: 5,
          stem: "3b. Explain part B.",
          answer_key: { correct: "B" },
          metadata: {
            bloomLevel: 5,
            cognitiveLoad: 0.8,
            linguisticLoad: 0.5,
            representationLoad: 0.6,
          },
        },
      ];
    }

    return [];
  }),
}));

import { createClassWithSyntheticStudents, listSimulationResults, runPhaseCSimulation } from "../../src/simulation/phase-c";

describe("phase-c item filtering", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("skips parent rows without answer keys when keyed sub-items exist", async () => {
    const { classRecord } = await createClassWithSyntheticStudents({
      name: "Parent Filter Class",
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
      seed: "parent-filter-seed",
    });

    const output = await runPhaseCSimulation({
      classId: classRecord.id,
      documentId: "doc-parent-filter",
      items: [
        {
          itemId: "sub-3a",
          itemNumber: 4,
          logicalLabel: "3a",
          traits: {
            bloomLevel: 3,
            cognitiveLoad: 0.5,
            linguisticLoad: 0.4,
            representationLoad: 0.4,
          },
        },
        {
          itemId: "sub-3b",
          itemNumber: 5,
          logicalLabel: "3b",
          traits: {
            bloomLevel: 5,
            cognitiveLoad: 0.8,
            linguisticLoad: 0.5,
            representationLoad: 0.6,
          },
        },
      ],
    });

    expect(output.resultCount).toBe(2);

    const results = await listSimulationResults(output.simulationRun.id);
    const itemIds = results.map((result) => result.itemId).sort();
    expect(itemIds).toEqual(["sub-3a", "sub-3b"]);
    expect(itemIds).not.toContain("parent-3");

    const labelsById = new Map(results.map((result) => [result.itemId, result.itemLabel]));
    expect(labelsById.get("sub-3a")).toBe("Item 3a");
    expect(labelsById.get("sub-3b")).toBe("Item 3b");
  });
});
