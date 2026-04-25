import {
  applyTraitDelta,
  BASE_PRIORS,
  CLASS_LEVEL_DELTAS,
  clampTraitVector,
  computeStudentBiases,
  PHASE_C_CONFIG,
  PRESENCE_TARGET_PERCENTAGE,
  POSITIVE_TRAIT_DELTAS,
  PROFILE_DELTAS,
} from "./traits";
import type {
  ClassLevel,
  ClassOverlays,
  PositiveTraitId,
  ProfileId,
  SyntheticStudent,
  TraitVector,
} from "./types";

const TENDENCY_TRAIT_MAP: Record<string, PositiveTraitId> = {
  manyFastWorkers: "fast_worker",
  manySlowAndCareful: "slow_and_careful",
  manyDetailOriented: "detail_oriented",
  manyTestAnxious: "test_anxious",
  manyMathConfident: "math_confident",
  manyStruggleReading: "struggles_with_reading",
  manyEasilyDistracted: "easily_distracted",
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string) {
  let state = hashSeed(seed) || 0xdeadbeef;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomNormal(rng: () => number, mean = 0, stdev = 1): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = Math.max(rng(), Number.EPSILON);
  const mag = Math.sqrt(-2 * Math.log(u1));
  const z0 = mag * Math.cos(2 * Math.PI * u2);
  return z0 * stdev + mean;
}

function deterministicUuid(rng: () => number): string {
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(rng() * 256);
  }

  // RFC 4122 variant + version bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function shuffle<T>(values: T[], rng: () => number): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(rng() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
  }
  return copy;
}

function buildBaseTraits(level: ClassLevel): TraitVector {
  return clampTraitVector(applyTraitDelta(BASE_PRIORS, CLASS_LEVEL_DELTAS[level]));
}

function buildProfileAllocation(overlays: ClassOverlays, studentCount: number, rng: () => number): Array<ProfileId[]> {
  const allocations: Array<Set<ProfileId>> = Array.from({ length: studentCount }, () => new Set<ProfileId>());

  const requestedProfiles: Array<{ profileId: ProfileId; targetCount: number }> = [
    { profileId: "ELL", targetCount: Math.round(studentCount * PRESENCE_TARGET_PERCENTAGE[overlays.composition.ell]) },
    { profileId: "SPED", targetCount: Math.round(studentCount * PRESENCE_TARGET_PERCENTAGE[overlays.composition.sped]) },
    { profileId: "Gifted", targetCount: Math.round(studentCount * PRESENCE_TARGET_PERCENTAGE[overlays.composition.gifted]) },
    { profileId: "ADHD", targetCount: Math.round(studentCount * PRESENCE_TARGET_PERCENTAGE[overlays.composition.attentionChallenges]) },
    { profileId: "Dyslexic", targetCount: Math.round(studentCount * PRESENCE_TARGET_PERCENTAGE[overlays.composition.readingChallenges]) },
  ];

  for (const request of requestedProfiles) {
    const order = shuffle(Array.from({ length: studentCount }, (_, index) => index), rng);
    let assigned = 0;
    for (const candidate of order) {
      if (allocations[candidate].size >= PHASE_C_CONFIG.maxProfilesPerStudent) {
        continue;
      }
      allocations[candidate].add(request.profileId);
      assigned += 1;
      if (assigned >= request.targetCount) {
        break;
      }
    }
  }

  return allocations.map((entry) => Array.from(entry));
}

function pickPositiveTraits(overlays: ClassOverlays, rng: () => number): PositiveTraitId[] {
  const baselinePool: PositiveTraitId[] = [
    "organized",
    "persistent",
    "collaborative",
    "independent",
    "question_asker",
    "memory_strong",
    "creative_thinker",
    "reluctant_participant",
    "test_calm",
    "math_avoidant",
    "high_background_knowledge",
    "low_background_knowledge",
    "impulsive",
    "gives_up_quickly",
    "strong_reader",
  ];

  const weightedPool = new Map<PositiveTraitId, number>();
  for (const trait of baselinePool) {
    weightedPool.set(trait, PHASE_C_CONFIG.basePositiveTraitProbability);
  }

  for (const [toggleKey, enabled] of Object.entries(overlays.tendencies)) {
    if (!enabled) {
      continue;
    }
    const traitId = TENDENCY_TRAIT_MAP[toggleKey];
    if (!traitId) {
      continue;
    }
    weightedPool.set(traitId, Math.max(weightedPool.get(traitId) ?? 0, PHASE_C_CONFIG.boostedPositiveTraitProbability));
  }

  const picks: PositiveTraitId[] = [];
  const maxPicks = rng() < 0.5 ? 1 : PHASE_C_CONFIG.maxPositiveTraitsPerStudent;

  const candidates = shuffle(Array.from(weightedPool.entries()), rng);
  for (const [traitId, chance] of candidates) {
    if (picks.length >= maxPicks) {
      break;
    }
    if (rng() <= chance) {
      picks.push(traitId);
    }
  }

  return picks;
}

function profileSummaryLabel(profiles: ProfileId[], traits: PositiveTraitId[]): string {
  if (profiles.length === 0 && traits.length === 0) {
    return "General mix";
  }

  const profileText = profiles.length > 0 ? profiles.join(", ") : "No profile overlays";
  const traitText = traits.length > 0 ? traits.join(", ") : "No highlighted tendencies";
  return `${profileText} | ${traitText}`;
}

function addJitter(traits: TraitVector, rng: () => number): TraitVector {
  return {
    readingLevel: traits.readingLevel + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    vocabularyLevel: traits.vocabularyLevel + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    backgroundKnowledge: traits.backgroundKnowledge + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    processingSpeed: traits.processingSpeed + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    bloomMastery: traits.bloomMastery + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    mathLevel: traits.mathLevel + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    writingLevel: traits.writingLevel + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
  };
}

export function generateSyntheticStudents(input: {
  classId: string;
  classLevel: ClassLevel;
  overlays: ClassOverlays;
  studentCount?: number;
  seed?: string;
}): SyntheticStudent[] {
  const studentCount = Math.max(1, input.studentCount ?? PHASE_C_CONFIG.defaultSyntheticStudentCount);
  const rng = createRng(input.seed ?? `${input.classId}:${input.classLevel}`);
  const baseTraits = buildBaseTraits(input.classLevel);
  const profileByStudent = buildProfileAllocation(input.overlays, studentCount, rng);

  const output: SyntheticStudent[] = [];
  for (let index = 0; index < studentCount; index += 1) {
    const profiles = profileByStudent[index] ?? [];
    const positiveTraits = pickPositiveTraits(input.overlays, rng);

    let traits = { ...baseTraits };
    for (const profile of profiles) {
      traits = applyTraitDelta(traits, PROFILE_DELTAS[profile]);
    }

    for (const trait of positiveTraits) {
      const delta = POSITIVE_TRAIT_DELTAS[trait];
      if (delta) {
        traits = applyTraitDelta(traits, delta);
      }
    }

    // Required order: profile deltas -> positive trait deltas -> jitter -> clamp.
    traits = addJitter(traits, rng);

    traits = clampTraitVector(traits);
    const biases = computeStudentBiases(profiles, positiveTraits);

    output.push({
      id: deterministicUuid(rng),
      classId: input.classId,
      displayName: `Student ${index + 1}`,
      traits,
      profiles,
      positiveTraits,
      profileSummaryLabel: profileSummaryLabel(profiles, positiveTraits),
      biases,
    });
  }

  return output;
}
