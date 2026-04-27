import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import {
  PHASE_C_CONFIG,
  POSITIVE_TRAIT_BIASES,
  POSITIVE_TRAIT_DELTAS,
  PROFILE_BIASES,
  PROFILE_DELTAS,
} from "../../src/simulation/phase-c/traits";
import type { PositiveTraitType, ProfileType } from "../../src/simulation/phase-c/types";

const REQUIRED_PROFILES: ProfileType[] = ["ELL", "SPED", "Gifted", "ADHD", "Dyslexic", "MathAnxious", "TestCalm"];
const REQUIRED_POSITIVE_TRAITS: PositiveTraitType[] = [
  "fast_worker",
  "slow_and_careful",
  "detail_oriented",
  "impulsive",
  "test_anxious",
  "test_calm",
  "strong_reader",
  "struggles_with_reading",
  "math_confident",
  "math_avoidant",
  "high_background_knowledge",
  "low_background_knowledge",
  "organized",
  "easily_distracted",
  "persistent",
  "gives_up_quickly",
  "creative_thinker",
];

describe("phase-c traits catalog", () => {
  it("defines all required profile deltas and biases", () => {
    for (const profile of REQUIRED_PROFILES) {
      expect(PROFILE_DELTAS).toHaveProperty(profile);
      expect(PROFILE_BIASES).toHaveProperty(profile);
    }
  });

  it("defines all required positive trait entries", () => {
    for (const trait of REQUIRED_POSITIVE_TRAITS) {
      const hasDelta = Object.prototype.hasOwnProperty.call(POSITIVE_TRAIT_DELTAS, trait);
      const hasBias = Object.prototype.hasOwnProperty.call(POSITIVE_TRAIT_BIASES, trait);
      expect(hasDelta || hasBias).toBe(true);
    }
  });

  it("exports central config constants", () => {
    expect(PHASE_C_CONFIG.defaultSyntheticStudentCount).toBeGreaterThan(0);
    expect(PHASE_C_CONFIG.jitterStdev).toBeGreaterThan(0);
    expect(PHASE_C_CONFIG.minBiasValue).toBeLessThan(0);
    expect(PHASE_C_CONFIG.maxBiasValue).toBeGreaterThan(0);
  });

  it("keeps magic numbers out of engine and generator logic", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const generatorPath = path.resolve(currentDir, "../../src/simulation/phase-c/generator.ts");
    const enginePath = path.resolve(currentDir, "../../src/simulation/phase-c/engine.ts");

    const generator = readFileSync(generatorPath, "utf8");
    const engine = readFileSync(enginePath, "utf8");

    expect(generator).not.toContain("0.3");
    expect(generator).not.toContain("0.25");

    expect(engine).not.toContain("0.05 * readingGap");
    expect(engine).not.toContain("0.12 * bloomGap");
    expect(engine).toContain("PHASE_C_CONFIG.formula");
  });
});
