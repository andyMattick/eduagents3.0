import { describe, expect, it } from "vitest";

import { simulateAssessment } from "../../src/simulation/phase-c/snapshot";

describe("Simulation schema boundaries", () => {
  it("keeps canonical item fields", () => {
    const snapshot = simulateAssessment({ seed: "phase1-schema" });
    const item = snapshot.items[0];

    expect(item).toMatchObject({
      itemId: expect.any(String),
      bloom: expect.any(Number),
      difficulty: expect.any(Number),
      linguisticLoad: expect.any(Number),
      cognitiveLoad: expect.any(Number),
      pCorrect: expect.any(Number),
      confusion: expect.any(Number),
      timeSeconds: expect.any(Number),
    });
  });
});
