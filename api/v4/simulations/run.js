/* Bundled by esbuild — do not edit */
// api/v4/simulations/run.ts
import { randomUUID } from "crypto";

// src/simulation/phase-c/traits.ts
var PHASE_C_CONFIG = {
  defaultSyntheticStudentCount: 20,
  minTraitValue: 1,
  maxTraitValue: 5,
  jitterMean: 0,
  jitterStdev: 0.3,
  minBiasValue: -0.25,
  maxBiasValue: 0.25,
  maxProfilesPerStudent: 2,
  maxPositiveTraitsPerStudent: 2,
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
    processingPenaltyDivisor: 2
  }
};
var BASE_POSITIVE_TRAIT_PROBABILITIES = {
  fast_worker: 0.15,
  slow_and_careful: 0.15,
  detail_oriented: 0.15,
  test_anxious: 0.15,
  math_confident: 0.15,
  struggles_with_reading: 0.15,
  easily_distracted: 0.15
};
var BASE_PRIORS = {
  readingLevel: 3,
  vocabularyLevel: 3,
  backgroundKnowledge: 3,
  processingSpeed: 3,
  bloomMastery: 3,
  mathLevel: 3,
  writingLevel: 3
};
var CLASS_LEVEL_DELTAS = {
  AP: {
    readingLevel: 1,
    vocabularyLevel: 1,
    backgroundKnowledge: 1,
    bloomMastery: 1,
    mathLevel: 1
  },
  Honors: {
    readingLevel: 0.5,
    vocabularyLevel: 0.5,
    backgroundKnowledge: 0.5,
    mathLevel: 0.5
  },
  Standard: {},
  Remedial: {
    readingLevel: -1,
    vocabularyLevel: -1,
    backgroundKnowledge: -1,
    processingSpeed: -1,
    mathLevel: -1
  }
};
var PROFILE_DELTAS = {
  ELL: { readingLevel: -1, vocabularyLevel: -1 },
  SPED: { processingSpeed: -1, bloomMastery: -0.5 },
  Gifted: { bloomMastery: 1, processingSpeed: 0.5 },
  ADHD: { processingSpeed: -0.5 },
  Dyslexic: { readingLevel: -1, processingSpeed: -0.5 },
  MathAnxious: { bloomMastery: -0.5 },
  TestCalm: {}
};
var PROFILE_BIASES = {
  ELL: { confusionBias: 0.05 },
  SPED: { timeBias: 0.1 },
  Gifted: {},
  ADHD: { confusionBias: 0.1, timeBias: -0.05 },
  Dyslexic: {},
  MathAnxious: { confusionBias: 0.1, timeBias: 0.05 },
  TestCalm: { confusionBias: -0.05 }
};
var POSITIVE_TRAIT_DELTAS = {
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
  memory_strong: { vocabularyLevel: 0.3, backgroundKnowledge: 0.4 }
};
var POSITIVE_TRAIT_BIASES = {
  fast_worker: { timeBias: -0.1 },
  slow_and_careful: { timeBias: 0.1, confusionBias: -0.05 },
  detail_oriented: { confusionBias: -0.1 },
  impulsive: { timeBias: -0.1, confusionBias: 0.1 },
  test_anxious: { confusionBias: 0.1, timeBias: 0.05 },
  test_calm: { confusionBias: -0.05 },
  organized: { confusionBias: -0.05 },
  easily_distracted: { confusionBias: 0.05 },
  persistent: { timeBias: 0.05 },
  gives_up_quickly: { timeBias: -0.05 }
};
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function applyTraitDelta(base, delta) {
  const safeDelta = delta ?? {};
  return {
    readingLevel: base.readingLevel + (safeDelta.readingLevel ?? 0),
    vocabularyLevel: base.vocabularyLevel + (safeDelta.vocabularyLevel ?? 0),
    backgroundKnowledge: base.backgroundKnowledge + (safeDelta.backgroundKnowledge ?? 0),
    processingSpeed: base.processingSpeed + (safeDelta.processingSpeed ?? 0),
    bloomMastery: base.bloomMastery + (safeDelta.bloomMastery ?? 0),
    mathLevel: base.mathLevel + (safeDelta.mathLevel ?? 0),
    writingLevel: base.writingLevel + (safeDelta.writingLevel ?? 0)
  };
}
function clampTraitVector(traits) {
  return {
    readingLevel: clamp(traits.readingLevel, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    vocabularyLevel: clamp(traits.vocabularyLevel, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    backgroundKnowledge: clamp(traits.backgroundKnowledge, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    processingSpeed: clamp(traits.processingSpeed, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    bloomMastery: clamp(traits.bloomMastery, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    mathLevel: clamp(traits.mathLevel, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue),
    writingLevel: clamp(traits.writingLevel, PHASE_C_CONFIG.minTraitValue, PHASE_C_CONFIG.maxTraitValue)
  };
}
function computeStudentBiases(profiles, positiveTraits) {
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
    timeBias: clamp(timeBias, PHASE_C_CONFIG.minBiasValue, PHASE_C_CONFIG.maxBiasValue)
  };
}

// src/simulation/phase-c/generator.ts
var POSITIVE_TRAITS = [
  "fast_worker",
  "slow_and_careful",
  "detail_oriented",
  "test_anxious",
  "math_confident",
  "struggles_with_reading",
  "easily_distracted"
];
function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function createRng(seed) {
  let state = hashSeed(seed) || 3735928559;
  return () => {
    state += 1831565813;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function randomNormal(rng, mean2 = 0, stdev = 1) {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = Math.max(rng(), Number.EPSILON);
  const mag = Math.sqrt(-2 * Math.log(u1));
  const z0 = mag * Math.cos(2 * Math.PI * u2);
  return z0 * stdev + mean2;
}
function deterministicUuid(rng) {
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(rng() * 256);
  }
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
function shuffle(values, rng) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(rng() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
  }
  return copy;
}
function buildBaseTraits(level) {
  return clampTraitVector(applyTraitDelta(BASE_PRIORS, CLASS_LEVEL_DELTAS[level]));
}
function normalizePercent(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(100, Math.max(0, parsed));
}
function buildProfileAllocation(profilePercentages, studentCount, rng) {
  const allocations = Array.from({ length: studentCount }, () => /* @__PURE__ */ new Set());
  const normalized = {
    ell: normalizePercent(profilePercentages?.ell),
    sped: normalizePercent(profilePercentages?.sped),
    gifted: normalizePercent(profilePercentages?.gifted),
    adhd: normalizePercent(profilePercentages?.adhd),
    dyslexia: normalizePercent(profilePercentages?.dyslexia),
    attention504: normalizePercent(profilePercentages?.attention504)
  };
  const requestedProfiles = [
    { profileId: "ELL", targetCount: Math.round(studentCount * (normalized.ell / 100)) },
    { profileId: "SPED", targetCount: Math.round(studentCount * (normalized.sped / 100)) },
    { profileId: "Gifted", targetCount: Math.round(studentCount * (normalized.gifted / 100)) },
    { profileId: "ADHD", targetCount: Math.round(studentCount * (Math.max(normalized.adhd, normalized.attention504) / 100)) },
    { profileId: "Dyslexic", targetCount: Math.round(studentCount * (normalized.dyslexia / 100)) }
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
function pickPositiveTraits(rng) {
  const picks = [];
  const maxPicks = rng() < 0.5 ? 1 : PHASE_C_CONFIG.maxPositiveTraitsPerStudent;
  const candidates = shuffle(POSITIVE_TRAITS, rng);
  for (const traitId of candidates) {
    if (picks.length >= maxPicks) {
      break;
    }
    const chance = BASE_POSITIVE_TRAIT_PROBABILITIES[traitId] ?? 0;
    if (rng() <= chance) {
      picks.push(traitId);
    }
  }
  return picks;
}
function profileSummaryLabel(profiles, traits) {
  if (profiles.length === 0 && traits.length === 0) {
    return "General mix";
  }
  const profileText = profiles.length > 0 ? profiles.join(", ") : "No assigned profiles";
  const traitText = traits.length > 0 ? traits.join(", ") : "No highlighted traits";
  return `${profileText} | ${traitText}`;
}
function addJitter(traits, rng) {
  return {
    readingLevel: traits.readingLevel + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    vocabularyLevel: traits.vocabularyLevel + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    backgroundKnowledge: traits.backgroundKnowledge + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    processingSpeed: traits.processingSpeed + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    bloomMastery: traits.bloomMastery + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    mathLevel: traits.mathLevel + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev),
    writingLevel: traits.writingLevel + randomNormal(rng, PHASE_C_CONFIG.jitterMean, PHASE_C_CONFIG.jitterStdev)
  };
}
function generateSyntheticStudents(input) {
  const studentCount = Math.max(1, input.studentCount ?? PHASE_C_CONFIG.defaultSyntheticStudentCount);
  const rng = createRng(input.seed ?? `${input.classId}:${input.classLevel}`);
  const baseTraits = buildBaseTraits(input.classLevel);
  const profileByStudent = buildProfileAllocation(input.profilePercentages, studentCount, rng);
  const output = [];
  for (let index = 0; index < studentCount; index += 1) {
    const profiles = profileByStudent[index] ?? [];
    const positiveTraits = pickPositiveTraits(rng);
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
      biases
    });
  }
  return output;
}

// src/simulation/phase-c/snapshot.ts
var ENGINE_VERSION = "phase-c-snapshot-v1";
var DEFAULT_PROFILE_PERCENTAGES = {
  ell: 20,
  sped: 10,
  adhd: 10,
  dyslexia: 10,
  gifted: 20,
  attention504: 10
};
function hashSeed2(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function createRng2(seed) {
  let state = hashSeed2(seed) || 3735928559;
  return () => {
    state += 1831565813;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}
function computeDifficulty(linguisticLoad, cognitiveLoad, bloomLevel, representationLoad) {
  return 0.35 * linguisticLoad + 0.35 * cognitiveLoad + 0.2 * (bloomLevel / 6) + 0.1 * representationLoad;
}
function mean(values, fallback = 0) {
  if (values.length === 0) {
    return fallback;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}
function computeAbility(traits) {
  return 0.5 * (0.3 * traits.readingLevel + 0.2 * traits.vocabularyLevel + 0.2 * traits.backgroundKnowledge + 0.15 * traits.processingSpeed + 0.15 * traits.bloomMastery);
}
function computeTraitBonus(confusionBias, timeBias) {
  return -0.2 * timeBias + -0.2 * confusionBias;
}
function buildTraitDeltas(students) {
  const totals = {
    readingLevel: 0,
    vocabularyLevel: 0,
    backgroundKnowledge: 0,
    processingSpeed: 0,
    bloomMastery: 0,
    mathLevel: 0,
    writingLevel: 0
  };
  for (const student of students) {
    for (const [trait, value] of Object.entries(student.traits)) {
      totals[trait] += value;
    }
  }
  const count = Math.max(students.length, 1);
  const output = {};
  for (const [trait, total] of Object.entries(totals)) {
    output[trait] = Number((total / count - 3).toFixed(4));
  }
  return output;
}
function buildTraitSnapshot(traitDeltas) {
  return Object.entries(traitDeltas).map(([name, delta]) => ({ name, delta }));
}
function computeAnswerKeyAdjustments(answer) {
  const normalized = answer.trim();
  if (!normalized) {
    return { answerKeyDifficultyAdjustment: 0, answerKeyPCorrectAdjustment: 0 };
  }
  const isMultipleChoice = /^[a-e]$/i.test(normalized);
  const isNumeric = /^-?\d+(\.\d+)?$/.test(normalized);
  const isSymbolic = /[=^\-+*/(){}[\]<>]/.test(normalized);
  const ambiguityScore = /[|/,]|\bor\b/i.test(normalized) ? 0.5 : 0;
  let formatComplexity = 0;
  if (isNumeric)
    formatComplexity = 0.2;
  else if (isMultipleChoice)
    formatComplexity = 0.1;
  else if (isSymbolic)
    formatComplexity = 0.55;
  else
    formatComplexity = 0.45;
  const lengthPenalty = normalized.length > 24 ? 0.25 : 0;
  const answerKeyDifficultyAdjustment = Number((ambiguityScore * 0.18 + formatComplexity * 0.12 + lengthPenalty * 0.05).toFixed(4));
  const answerKeyPCorrectAdjustment = Number(clamp(-answerKeyDifficultyAdjustment * 0.55, -0.3, 0.2).toFixed(4));
  return { answerKeyDifficultyAdjustment, answerKeyPCorrectAdjustment };
}
function computeWorkedSolutionAdjustments(steps, baseDifficulty) {
  if (!steps || steps.length === 0) {
    return {
      stepDifficultyCurve: [],
      stepTimeCurve: [],
      stepCognitiveLoadCurve: [],
      branchingFactor: 1,
      errorOpportunityCount: 0
    };
  }
  let symbolCount = 0;
  let characterCount = 0;
  const stepDifficultyCurve = [];
  const stepTimeCurve = [];
  const stepCognitiveLoadCurve = [];
  steps.forEach((step, index) => {
    const words = step.split(/\s+/).filter(Boolean).length;
    const symbols = (step.match(/[=+\-*/^<>()[\]{}]/g) ?? []).length;
    symbolCount += symbols;
    characterCount += Math.max(step.length, 1);
    const lower = step.toLowerCase();
    let stepTypeComplexity = 0.4;
    if (/calculate|compute|solve|simplify|substitute|evaluate/.test(lower)) {
      stepTypeComplexity = 0.45;
    } else if (/infer|conclude|deduce|imply|therefore/.test(lower)) {
      stepTypeComplexity = 0.75;
    } else if (/define|concept|principle|why|because/.test(lower)) {
      stepTypeComplexity = 0.68;
    } else if (/first|next|then|step|procedure|algorithm/.test(lower)) {
      stepTypeComplexity = 0.55;
    }
    const positionLift = Math.min(index / Math.max(steps.length - 1, 1), 1) * 0.15;
    stepDifficultyCurve.push(Number(clamp(baseDifficulty + stepTypeComplexity * 0.35 + positionLift, 0, 1).toFixed(4)));
    stepTimeCurve.push(Number(Math.max(8, words * 2.1 + symbols * 1.8 + stepTypeComplexity * 9).toFixed(4)));
    stepCognitiveLoadCurve.push(Number(clamp(stepTypeComplexity * 0.8 + symbols * 0.03, 0, 1).toFixed(4)));
  });
  const transformationDensity = characterCount > 0 ? symbolCount / characterCount : 0;
  const branchingFactor = Math.max(1, Math.min(6, Math.round(steps.length / 2)));
  const errorOpportunityCount = Math.max(1, steps.length - 1 + (branchingFactor - 1));
  return {
    stepDifficultyCurve,
    stepTimeCurve,
    stepCognitiveLoadCurve,
    branchingFactor,
    errorOpportunityCount
  };
}
function computeRubricAdjustments(rubricText) {
  const normalized = String(rubricText ?? "").trim().toLowerCase();
  if (!normalized) {
    return {
      rubricStrictness: 0,
      rubricTolerance: 0,
      partialCreditEnabled: false,
      requiredElementsCount: 0,
      qualityThreshold: 0.65
    };
  }
  const strictMarkers = (normalized.match(/strict|must include|required|deduct|penalty/g) ?? []).length;
  const toleranceMarkers = (normalized.match(/partial credit|attempt|alternative|equivalent|accept/g) ?? []).length;
  const requiredElementsCount = Math.max((normalized.match(/required|criterion|criteria|must include/g) ?? []).length, 0);
  const partialCreditEnabled = /partial credit|partial|attempt/.test(normalized);
  const qualityThreshold = clamp(0.55 + strictMarkers * 0.03 - toleranceMarkers * 0.02, 0.35, 0.95);
  const rubricStrictness = clamp(strictMarkers * 0.12 + requiredElementsCount * 0.06 + qualityThreshold * 0.5, 0, 1);
  const rubricTolerance = clamp(toleranceMarkers * 0.14 + (1 - rubricStrictness) * 0.35, 0, 1);
  return {
    rubricStrictness: Number(rubricStrictness.toFixed(4)),
    rubricTolerance: Number(rubricTolerance.toFixed(4)),
    partialCreditEnabled,
    requiredElementsCount,
    qualityThreshold: Number(qualityThreshold.toFixed(4))
  };
}
async function loadItemTraitsFromDb(documentId) {
  if (!documentId) return [];
  try {
    const { url, key } = supabaseAdmin();
    const reqUrl = new URL(`${url}/rest/v1/v4_items`);
    reqUrl.searchParams.set("select", "id,item_number,metadata");
    reqUrl.searchParams.set("document_id", `eq.${documentId}`);
    reqUrl.searchParams.set("order", "item_number.asc");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(reqUrl.toString(), {
        method: "GET",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
function buildMeasurableFromDbItem(row) {
  const meta = row.metadata ?? {};
  const final = meta.final ?? meta.base ?? {};
  const bloomLevel = clamp(Number(final.bloomLevel ?? meta.bloomLevel ?? 2), 1, 6);
  const linguisticLoad = clamp(Number(final.linguisticLoad ?? meta.linguisticLoad ?? 0.5), 0, 1);
  const cognitiveLoad = clamp(Number(final.cognitiveLoad ?? meta.cognitiveLoad ?? 0.5), 0, 1);
  const representationLoad = clamp(Number(final.representationLoad ?? meta.representationLoad ?? 0.4), 0, 1);
  const confusionScore = clamp(Number(final.confusionScore ?? cognitiveLoad * 0.5 + linguisticLoad * 0.3), 0, 1);
  const baseTimeSeconds = Number(final.timeSeconds ?? Math.max(20, 21 + 20 * linguisticLoad + 10 * representationLoad));
  const stepCount = Math.max(1, Number(final.stepCount ?? 2));
  const branchingFactor = Math.max(1, Number(final.branchingFactor ?? 1));
  const errorOpportunityCount = Math.max(1, Number(final.errorOpportunityCount ?? Math.max(1, stepCount - 1)));
  const answerKeyDifficultyAdjustment = Number(final.difficultyScore && meta.base?.difficultyScore ? Math.max(0, final.difficultyScore - (meta.base.difficultyScore ?? 0)) : 0);
  const answerKeyPCorrectAdjustment = Number(final.pCorrectAdjustment ?? 0);
  const rubricStrictness = Number(final.rubricStrictness ?? 0);
  const rubricTolerance = Number(final.rubricTolerance ?? 0);
  const partialCreditEnabled = Boolean(final.partialCreditEnabled ?? false);
  const requiredElementsCount = Number(final.requiredElementsCount ?? 0);
  const qualityThreshold = Number(final.qualityThreshold ?? 0.65);
  const stepDifficultyCurve = Array.isArray(final.stepDifficultyCurve) && final.stepDifficultyCurve.length > 0
    ? final.stepDifficultyCurve
    : Array.from({ length: stepCount }, (_, i) => Number(clamp(confusionScore + 0.15 + i * 0.06, 0, 1).toFixed(4)));
  const stepTimeCurve = Array.isArray(final.stepTimeCurve) && final.stepTimeCurve.length > 0
    ? final.stepTimeCurve
    : Array.from({ length: stepCount }, (_, i) => Number(Math.max(8, baseTimeSeconds / stepCount + i * 2.4).toFixed(4)));
  const stepCognitiveLoadCurve = Array.isArray(final.stepCognitiveLoadCurve) && final.stepCognitiveLoadCurve.length > 0
    ? final.stepCognitiveLoadCurve
    : Array.from({ length: stepCount }, (_, i) => Number(clamp(cognitiveLoad + i * 0.03, 0, 1).toFixed(4)));
  return {
    itemId: `item-${row.item_number}`,
    dbItemId: row.id,
    bloomLevel,
    linguisticLoad,
    cognitiveLoad,
    representationLoad,
    confusionScore,
    timeSeconds: baseTimeSeconds,
    stepDifficultyCurve,
    stepTimeCurve,
    stepCognitiveLoadCurve,
    answerKeyDifficultyAdjustment,
    answerKeyPCorrectAdjustment,
    rubricStrictness,
    rubricTolerance,
    partialCreditEnabled,
    requiredElementsCount,
    qualityThreshold,
    branchingFactor,
    errorOpportunityCount
  };
}
function simulateItem(students, baseTraitDeltas, index, previous, measurable) {
  const cfg = PHASE_C_CONFIG.formula;
  let pCorrectTotal = 0;
  let pScoreTotal = 0;
  let partialCreditTotal = 0;
  let confusionTotal = 0;
  let timeTotal = 0;
  const difficulty = computeDifficulty(measurable.linguisticLoad, measurable.cognitiveLoad, measurable.bloomLevel, measurable.representationLoad) + measurable.answerKeyDifficultyAdjustment;
  const studentPredictions = [];
  for (const student of students) {
    const readingGap = Math.max(0, measurable.linguisticLoad - student.traits.readingLevel);
    const vocabularyGap = Math.max(0, measurable.linguisticLoad - student.traits.vocabularyLevel);
    const bloomGap = Math.max(0, measurable.bloomLevel - student.traits.bloomMastery);
    const speedPenalty = Math.max(0, (cfg.baselineProcessingCenter - student.traits.processingSpeed) / cfg.processingPenaltyDivisor);
    const knowledgePenalty = Math.max(0, (cfg.baselineKnowledgeCenter - student.traits.backgroundKnowledge) / cfg.processingPenaltyDivisor);
    const confusionProfile = clamp(mean(measurable.stepCognitiveLoadCurve, measurable.confusionScore) + Math.min((measurable.branchingFactor - 1) * 0.04, 0.2) + Math.min(measurable.errorOpportunityCount * 0.01, 0.1) + cfg.readingGapToConfusion * readingGap + cfg.vocabularyGapToConfusion * vocabularyGap + cfg.bloomGapToConfusion * bloomGap + cfg.speedPenaltyToConfusion * speedPenalty + cfg.knowledgePenaltyToConfusion * knowledgePenalty, cfg.minConfusionScore, cfg.maxConfusionScore);
    const timeProfile = Math.max(0, measurable.stepTimeCurve.reduce((total, value) => total + value, 0) * (1 + cfg.readingGapToTime * readingGap + cfg.vocabularyGapToTime * vocabularyGap + cfg.bloomGapToTime * bloomGap + cfg.speedPenaltyToTime * speedPenalty + cfg.knowledgePenaltyToTime * knowledgePenalty));
    const confusion2 = clamp(confusionProfile * (1 + student.biases.confusionBias), 0, 1);
    const timeSeconds2 = Math.max(timeProfile * (1 + student.biases.timeBias), 0);
    const ability = computeAbility(student.traits);
    const traitBonus = computeTraitBonus(student.biases.confusionBias, student.biases.timeBias);
    const pCorrect2 = clamp(sigmoid(ability + traitBonus - difficulty) + measurable.answerKeyPCorrectAdjustment, 0, 1);
    const partialCreditProbability = measurable.partialCreditEnabled ? clamp((1 - pCorrect2) * (0.35 + measurable.rubricTolerance * 0.5) * (1 - measurable.rubricStrictness * 0.4), 0, 1) : 0;
    const pScore2 = clamp(pCorrect2 + partialCreditProbability * (0.45 + (1 - measurable.qualityThreshold) * 0.35), 0, 1);
    pCorrectTotal += pCorrect2;
    pScoreTotal += pScore2;
    partialCreditTotal += partialCreditProbability;
    confusionTotal += confusion2;
    timeTotal += timeSeconds2;
    studentPredictions.push({ studentId: student.id, confusion: confusion2, timeSeconds: timeSeconds2, pCorrect: pCorrect2, bloomGap, abilityScore: ability, difficultyScore: difficulty });
  }
  const studentCount = Math.max(students.length, 1);
  const pCorrect = pCorrectTotal / studentCount;
  const pScore = pScoreTotal / studentCount;
  const partialCreditProbability = partialCreditTotal / studentCount;
  const confusion = confusionTotal / studentCount;
  const timeSeconds = timeTotal / studentCount;
  const fatigue = clamp(0.12 + index * 0.02, 0, 1);
  const momentum = Number((previous ? pCorrect - previous.pCorrect : 0).toFixed(4));
  const z95 = 1.96;
  const pStdErr = Math.sqrt(pCorrect * Math.max(1 - pCorrect, 0) / studentCount);
  const ciLow = clamp(pCorrect - z95 * pStdErr, 0, 1);
  const ciHigh = clamp(pCorrect + z95 * pStdErr, 0, 1);
  const predictedDifficultyCurve = measurable.stepDifficultyCurve.map((value) => Number(clamp(value + Math.max(0, -momentum) * 0.1, 0, 1).toFixed(4)));
  const predictedTimeCurve = measurable.stepTimeCurve.map((value, stepIndex) => Number((value * (1 + fatigue * 0.08 + stepIndex * 0.01)).toFixed(4)));
  const predictedConfusionCurve = measurable.stepCognitiveLoadCurve.map((value) => Number(clamp(value + fatigue * 0.15, 0, 1).toFixed(4)));
  const spikes = [];
  const cliffs = [];
  if (previous) {
    const deltaConfusion = confusion - previous.confusion;
    if (deltaConfusion > 0.06) {
      spikes.push({ fromItemId: previous.itemId, deltaConfusion: Number(deltaConfusion.toFixed(4)) });
    }
    const deltaDifficulty = difficulty - previous.difficulty + Math.max(0, confusion - previous.confusion) + Math.max(0, previous.pCorrect - pCorrect);
    if (deltaDifficulty > 0.4) {
      cliffs.push({ fromItemId: previous.itemId, deltaDifficulty: Number(deltaDifficulty.toFixed(4)) });
    }
  }
  return {
    itemId: measurable.itemId,
    bloom: Number(measurable.bloomLevel.toFixed(4)),
    difficulty: Number(difficulty.toFixed(4)),
    linguisticLoad: Number(measurable.linguisticLoad.toFixed(4)),
    cognitiveLoad: Number(measurable.cognitiveLoad.toFixed(4)),
    pCorrect: Number(pCorrect.toFixed(4)),
    pScore: Number(pScore.toFixed(4)),
    partialCreditProbability: Number(partialCreditProbability.toFixed(4)),
    confusion: Number(confusion.toFixed(4)),
    timeSeconds: Number(timeSeconds.toFixed(4)),
    spikes,
    cliffs,
    fatigue: Number(fatigue.toFixed(4)),
    momentum,
    confidenceInterval: [Number(ciLow.toFixed(4)), Number(ciHigh.toFixed(4))],
    predictedDifficultyCurve,
    predictedTimeCurve,
    predictedConfusionCurve,
    predictedState: {
      fatigue: Number(fatigue.toFixed(4)),
      confusion: Number(confusion.toFixed(4)),
      momentum
    },
    profileNarrative: `Item ${measurable.itemId} projects ${confusion > 0.35 ? "heightened" : "stable"} confusion with momentum ${momentum >= 0 ? "improving" : "declining"}.`,
    rubricNarrative: measurable.partialCreditEnabled ? `Rubric allows partial credit with predicted scoring band ${(pScore * 100).toFixed(1)}%.` : "No partial-credit rubric adjustments detected.",
    comparisonNarrative: previous ? `Compared with ${previous.itemId}, projected difficulty moved by ${Number((difficulty - previous.difficulty).toFixed(4))}.` : "Baseline projection item.",
    traitDeltas: { ...baseTraitDeltas }
  ,
  studentPredictions
  };
}
async function simulateAssessment(input) {
  const students = Array.isArray(input.students) && input.students.length > 0 ? input.students : generateSyntheticStudents({
    classId: `phase1-${input.seed}`,
    classLevel: "Standard",
    profilePercentages: DEFAULT_PROFILE_PERCENTAGES,
    studentCount: input.studentCount ?? PHASE_C_CONFIG.defaultSyntheticStudentCount,
    seed: input.seed
  });
  const classStudents = students.map((student) => ({
    id: student.id,
    traits: {
      readingLevel: Number(student.traits.readingLevel.toFixed(4)),
      vocabularyLevel: Number(student.traits.vocabularyLevel.toFixed(4)),
      backgroundKnowledge: Number(student.traits.backgroundKnowledge.toFixed(4)),
      processingSpeed: Number(student.traits.processingSpeed.toFixed(4)),
      bloomMastery: Number(student.traits.bloomMastery.toFixed(4)),
      mathLevel: Number(student.traits.mathLevel.toFixed(4)),
      writingLevel: Number(student.traits.writingLevel.toFixed(4))
    }
  }));
  const baseTraitDeltas = buildTraitDeltas(classStudents);
  const dbRows = await loadItemTraitsFromDb(input.documentId);
  const measurables = dbRows.length > 0
    ? dbRows.map((row) => buildMeasurableFromDbItem(row))
    : [];
  if (measurables.length === 0) {
    return {
      engineVersion: ENGINE_VERSION,
      seed: input.seed,
      items: [],
      class: { students: classStudents },
      traits: buildTraitSnapshot(baseTraitDeltas),
      warning: "No items found for this document. Upload and ingest the test document first."
    };
  }
  const items = [];
  for (let index = 0; index < measurables.length; index += 1) {
    const previous = index > 0 ? items[index - 1] : null;
    items.push(simulateItem(students, baseTraitDeltas, index, previous, measurables[index]));
  }
  const classSnapshot = {
    students: classStudents
  };
  return {
    engineVersion: ENGINE_VERSION,
    seed: input.seed,
    items,
    class: classSnapshot,
    traits: buildTraitSnapshot(baseTraitDeltas)
  };
}

// api/v4/simulations/run.ts
var DAILY_SIMULATION_LIMIT = 20;
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}
async function supabaseRest(table, options = {}) {
  const { url, key } = supabaseAdmin();
  const { method = "GET", select, filters = {}, body, prefer, timeoutMs = 8e3 } = options;
  const reqUrl = new URL(`${url}/rest/v1/${table}`);
  if (select)
    reqUrl.searchParams.set("select", select);
  for (const [k, v] of Object.entries(filters)) {
    reqUrl.searchParams.set(k, v);
  }
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  if (prefer)
    headers["Prefer"] = prefer;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(reqUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error(`Supabase REST ${method} ${table} timed out after ${timeoutMs}ms`);
      timeoutError.code = "timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST ${method} ${table} failed (${res.status}): ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}
function getSingleHeaderValue(header) {
  return Array.isArray(header) ? header[0] ?? "" : header ?? "";
}
function parseBooleanHeader(value) {
  const normalized = String(getSingleHeaderValue(value)).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "";
  const ip = raw.split(",")[0].trim();
  return ip || "unknown";
}
function resolveActor(req) {
  const userId = getSingleHeaderValue(req.headers["x-user-id"]) || getSingleHeaderValue(req.headers["x-auth-user-id"]);
  if (userId && isUuid(userId)) {
    return { actorKey: userId, userId };
  }
  return { actorKey: getClientIp(req), userId: null };
}
function normalizeTier(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "school")
    return "school";
  if (normalized === "teacher")
    return "teacher";
  return "free";
}
function getMaxSimulationsPerDay(tier) {
  return DAILY_SIMULATION_LIMIT;
}
function isAdminSimulationOverride(req, actor) {
  if (parseBooleanHeader(req.headers["x-admin-override"])) {
    return true;
  }
  const allowed = String(process.env.SIMULATION_QUOTA_ADMIN_OVERRIDE_USERS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  return Boolean(actor.userId && allowed.includes(actor.userId));
}
async function getDailySimulationUsage(actorKey, date) {
  if (!actorKey) {
    return 0;
  }
  try {
    const rows = await supabaseRest("user_daily_simulations", {
      method: "GET",
      select: "simulations_run",
      filters: {
        user_id: `eq.${actorKey}`,
        date: `eq.${date}`
      }
    });
    if (Array.isArray(rows) && rows.length > 0) {
      const value = Number(rows[0]?.simulations_run ?? 0);
      return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    }
  } catch {
    return 0;
  }
  return 0;
}
async function incrementDailySimulationUsage(params) {
  if (!params.userId) {
    return 0;
  }
  const current = await getDailySimulationUsage(params.userId, params.date);
  try {
    await supabaseRest("user_daily_simulations", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: {
        user_id: params.userId,
        date: params.date,
        simulations_run: current + 1
      }
    });
  } catch {
    return current;
  }
  return current + 1;
}
async function logSystemEvent(params) {
  try {
    await supabaseRest("system_events", {
      method: "POST",
      body: {
        user_id: params.userId,
        actor_key: params.actorKey,
        event_type: params.eventType,
        event_payload: params.eventPayload
      }
    });
  } catch {
  }
}
function sendError(res, code, message, httpStatus) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(httpStatus).json({ error: { code, message } });
}
function parseBody(body) {
  if (body === null || body === void 0)
    return {};
  if (typeof body === "object" && !Array.isArray(body))
    return body;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
        return parsed;
      return {};
    } catch {
      return null;
    }
  }
  return {};
}
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-auth-user-id, x-user-tier, x-admin-override");
}
function parseAnswerKeyText(text) {
  if (!text || typeof text !== "string")
    return {};
  const result = {};
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  for (const line of lines) {
    const match = line.match(/^(?:\s*)(\d+)[\s.)\-:]+(.+)$/i);
    if (match?.[1] && match[2]) {
      const itemNum = Number(match[1]);
      const answer = match[2].trim();
      if (Number.isFinite(itemNum) && answer.length > 0) {
        result[itemNum] = answer;
      }
    }
  }
  return result;
}
function parseWorkedSolutionsText(text) {
  if (!text || typeof text !== "string")
    return {};
  const result = {};
  let currentItem = null;
  let currentSteps = [];
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  for (const line of lines) {
    const itemMatch = line.match(/^(?:Item|Problem|Q(?:uestion)?)\s+(\d+)[.:\s]|^(\d+)[.)\s]/i);
    if (itemMatch) {
      if (currentItem !== null && currentSteps.length > 0) {
        result[currentItem] = currentSteps;
      }
      currentItem = Number(itemMatch[1] ?? itemMatch[2]);
      currentSteps = [];
    } else if (currentItem !== null) {
      const stepText = line.replace(/^[\s•\-*]+/, "").trim();
      if (stepText.length > 0) {
        currentSteps.push(stepText);
      }
    }
  }
  if (currentItem !== null && currentSteps.length > 0) {
    result[currentItem] = currentSteps;
  }
  return result;
}
function parseRubricText(text) {
  if (!text || typeof text !== "string")
    return {};
  const result = {};
  let currentItem = null;
  let currentLines = [];
  const lines = text.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const itemMatch = line.match(/^(?:Item|Problem|Q(?:uestion)?)\s+(\d+)[.:\s]|^(\d+)[.)\s]/i);
    if (itemMatch) {
      if (currentItem !== null && currentLines.length > 0) {
        result[currentItem] = currentLines.join(" ");
      }
      currentItem = Number(itemMatch[1] ?? itemMatch[2]);
      currentLines = [];
      const remainder = line.replace(/^(?:Item|Problem|Q(?:uestion)?)\s+(\d+)[.:\s]|^(\d+)[.)\s]/i, "").trim();
      if (remainder) {
        currentLines.push(remainder);
      }
      continue;
    }
    if (currentItem !== null) {
      currentLines.push(line.replace(/^[\s•\-*]+/, "").trim());
    }
  }
  if (currentItem !== null && currentLines.length > 0) {
    result[currentItem] = currentLines.join(" ");
  }
  return result;
}
function hydrateSimulationStudentRow(row) {
  const profiles = Array.isArray(row.profiles) ? row.profiles : [];
  const positiveTraits = Array.isArray(row.positive_traits) ? row.positive_traits : [];
  return {
    id: row.id,
    classId: row.class_id,
    displayName: row.display_name,
    traits: {
      readingLevel: Number(row.reading_level ?? 3),
      vocabularyLevel: Number(row.vocabulary_level ?? 3),
      backgroundKnowledge: Number(row.background_knowledge ?? 3),
      processingSpeed: Number(row.processing_speed ?? 3),
      bloomMastery: Number(row.bloom_mastery ?? 3),
      mathLevel: Number(row.math_level ?? 3),
      writingLevel: Number(row.writing_level ?? 3)
    },
    profiles,
    positiveTraits,
    profileSummaryLabel: typeof row.profile_summary_label === "string" && row.profile_summary_label.trim().length > 0 ? row.profile_summary_label : profileSummaryLabel(profiles, positiveTraits),
    biases: row.biases ?? { confusionBias: 0, timeBias: 0 }
  };
}
async function getExistingSimulationStudentsForClass(classId) {
  try {
    const rows = await supabaseRest("synthetic_students", {
      method: "GET",
      select: "id,class_id,display_name,reading_level,vocabulary_level,background_knowledge,processing_speed,bloom_mastery,math_level,writing_level,profiles,positive_traits,profile_summary_label,biases",
      filters: {
        class_id: `eq.${classId}`,
        order: "display_name.asc"
      }
    });
    return Array.isArray(rows) ? rows.map((row) => hydrateSimulationStudentRow(row)) : [];
  } catch {
    return [];
  }
}
async function persistSimulationToSupabase(simulationId, classId, documentId, createdAt, snapshot) {
  try {
    await supabaseRest("simulation_runs", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        id: simulationId,
        class_id: classId,
        document_id: documentId,
        created_at: createdAt
      }
    });
    const students = Array.isArray(snapshot?.class?.students) ? snapshot.class.students : [];
    if (students.length > 0) {
      await supabaseRest("synthetic_students", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: students.map((student, index) => ({
          id: student.id,
          class_id: classId,
          display_name: `Student ${index + 1}`,
          reading_level: Number(student.traits?.readingLevel ?? 0),
          vocabulary_level: Number(student.traits?.vocabularyLevel ?? 0),
          background_knowledge: Number(student.traits?.backgroundKnowledge ?? 0),
          processing_speed: Number(student.traits?.processingSpeed ?? 0),
          bloom_mastery: Number(student.traits?.bloomMastery ?? 0),
          math_level: Number(student.traits?.mathLevel ?? 0),
          writing_level: Number(student.traits?.writingLevel ?? 0)
        }))
      });
    }
    const resultsToInsert = [];
    for (const item of snapshot.items) {
      const predByStudentId = new Map((item.studentPredictions ?? []).map((p) => [p.studentId, p]));
      for (const student of students) {
        const pred = predByStudentId.get(student.id);
        const result = {
          id: randomUUID(),
          simulation_id: simulationId,
          synthetic_student_id: student.id,
          item_id: item.itemId,
          item_label: item.itemId,
          linguistic_load: Number(item.linguisticLoad ?? 0),
          confusion_score: Number(pred?.confusion ?? item.confusion ?? 0),
          time_seconds: Number(pred?.timeSeconds ?? item.timeSeconds ?? 0),
          bloom_gap: Number(pred?.bloomGap ?? 0),
          difficulty_score: Number(pred?.difficultyScore ?? item.difficulty ?? 0),
          ability_score: Number(pred?.abilityScore ?? 0),
          p_correct: Number(pred?.pCorrect ?? item.pCorrect ?? 0),
          traits_snapshot: {
            traits: student.traits,
            itemMeasurables: {
              base: {
                linguisticLoad: item.linguisticLoad,
                cognitiveLoad: item.cognitiveLoad,
                bloomEstimate: item.bloom,
                conceptDensity: 0,
                representationLoad: 0,
                itemLength: 0,
                readingComplexity: item.linguisticLoad,
                surfaceDifficulty: item.difficulty
              }
            },
            itemPredictions: {
              pCorrect: Number(pred?.pCorrect ?? item.pCorrect ?? 0),
              confusion: Number(pred?.confusion ?? item.confusion ?? 0),
              timeSeconds: Number(pred?.timeSeconds ?? item.timeSeconds ?? 0),
              bloomGap: Number(pred?.bloomGap ?? 0),
              difficultyScore: Number(pred?.difficultyScore ?? item.difficulty ?? 0),
              abilityScore: Number(pred?.abilityScore ?? 0),
              predictedDifficultyCurve: item.predictedDifficultyCurve,
              predictedTimeCurve: item.predictedTimeCurve,
              predictedConfusionCurve: item.predictedConfusionCurve,
              predictedState: item.predictedState,
              fatigue: item.fatigue,
              momentum: item.momentum,
              confidenceInterval: item.confidenceInterval,
              pScore: item.pScore,
              partialCreditProbability: item.partialCreditProbability,
              rubricNarrative: item.rubricNarrative
            }
          }
        };
        resultsToInsert.push(result);
      }
    }
    if (resultsToInsert.length > 0) {
      await supabaseRest("simulation_results", {
        method: "POST",
        prefer: "return=minimal",
        body: resultsToInsert
      });
    }
  } catch (error) {
    console.warn("[simulation/run] Failed to persist to Supabase:", error instanceof Error ? error.message : error);
  }
}
async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return sendError(res, "method_not_allowed", "Method not allowed", 405);
  }
  const actor = resolveActor(req);
  const date = new Date().toISOString().slice(0, 10);
  const tier = normalizeTier(getSingleHeaderValue(req.headers["x-user-tier"]));
  const maxSimulationsPerDay = getMaxSimulationsPerDay(tier);
  const adminOverride = isAdminSimulationOverride(req, actor);
  const currentSimulationCount = await getDailySimulationUsage(actor.userId, date);
  if (!adminOverride && currentSimulationCount >= maxSimulationsPerDay) {
    return sendError(res, "rate_limited", `Daily simulation limit reached (${maxSimulationsPerDay} simulations/day). Try again tomorrow or contact your admin.`, 429);
  }
  try {
    const payload = parseBody(req.body);
    if (payload === null) {
      return sendError(res, "invalid_request", "Request body must be valid JSON", 400);
    }
    const mode = payload.mode ?? "class";
    if (!payload.classId || typeof payload.classId !== "string") {
      return sendError(res, "invalid_request", "classId is required and must be a string", 400);
    }
    if (!payload.documentId || typeof payload.documentId !== "string") {
      return sendError(res, "invalid_request", "documentId is required and must be a string", 400);
    }
    if (mode !== "class") {
      return sendError(res, "invalid_request", "mode must be 'class'", 400);
    }
    const answerKeyText = typeof payload.answerKeyText === "string" ? payload.answerKeyText : "";
    const workedSolutionText = typeof payload.workedSolutionText === "string" ? payload.workedSolutionText : "";
    const rubricText = typeof payload.rubricText === "string" ? payload.rubricText : "";
    const answerKeyByItem = parseAnswerKeyText(answerKeyText);
    const workedSolutionByItem = parseWorkedSolutionsText(workedSolutionText);
    const rubricByItemFromText = parseRubricText(rubricText);
    const rubricByItemFromPayload = payload.rubricByItem && typeof payload.rubricByItem === "object"
      ? Object.entries(payload.rubricByItem).reduce((accumulator, [itemKey, value]) => {
          if (typeof value === "string" && value.trim().length > 0) {
            accumulator[itemKey] = value.trim();
          }
          return accumulator;
        }, {})
      : {};
    const rubricByItem = {
      ...rubricByItemFromText,
      ...rubricByItemFromPayload
    };
    const requestSeed = typeof payload.seed === "string" ? payload.seed : "";
    const baseSeed = `${payload.classId}::${payload.documentId}`;
    const combinedSeed = requestSeed ? `${baseSeed}::${requestSeed}` : baseSeed;
    const existingStudents = await getExistingSimulationStudentsForClass(payload.classId);
    const snapshot = await simulateAssessment({
      seed: combinedSeed,
      documentId: payload.documentId,
      studentCount: payload.studentCount,
      students: existingStudents.length > 0 ? existingStudents : void 0
    });
    const simulationId = randomUUID();
    const createdAt = new Date().toISOString();
    const resultCount = snapshot.items.length * snapshot.class.students.length;
    persistSimulationToSupabase(simulationId, payload.classId, payload.documentId, createdAt, snapshot).catch((err) => console.warn("Background persistence failed:", err));
    await incrementDailySimulationUsage({
      actorKey: actor.actorKey,
      userId: actor.userId,
      date,
      tier,
      adminOverride
    });
    await logSystemEvent({
      userId: actor.userId,
      actorKey: actor.actorKey,
      eventType: "simulation",
      eventPayload: {
        classId: payload.classId,
        assessmentId: payload.documentId,
        simulationId,
        mode,
        resultCount,
        engineVersion: snapshot.engineVersion,
        hasAnswerKeyOverride: Object.keys(answerKeyByItem).length > 0,
        hasWorkedSolutionOverride: Object.keys(workedSolutionByItem).length > 0,
        hasRubricOverride: Object.keys(rubricByItem).length > 0
      }
    });
    return res.status(201).json({
      simulationId,
      classId: payload.classId,
      documentId: payload.documentId,
      createdAt,
      resultCount,
      mode,
      selectedProfileIds: Array.isArray(payload.selectedProfileIds) ? payload.selectedProfileIds : [],
      snapshot
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation run failed";
    console.error("[simulation/run] error:", message);
    return sendError(res, "internal_error", "Simulation run failed", 500);
  }
}
var runtime = "nodejs";
var run_default = handler;
export {
  run_default as default,
  runtime
};
