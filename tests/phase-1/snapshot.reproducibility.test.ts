import { describe, expect, it } from "vitest";

import { simulateAssessment } from "../../src/simulation/phase-c/snapshot";

describe("Simulation snapshot reproducibility", () => {
  it("produces identical snapshots for the same seed", () => {
    const snap1 = simulateAssessment({ seed: "phase1-seed" });
    const snap2 = simulateAssessment({ seed: "phase1-seed" });
    expect(snap1).toEqual(snap2);
  });

  it("produces different snapshots for different seeds", () => {
    const snap1 = simulateAssessment({ seed: "A" });
    const snap2 = simulateAssessment({ seed: "B" });
    expect(snap1).not.toEqual(snap2);
  });

  it("includes required snapshot fields", () => {
    const snapshot = simulateAssessment({ seed: "phase1-shape" });
    expect(snapshot).toMatchObject({
      engineVersion: expect.any(String),
      seed: expect.any(String),
      items: expect.any(Array),
      class: expect.any(Object),
      traits: expect.any(Array),
    });
  });
});
