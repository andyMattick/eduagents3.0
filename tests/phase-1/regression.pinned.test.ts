import { describe, expect, it } from "vitest";

import { simulateAssessment } from "../../src/simulation/phase-c/snapshot";

describe("Pinned regression values", () => {
  const snapshot = simulateAssessment({ seed: "phase1-regression" });

  it("pins pCorrect", () => {
    expect(snapshot.items[0].pCorrect).toBeCloseTo(0.68, 2);
  });

  it("pins confusion", () => {
    expect(snapshot.items[0].confusion).toBeCloseTo(0.23, 2);
  });

  it("pins timeSeconds", () => {
    expect(snapshot.items[0].timeSeconds).toBeCloseTo(43, 1);
  });

  it("pins difficulty", () => {
    expect(snapshot.items[0].difficulty).toBeCloseTo(0.63, 2);
  });

  it("pins bloom", () => {
    expect(snapshot.items[0].bloom).toBe(3);
  });

  it("pins fatigue", () => {
    expect(snapshot.items[0].fatigue).toBeCloseTo(0.12, 2);
  });
});
