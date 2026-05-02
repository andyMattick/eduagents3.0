"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/classes/index.ts
import { randomUUID } from "crypto";
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
  return {
    readingLevel: base.readingLevel + (delta.readingLevel ?? 0),
    vocabularyLevel: base.vocabularyLevel + (delta.vocabularyLevel ?? 0),
    backgroundKnowledge: base.backgroundKnowledge + (delta.backgroundKnowledge ?? 0),
    processingSpeed: base.processingSpeed + (delta.processingSpeed ?? 0),
    bloomMastery: base.bloomMastery + (delta.bloomMastery ?? 0),
    mathLevel: base.mathLevel + (delta.mathLevel ?? 0),
    writingLevel: base.writingLevel + (delta.writingLevel ?? 0)
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
function randomNormal(rng, mean = 0, stdev = 1) {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = Math.max(rng(), Number.EPSILON);
  const mag = Math.sqrt(-2 * Math.log(u1));
  const z0 = mag * Math.cos(2 * Math.PI * u2);
  return z0 * stdev + mean;
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
  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer,
    timeoutMs = 8e3
  } = options;
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
  const timeoutId = setTimeout(() => { controller.abort(); }, timeoutMs);
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
var classesMemory = /* @__PURE__ */ new Map();
var studentsMemory = /* @__PURE__ */ new Map();
var phaseCSupabaseDisabled = false;
var LEGACY_PROFILE_FALLBACK = {
  ell: 10,
  sped: 10,
  adhd: 10,
  dyslexia: 10,
  gifted: 10,
  attention504: 10
};
function canUseSupabase() {
  return !phaseCSupabaseDisabled && typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function isSupabaseSchemaCacheError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("PGRST205") || error.message.includes("PGRST204") || error.message.includes("Could not find the table");
}
function disableSupabaseForPhaseC(reason) {
  if (phaseCSupabaseDisabled) {
    return;
  }
  phaseCSupabaseDisabled = true;
  const detail = reason instanceof Error ? reason.message : String(reason);
  console.warn(`Phase C: disabling Supabase persistence and falling back to in-memory store. ${detail}`);
}
function currentSchoolYear(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}
function normalizeClassRow(item) {
  return {
    id: item.id,
    teacher_id: item.teacherId ?? null,
    name: item.name,
    level: item.level,
    grade_band: item.gradeBand ?? null,
    school_year: item.schoolYear,
    created_at: item.createdAt
  };
}
function hydrateClassRow(row) {
  return {
    id: row.id,
    teacherId: row.teacher_id ?? void 0,
    name: row.name,
    level: row.level,
    gradeBand: row.grade_band ?? void 0,
    schoolYear: row.school_year,
    createdAt: row.created_at
  };
}
function normalizeStudentRow(item) {
  return {
    id: item.id,
    class_id: item.classId,
    display_name: item.displayName,
    reading_level: item.traits.readingLevel,
    vocabulary_level: item.traits.vocabularyLevel,
    background_knowledge: item.traits.backgroundKnowledge,
    processing_speed: item.traits.processingSpeed,
    bloom_mastery: item.traits.bloomMastery,
    math_level: item.traits.mathLevel,
    writing_level: item.traits.writingLevel,
    profiles: item.profiles,
    positive_traits: item.positiveTraits,
    profile_summary_label: item.profileSummaryLabel,
    biases: item.biases
  };
}
function isZeroProfilePercentages(profilePercentages) {
  if (!profilePercentages) {
    return true;
  }
  return Object.values(profilePercentages).every((value) => Number(value ?? 0) <= 0);
}
function resolveRequestedProfilePercentages(profilePercentages) {
  return isZeroProfilePercentages(profilePercentages) ? { ...LEGACY_PROFILE_FALLBACK } : profilePercentages;
}
async function createClassWithSyntheticStudents(input) {
  const classRecord = {
    id: randomUUID(),
    teacherId: input.teacherId,
    name: input.name,
    level: input.level,
    gradeBand: input.gradeBand,
    schoolYear: input.schoolYear ?? currentSchoolYear(),
    createdAt: new Date().toISOString()
  };
  const students = generateSyntheticStudents({
    classId: classRecord.id,
    classLevel: classRecord.level,
    profilePercentages: resolveRequestedProfilePercentages(input.profilePercentages),
    studentCount: input.studentCount ?? PHASE_C_CONFIG.defaultSyntheticStudentCount,
    seed: input.seed
  });
  classesMemory.set(classRecord.id, classRecord);
  studentsMemory.set(classRecord.id, students);
  if (canUseSupabase()) {
    try {
      await supabaseRest("classes", {
        method: "POST",
        body: normalizeClassRow(classRecord),
        prefer: "return=minimal"
      });
      if (students.length > 0) {
        await supabaseRest("synthetic_students", {
          method: "POST",
          body: students.map((student) => normalizeStudentRow(student)),
          prefer: "return=minimal"
        });
      }
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  return { classRecord, students };
}
async function listClasses(teacherId) {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("classes", {
        method: "GET",
        select: "id,teacher_id,name,level,grade_band,school_year,created_at",
        filters: {
          order: "created_at.desc",
          ...teacherId ? { teacher_id: `eq.${teacherId}` } : {}
        }
      });
      return (rows ?? []).map((row) => hydrateClassRow(row));
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  const values = Array.from(classesMemory.values());
  const filtered = teacherId ? values.filter((item) => item.teacherId === teacherId) : values;
  return filtered.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
var runtime = "nodejs";
function parseBody(body) {
  if (typeof body !== "string") {
    return body;
  }
  return JSON.parse(body);
}
function parseTeacherId(req) {
  const value = req.headers?.["x-user-id"];
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === "string" && single.trim().length > 0 ? single.trim() : void 0;
}
async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const teacherId = parseTeacherId(req);
      const classes = await listClasses(teacherId);
      return res.status(200).json({ classes });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Class listing failed" });
    }
  }
  if (req.method === "POST") {
    try {
      const payload = parseBody(req.body ?? {});
      if (!payload.className || !payload.classLevel || !payload.profilePercentages) {
        return res.status(400).json({ error: "className, classLevel, and profilePercentages are required" });
      }
      const teacherId = parseTeacherId(req);
      const result = await createClassWithSyntheticStudents({
        teacherId,
        name: payload.className,
        level: payload.classLevel,
        gradeBand: payload.gradeBand,
        schoolYear: payload.schoolYear,
        studentCount: payload.studentCount,
        seed: payload.seed,
        profilePercentages: payload.profilePercentages
      });
      return res.status(201).json({
        class: result.classRecord,
        students: result.students
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Class creation failed" });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
export {
  handler as default,
  runtime
};
