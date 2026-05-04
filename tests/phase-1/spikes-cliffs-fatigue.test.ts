import { describe, expect, it } from "vitest";

import { simulateAssessment } from "../../src/simulation/phase-c/snapshot";

describe("Spikes, cliffs, fatigue", () => {
  const snapshot = simulateAssessment({ seed: "phase1-regression" });

  it("detects spikes", () => {
    expect(snapshot.items[3].spikes.length).toBe(1);
  });

  it("detects cliffs", () => {
    expect(snapshot.items[4].cliffs[0].deltaDifficulty).toBeGreaterThan(0.4);
  });

  it("pins fatigue curve", () => {
    expect(snapshot.items[5].fatigue).toBeCloseTo(0.22, 2);
  });
});
