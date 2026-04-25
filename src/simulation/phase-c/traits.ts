import type { BiasVector, ClassLevel, PositiveTraitId, PresenceLevel, ProfileId, TraitVector } from "./types";

export const PHASE_C_CONFIG = {
  defaultSyntheticStudentCount: 20,
  minTraitValue: 1,
  maxTraitValue: 5,
  jitterMean: 0,
  jitterStdev: 0.3,
  minBiasValue: -0.25,
  maxBiasValue: 0.25,
  maxProfilesPerStudent: 2,
  maxPositiveTraitsPerStudent: 2,
  basePositiveTraitProbability: 0.18,
  boostedPositiveTraitProbability: 0.5,
  formula: {
    readingGapToConfusion: 0.05,
    vocabularyGapToConfusion: 0.04,
    bloomGapToConfusion: 0.06,
    speedPenaltyToConfusion: 0.05,
    knowledgePenaltyToConfusion: 0.03,
    readingGapToTime: 0.08,
    vocabularyGapToTime: 0.07,
    bloomGapToTime: 0.12,
    speedPenaltyToTime: 0.1,
    knowledgePenaltyToTime: 0.06,
    defaultLinguisticLoadDivisor: 8,
    defaultConfusionSentenceDivisor: 20,
    defaultTimePerWordSeconds: 2.2,
    defaultTimeFloorSeconds: 20,
    defaultBloomsLevel: 3,
    minLinguisticLoad: 0,
    maxLinguisticLoad: 5,
    minConfusionScore: 0,
    maxConfusionScore: 1,
    minBloomsLevel: 1,
    maxBloomsLevel: 6,
    baselineProcessingCenter: 3,
    baselineKnowledgeCenter: 3,
    processingPenaltyDivisor: 2,
  },
} as const;

export const PRESENCE_TARGET_PERCENTAGE: Record<PresenceLevel, number> = {
  None: 0,
  "A few": 0.1,
  Some: 0.2,
  Many: 0.3,
};

export const BASE_PRIORS: TraitVector = {
  readingLevel: 3,
  vocabularyLevel: 3,
  backgroundKnowledge: 3,
  processingSpeed: 3,
  bloomMastery: 3,
  mathLevel: 3,
  writingLevel: 3,
};

export const CLASS_LEVEL_DELTAS: Record<ClassLevel, Partial<TraitVector>> = {
  AP: {
    readingLevel: 1,
    vocabularyLevel: 1,
    backgroundKnowledge: 1,
    bloomMastery: 1,
    mathLevel: 1,
  },
  Honors: {
    readingLevel: 0.5,
    vocabularyLevel: 0.5,
    backgroundKnowledge: 0.5,
    mathLevel: 0.5,
  },
  Standard: {},
  Remedial: {
    readingLevel: -1,
    vocabularyLevel: -1,
    backgroundKnowledge: -1,
    processingSpeed: -1,
    mathLevel: -1,
  },
};

export const PROFILE_DELTAS: Record<ProfileId, Partial<TraitVector>> = {
  ELL: { readingLevel: -1, vocabularyLevel: -1 },
  SPED: { processingSpeed: -1, bloomMastery: -0.5 },
  Gifted: { bloomMastery: 1, processingSpeed: 0.5 },
  ADHD: { processingSpeed: -0.5 },
  Dyslexic: { readingLevel: -1, processingSpeed: -0.5 },
  MathAnxious: { bloomMastery: -0.5 },
  TestCalm: {},
};

export const PROFILE_BIASES: Record<ProfileId, Partial<BiasVector>> = {
  ELL: { confusionBias: 0.05 },
  SPED: { timeBias: 0.1 },
  Gifted: {},
  ADHD: { confusionBias: 0.1, timeBias: -0.05 },
  Dyslexic: {},
  MathAnxious: { confusionBias: 0.1, timeBias: 0.05 },
  TestCalm: { confusionBias: -0.05 },
};

