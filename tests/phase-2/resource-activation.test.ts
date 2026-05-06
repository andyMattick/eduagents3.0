import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabaseRest: vi.fn(async (table: string) => {
    if (table !== "v4_items") {
      return [];
    }

    return [
      {
        id: "base-only",
        item_number: 1,
        stem: "Explain the trend in the graph.",
        answer_key: null,
        metadata: {
          bloomLevel: 3,
          cognitiveLoad: 0.5,
          linguisticLoad: 0.4,
          representationLoad: 0.3,
        },
      },
      {
        id: "answer-only",
        item_number: 2,
        stem: "Choose the best answer.",
        answer_key: { correct: "B" },
        metadata: {
          choices: ["A", "B", "C", "D"],
          distractorMapping: {
            A: "misread-axis",
            C: "unit-confusion",
          },
          bloomLevel: 3,
          cognitiveLoad: 0.5,
          linguisticLoad: 0.4,
          representationLoad: 0.3,
        },
      },
      {
        id: "steps-only",
        item_number: 3,
        stem: "Show your work.",
        answer_key: null,
        metadata: {
          workedSolution: [
            "First isolate the variable.",
            "Then divide both sides.",
            "Interpret the result in context.",
          ],
          bloomLevel: 4,
          cognitiveLoad: 0.6,
          linguisticLoad: 0.5,
          representationLoad: 0.4,
        },
      },
      {
        id: "answer-and-steps",
        item_number: 4,
        stem: "Solve and justify.",
        answer_key: { correct: "x = 12" },
        metadata: {
          workedSolution: [
            "Compute the expression.",
            "Substitute into the equation.",
            "State the final value.",
          ],
          distractorMapping: {
            A: "substitution-error",
          },
          bloomLevel: 4,
          cognitiveLoad: 0.6,
          linguisticLoad: 0.5,
          representationLoad: 0.4,
        },
      },
    ];
  }),
}));

import { normalizeItemsPhaseB } from "../../src/simulation/phase-b";

describe("phase-2 resource activation", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("activates measurable blocks based on answer key/worked solution presence", async () => {
    const normalized = await normalizeItemsPhaseB("doc-phase2-activation");

    const baseOnly = normalized.items.find((item) => item.itemId === "base-only");
    const answerOnly = normalized.items.find((item) => item.itemId === "answer-only");
    const stepsOnly = normalized.items.find((item) => item.itemId === "steps-only");
    const both = normalized.items.find((item) => item.itemId === "answer-and-steps");

    expect(baseOnly?.measurables?.base).toBeDefined();
    expect(baseOnly?.measurables?.answerKey).toBeUndefined();
    expect(baseOnly?.measurables?.steps).toBeUndefined();
    expect(baseOnly?.measurables?.combined).toBeUndefined();

    expect(answerOnly?.measurables?.answerKey).toBeDefined();
    expect(answerOnly?.measurables?.steps).toBeUndefined();
    expect(answerOnly?.measurables?.combined).toBeUndefined();

    expect(stepsOnly?.measurables?.answerKey).toBeUndefined();
    expect(stepsOnly?.measurables?.steps).toBeDefined();
    expect(stepsOnly?.measurables?.combined).toBeUndefined();

    expect(both?.measurables?.answerKey).toBeDefined();
    expect(both?.measurables?.steps).toBeDefined();
    expect(both?.measurables?.combined).toBeDefined();

    expect(answerOnly?.resources).toEqual({ hasAnswerKey: true, hasWorkedSolution: false });
    expect(stepsOnly?.resources).toEqual({ hasAnswerKey: false, hasWorkedSolution: true });
    expect(both?.resources).toEqual({ hasAnswerKey: true, hasWorkedSolution: true });
  });
});
