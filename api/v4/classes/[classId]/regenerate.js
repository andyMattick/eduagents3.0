"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/classes/[classId]/regenerate.ts
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
function hydrateStudentRow(row) {
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
    profiles: row.profiles ?? [],
    positiveTraits: row.positive_traits ?? [],
    profileSummaryLabel: row.profile_summary_label,
    biases: row.biases ?? { confusionBias: 0, timeBias: 0 }
  };
}
function needsLegacyProfileBackfill(students) {
  return students.length > 0 && students.every((student) => student.profiles.length === 0 && student.positiveTraits.length === 0);
}
function deriveProfilePercentagesFromStudents(students) {
  if (students.length === 0 || needsLegacyProfileBackfill(students)) {
    return { ...LEGACY_PROFILE_FALLBACK };
  }
  const total = students.length;
  const ratioToPercent = (count) => count / total * 100;
  const adhdCount = students.filter((student) => student.profiles.includes("ADHD")).length;
  return {
    ell: ratioToPercent(students.filter((student) => student.profiles.includes("ELL")).length),
    sped: ratioToPercent(students.filter((student) => student.profiles.includes("SPED")).length),
    adhd: ratioToPercent(adhdCount),
    dyslexia: ratioToPercent(students.filter((student) => student.profiles.includes("Dyslexic")).length),
    gifted: ratioToPercent(students.filter((student) => student.profiles.includes("Gifted")).length),
    attention504: ratioToPercent(adhdCount)
  };
}
async function getClassById(classId) {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("classes", {
        method: "GET",
        select: "id,teacher_id,name,level,grade_band,school_year,created_at",
        filters: { id: `eq.${classId}` }
      });
      const row = (rows ?? [])[0];
      return row ? hydrateClassRow(row) : null;
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  return classesMemory.get(classId) ?? null;
}
async function getSyntheticStudentsForClass(classId) {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("synthetic_students", {
        method: "GET",
        select: "id,class_id,display_name,reading_level,vocabulary_level,background_knowledge,processing_speed,bloom_mastery,math_level,writing_level,profiles,positive_traits,profile_summary_label,biases",
        filters: {
          class_id: `eq.${classId}`,
          order: "display_name.asc"
        }
      });
      return (rows ?? []).map((row) => hydrateStudentRow(row));
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  return [...studentsMemory.get(classId) ?? []];
}
async function regenerateClassStudents(input) {
  const classRecord = await getClassById(input.classId);
  if (!classRecord) {
    throw new Error("Class not found");
  }
  const existingStudents = await getSyntheticStudentsForClass(classRecord.id);
  const profilePercentages = input.profilePercentages ?? deriveProfilePercentagesFromStudents(existingStudents);
  const students = generateSyntheticStudents({
    classId: classRecord.id,
    classLevel: classRecord.level,
    profilePercentages,
    studentCount: input.studentCount ?? PHASE_C_CONFIG.defaultSyntheticStudentCount,
    seed: input.seed
  });
  studentsMemory.set(classRecord.id, students);
  if (canUseSupabase()) {
    try {
      await supabaseRest("synthetic_students", {
        method: "DELETE",
        filters: { class_id: `eq.${classRecord.id}` },
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
  return students;
}
var runtime = "nodejs";
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
  if (tier === "school") {
    const configured = Number(process.env.MAX_SIMULATIONS_PER_DAY_SCHOOL);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 100;
  }
  if (tier === "teacher") {
    const configured = Number(process.env.MAX_SIMULATIONS_PER_DAY_TEACHER);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 50;
  }
  const configured = Number(process.env.MAX_SIMULATIONS_PER_DAY_FREE);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 10;
}
function isAdminSimulationOverride(req, actor) {
  if (parseBooleanHeader(req.headers["x-admin-override"])) {
    return true;
  }
  const allowed = String(process.env.SIMULATION_QUOTA_ADMIN_OVERRIDE_USERS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  return Boolean(actor.userId && allowed.includes(actor.userId));
}
async function getDailySimulationUsage(actorKey, date) {
  try {
    const rows = await supabaseRest("user_daily_simulations", {
      method: "GET",
      select: "simulations_run",
      filters: {
        actor_key: `eq.${actorKey}`,
        usage_date: `eq.${date}`
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
  const current = await getDailySimulationUsage(params.actorKey, params.date);
  await supabaseRest("user_daily_simulations", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      actor_key: params.actorKey,
      user_id: params.userId,
      usage_date: params.date,
      simulations_run: current + 1,
      tier: params.tier,
      admin_override: params.adminOverride
    }
  });
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
function parseBody(body) {
  if (typeof body !== "string") {
    return body;
  }
  return JSON.parse(body);
}
function resolveClassId(req) {
  const value = Array.isArray(req.query.classId) ? req.query.classId[0] : req.query.classId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const actor = resolveActor(req);
  const date = new Date().toISOString().slice(0, 10);
  const tier = normalizeTier(getSingleHeaderValue(req.headers["x-user-tier"]));
  const maxSimulationsPerDay = getMaxSimulationsPerDay(tier);
  const adminOverride = isAdminSimulationOverride(req, actor);
  const simulationsRunToday = await getDailySimulationUsage(actor.actorKey, date);
  if (!adminOverride && simulationsRunToday >= maxSimulationsPerDay) {
    return res.status(429).json({
      error: `Daily simulation limit reached (${maxSimulationsPerDay} simulations/day). Try again tomorrow or contact your admin.`
    });
  }
  const classId = resolveClassId(req);
  if (!classId) {
    return res.status(400).json({ error: "classId is required" });
  }
  try {
    const payload = parseBody(req.body ?? {});
    const students = await regenerateClassStudents({
      classId,
      studentCount: payload.studentCount,
      seed: payload.seed
    });
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
        classId,
        assessmentId: null,
        operation: "regenerate_class",
        studentCount: students.length
      }
    });
    return res.status(200).json({ classId, students, studentCount: students.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regeneration failed";
    if (message === "Class not found") {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}
export {
  handler as default,
  runtime
};
