import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { generateSyntheticStudents } from "../../src/simulation/phase-c/generator";
import { PHASE_C_CONFIG } from "../../src/simulation/phase-c/traits";
import type { ProfilePercentages } from "../../src/simulation/phase-c/types";

const profilePercentages: ProfilePercentages = {
  ell: 20,
  sped: 10,
  gifted: 20,
  adhd: 10,
  dyslexia: 10,
  attention504: 10,
};

function normalizedStudents(seed: string) {
  return generateSyntheticStudents({
    classId: "class-1",
    classLevel: "AP",
    profilePercentages,
    studentCount: PHASE_C_CONFIG.defaultSyntheticStudentCount,
    seed,
  }).map((student) => ({
    id: student.id,
    profiles: student.profiles,
    positiveTraits: student.positiveTraits,
    traits: student.traits,
    biases: student.biases,
  }));
}

describe("phase-c generator", () => {
  it("is deterministic for the same seed", () => {
    expect(normalizedStudents("seed-a")).toEqual(normalizedStudents("seed-a"));
  });

  it("changes output for different seeds", () => {
    expect(normalizedStudents("seed-a")).not.toEqual(normalizedStudents("seed-b"));
  });

  it("keeps all trait values and biases inside configured bounds", () => {
    const students = normalizedStudents("bounds-seed");

    for (const student of students) {
      for (const trait of Object.values(student.traits)) {
        expect(trait).toBeGreaterThanOrEqual(PHASE_C_CONFIG.minTraitValue);
        expect(trait).toBeLessThanOrEqual(PHASE_C_CONFIG.maxTraitValue);
      }

      expect(student.biases.confusionBias).toBeGreaterThanOrEqual(PHASE_C_CONFIG.minBiasValue);
      expect(student.biases.confusionBias).toBeLessThanOrEqual(PHASE_C_CONFIG.maxBiasValue);
      expect(student.biases.timeBias).toBeGreaterThanOrEqual(PHASE_C_CONFIG.minBiasValue);
      expect(student.biases.timeBias).toBeLessThanOrEqual(PHASE_C_CONFIG.maxBiasValue);
    }
  });

  it("allocates profile counts according to presence settings", () => {
    const students = generateSyntheticStudents({
      classId: "class-2",
      classLevel: "Standard",
      profilePercentages,
      studentCount: 20,
      seed: "allocation-seed",
    });

    const ellCount = students.filter((student) => student.profiles.includes("ELL")).length;
    const spedCount = students.filter((student) => student.profiles.includes("SPED")).length;
    const giftedCount = students.filter((student) => student.profiles.includes("Gifted")).length;

    expect(ellCount).toBe(4);
    expect(spedCount).toBe(2);
    expect(giftedCount).toBe(4);
  });

  it("keeps generation order statement intact in source", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const generatorPath = path.resolve(currentDir, "../../src/simulation/phase-c/generator.ts");
    const source = readFileSync(generatorPath, "utf8");

    const profileIndex = source.indexOf("traits = applyTraitDelta(traits, PROFILE_DELTAS[profile]);");
    const positiveIndex = source.indexOf("traits = applyTraitDelta(traits, delta);");
    const jitterIndex = source.indexOf("traits = addJitter(traits, rng);");
    const clampIndex = source.indexOf("traits = clampTraitVector(traits);");

    expect(profileIndex).toBeGreaterThan(-1);
    expect(positiveIndex).toBeGreaterThan(profileIndex);
    expect(jitterIndex).toBeGreaterThan(positiveIndex);
    expect(clampIndex).toBeGreaterThan(jitterIndex);
  });
});
