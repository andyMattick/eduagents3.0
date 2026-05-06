import { describe, expect, it } from "vitest";

import { simulateAssessment } from "../../src/simulation/phase-c/snapshot";

describe("Pinned regression values", () => {
  const snapshot = simulateAssessment({ seed: "phase1-regression" });

  it("pins pCorrect", () => {
    expect(snapshot.items[0].pCorrect).toBeCloseTo(0.6533, 4);
  });

  it("pins confusion", () => {
    expect(snapshot.items[0].confusion).toBeCloseTo(0.7049, 4);
  });

  it("pins timeSeconds", () => {
    expect(snapshot.items[0].timeSeconds).toBeCloseTo(45.5128, 4);
  });

  it("pins difficulty", () => {
    expect(snapshot.items[0].difficulty).toBeCloseTo(0.6741, 4);
  });

  it("pins bloom", () => {
    expect(snapshot.items[0].bloom).toBe(3);
  });

  it("pins fatigue", () => {
    expect(snapshot.items[0].fatigue).toBeCloseTo(0.12, 2);
  });
});
