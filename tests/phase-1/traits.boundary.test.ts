import { describe, expect, it } from "vitest";

import { applyMultipleTraitDeltas, applyTraitDelta } from "../../src/simulation/phase-c/traits";
import type { TraitVector } from "../../src/simulation/phase-c/types";

const base: TraitVector = {
  readingLevel: 3,
  vocabularyLevel: 3,
  backgroundKnowledge: 3,
  processingSpeed: 3,
  bloomMastery: 3,
  mathLevel: 3,
  writingLevel: 3,
};

describe("Trait delta boundaries", () => {
  it("returns base when delta is zero", () => {
    expect(applyTraitDelta(base, {})).toEqual(base);
  });

  it("handles negative traits", () => {
    expect(applyTraitDelta(base, { readingLevel: -1 }).readingLevel).toBeLessThan(base.readingLevel);
  });

  it("handles extreme positive traits", () => {
    expect(applyTraitDelta(base, { bloomMastery: 10 }).bloomMastery).toBeGreaterThan(base.bloomMastery);
  });

  it("handles missing trait delta", () => {
    expect(applyTraitDelta(base, undefined)).toEqual(base);
  });

  it("handles conflicting traits", () => {
    const result = applyMultipleTraitDeltas(base, [
      { processingSpeed: -0.5, readingLevel: -1 },
      { processingSpeed: 0.5, bloomMastery: 1 },
    ]);

    expect(result).toBeDefined();
  });
});