export const POSITIVE_TRAIT_DELTAS: Record<PositiveTraitId, Partial<TraitVector>> = {
  fast_worker: {},
  slow_and_careful: {},
  detail_oriented: {},
  impulsive: {},
  test_anxious: {},
  test_calm: {},
  strong_reader: { readingLevel: 0.5 },
  struggles_with_reading: { readingLevel: -0.5 },
  math_confident: { bloomMastery: 0.5 },
  math_avoidant: { bloomMastery: -0.5 },
  high_background_knowledge: { backgroundKnowledge: 0.5 },
  low_background_knowledge: { backgroundKnowledge: -0.5 },
  organized: {},
  easily_distracted: {},
  persistent: {},
  gives_up_quickly: {},
  creative_thinker: {},
  collaborative: {},
  independent: {},
  question_asker: {},
  reluctant_participant: {},
  memory_strong: { vocabularyLevel: 0.3, backgroundKnowledge: 0.4 },
};

export const POSITIVE_TRAIT_BIASES: Partial<Record<PositiveTraitId, Partial<BiasVector>>> = {
  fast_worker: { timeBias: -0.1 },
  slow_and_careful: { timeBias: 0.1, confusionBias: -0.05 },
  detail_oriented: { confusionBias: -0.1 },
  impulsive: { timeBias: -0.1, confusionBias: 0.1 },
  test_anxious: { confusionBias: 0.1, timeBias: 0.05 },
  test_calm: { confusionBias: -0.05 },
  organized: { confusionBias: -0.05 },
  easily_distracted: { confusionBias: 0.05 },
  persistent: { timeBias: 0.05 },
  gives_up_quickly: { timeBias: -0.05 },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyTraitDelta(base: TraitVector, delta: Partial<TraitVector>): TraitVector {
  return {
    readingLevel: base.readingLevel + (delta.readingLevel ?? 0),
    vocabularyLevel: base.vocabularyLevel + (delta.vocabularyLevel ?? 0),
    backgroundKnowledge: base.backgroundKnowledge + (delta.backgroundKnowledge ?? 0),
    processingSpeed: base.processingSpeed + (delta.processingSpeed ?? 0),
    bloomMastery: base.bloomMastery + (delta.bloomMastery ?? 0),
    mathLevel: base.mathLevel + (delta.mathLevel ?? 0),
    writingLevel: base.writingLevel + (delta.writingLevel ?? 0),
  };
}

export function clampTraitVector(traits: TraitVector): TraitVector {
  return {
    readingLevel: clamp(traits.readingLevel, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    vocabularyLevel: clamp(traits.vocabularyLevel, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    backgroundKnowledge: clamp(traits.backgroundKnowledge, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    processingSpeed: clamp(traits.processingSpeed, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    bloomMastery: clamp(traits.bloomMastery, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    mathLevel: clamp(traits.mathLevel, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    writingLevel: clamp(traits.writingLevel, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
  };
}

export function computeStudentBiases(profiles: ProfileId[], positiveTraits: PositiveTraitId[]): BiasVector {
  let confusionBias = 0;
  let timeBias = 0;

  for (const profile of profiles) {
    const bias = PROFILE_BIASES[profile];
    if (!bias) {
      continue;
    }
    confusionBias += bias.confusionBias ?? 0;
    timeBias += bias.timeBias ?? 0;
  }

  for (const trait of positiveTraits) {
    const bias = POSITIVE_TRAIT_BIASES[trait];
    if (!bias) {
      continue;
    }
    confusionBias += bias.confusionBias ?? 0;
    timeBias += bias.timeBias ?? 0;
  }

  return {
    confusionBias: clamp(confusionBias, PHASE_C_CONFIG.minBiasValue, PHASE_C_CONFIG.maxBiasValue),
    timeBias: clamp(timeBias, PHASE_C_CONFIG.minBiasValue, PHASE_C_CONFIG.maxBiasValue),
  };
}
