"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/simulations/run.ts
import { randomUUID } from "crypto";
import { randomUUID as randomUUID2 } from "crypto";
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
    prefer
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
  const res = await fetch(reqUrl.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
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
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function hasAnswerKey(value) {
  if (value === null || value === void 0) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    const record = value;
    if (Object.keys(record).length === 0) {
      return false;
    }
    return Object.values(record).some((entry) => {
      if (entry === null || entry === void 0) {
        return false;
      }
      if (typeof entry === "string") {
        return entry.trim().length > 0;
      }
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }
      if (typeof entry === "object") {
        return Object.keys(entry).length > 0;
      }
      return true;
    });
  }
  return true;
}
function letterToPartIndex(letter) {
  const code = letter.toLowerCase().charCodeAt(0);
  if (code >= 97 && code <= 122) {
    return code - 97 + 1;
  }
  return 0;
}
function readPath(source, path) {
  if (!source || typeof source !== "object") {
    return void 0;
  }
  const parts = path.split(".");
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return void 0;
    }
    current = current[part];
  }
  return current;
}
function readNumber(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return void 0;
}
function readBoolean(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
      }
    }
  }
  return void 0;
}
function readString(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return void 0;
}
function partIndexToSuffix(partIndex) {
  if (!Number.isFinite(partIndex) || partIndex <= 0) {
    return "";
  }
  return String.fromCharCode(96 + partIndex);
}
var PARENT_ITEM_REGEX = /^\s*\d+[\.)]\s+/;
var LETTERED_CANDIDATE_REGEX = /^\s*\(?([a-zA-Z])\)?[\.)]\s+/;
var VERB_REGEX = /\b(identify|determine|interpret|explain|calculate|find|solve|justify|evaluate|compare|describe|choose|select|compute|state|write|graph|prove|show)\b/i;
function isSubItemLine(line, parentText) {
  const text = line.trim();
  const withoutLabel = text.replace(LETTERED_CANDIDATE_REGEX, "").trim();
  const wordCount = withoutLabel.split(/\s+/).filter(Boolean).length;
  if (VERB_REGEX.test(withoutLabel)) {
    return true;
  }
  if (wordCount > 8) {
    return true;
  }
  if (wordCount <= 8 && !VERB_REGEX.test(withoutLabel)) {
    if (/[?]/.test(parentText)) {
      return false;
    }
    if (VERB_REGEX.test(parentText)) {
      return false;
    }
  }
  return true;
}
function deriveStructure(row) {
  const itemNumber = typeof row.item_number === "number" && Number.isFinite(row.item_number) ? row.item_number : void 0;
  const metadata = row.metadata;
  const metadataGroupId = readString(metadata, ["groupId", "group_id", "phaseB.groupId", "phaseB.group_id"]);
  const metadataPartIndexRaw = readNumber(metadata, ["partIndex", "part_index", "phaseB.partIndex", "phaseB.part_index"]);
  const metadataLogicalLabel = readString(metadata, ["logicalLabel", "logical_label", "phaseB.logicalLabel", "phaseB.logical_label"]);
  const metadataIsParent = readBoolean(metadata, ["isParent", "is_parent", "phaseB.isParent", "phaseB.is_parent"]);
  const metadataPartIndex = typeof metadataPartIndexRaw === "number" && Number.isFinite(metadataPartIndexRaw) ? Math.max(0, Math.floor(metadataPartIndexRaw)) : void 0;
  const extractedProblemId = readString(metadata, ["extractedProblemId", "extracted_problem_id", "problemId", "problem_id"]);
  if (extractedProblemId) {
    const extractedMatch = extractedProblemId.match(/^p?(\d+)([a-z])?$/i);
    if (extractedMatch?.[1]) {
      const groupId = extractedMatch[1];
      const partIndex = extractedMatch[2] ? letterToPartIndex(extractedMatch[2]) : 0;
      const logicalLabel = `${groupId}${partIndexToSuffix(partIndex)}`;
      return {
        itemNumber,
        groupId,
        partIndex,
        logicalLabel,
        isParent: metadataIsParent ?? (partIndex === 0 && !hasAnswerKey(row.answer_key))
      };
    }
  }
  if (metadataGroupId || metadataLogicalLabel || metadataPartIndex !== void 0 || metadataIsParent !== void 0) {
    const groupId = metadataGroupId ?? (metadataLogicalLabel ? metadataLogicalLabel.match(/^(\d+)/)?.[1] ?? metadataLogicalLabel : void 0) ?? (typeof itemNumber === "number" ? String(itemNumber) : row.id);
    const partIndex = metadataPartIndex ?? (metadataLogicalLabel ? letterToPartIndex(metadataLogicalLabel.slice(-1)) : 0);
    const logicalLabel = metadataLogicalLabel ?? `${groupId}${partIndexToSuffix(partIndex)}`;
    return {
      itemNumber,
      groupId,
      partIndex,
      logicalLabel,
      isParent: metadataIsParent ?? (partIndex === 0 && !hasAnswerKey(row.answer_key))
    };
  }
  const stem = (row.stem ?? "").trim();
  const answerPresent = hasAnswerKey(row.answer_key);
  const alphaNumeric = stem.match(/^(\d+)\s*([a-z])[\).:\s]/i);
  if (alphaNumeric?.[1] && alphaNumeric[2]) {
    const groupId = alphaNumeric[1];
    const suffix = alphaNumeric[2].toLowerCase();
    return {
      itemNumber,
      groupId,
      partIndex: letterToPartIndex(suffix),
      logicalLabel: `${groupId}${suffix}`,
      isParent: false
    };
  }
  const numeric = stem.match(/^(\d+)[\).:\s]/);
  if (numeric?.[1]) {
    const groupId = numeric[1];
    return {
      itemNumber,
      groupId,
      partIndex: 0,
      logicalLabel: groupId,
      isParent: !answerPresent
    };
  }
  const fallback = typeof itemNumber === "number" ? String(itemNumber) : row.id;
  return {
    itemNumber,
    groupId: fallback,
    partIndex: 0,
    logicalLabel: fallback,
    isParent: !answerPresent
  };
}
function inferMultipartPartIndices(row) {
  const metadata = row.metadata;
  const explicitCount = readNumber(metadata, ["subQuestionCount", "sub_question_count", "phaseB.subQuestionCount", "phaseB.sub_question_count"]);
  if (typeof explicitCount === "number" && Number.isFinite(explicitCount) && explicitCount > 1) {
    return Array.from({ length: Math.floor(explicitCount) }, (_, index) => index + 1);
  }
  const subItems = readPath(metadata, "subItems") ?? readPath(metadata, "sub_items") ?? readPath(metadata, "phaseB.subItems") ?? readPath(metadata, "phaseB.sub_items");
  if (Array.isArray(subItems) && subItems.length > 1) {
    return Array.from({ length: subItems.length }, (_, index) => index + 1);
  }
  if (row.answer_key && typeof row.answer_key === "object" && !Array.isArray(row.answer_key)) {
    const keys = Object.keys(row.answer_key).map((key) => key.trim().toLowerCase()).filter((key) => /^[a-z]$/.test(key)).sort();
    if (keys.length > 1) {
      return keys.map((key) => letterToPartIndex(key));
    }
  }
  const stem = row.stem ?? "";
  const lines = stem.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const parentLine = lines.find((line) => PARENT_ITEM_REGEX.test(line)) ?? lines[0] ?? "";
  const subItemCandidates = lines.filter((line) => LETTERED_CANDIDATE_REGEX.test(line));
  if (subItemCandidates.length > 0) {
    let subItemCount = 0;
    for (const candidate of subItemCandidates) {
      if (isSubItemLine(candidate, parentLine)) {
        subItemCount += 1;
      }
    }
    if (subItemCount > 0) {
      return Array.from({ length: subItemCount }, (_, index) => index + 1);
    }
    return [];
  }
  const markers = [...stem.matchAll(/(?:\(|\b)([a-z])(?:\)|\.)/gi)].map((match) => match[1]?.toLowerCase() ?? "").filter((value) => /^[a-z]$/.test(value));
  const unique = [...new Set(markers)].map((letter) => letterToPartIndex(letter)).filter((value) => value > 0);
  if (unique.length > 1) {
    return unique.sort((a, b) => a - b);
  }
  return [];
}
function estimateLinguisticLoad(stem) {
  const text = stem.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = text.split(/[.!?]+/).filter((entry) => entry.trim().length > 0).length || 1;
  const avgSentenceLength = wordCount / sentenceCount;
  return clamp(avgSentenceLength / 20, 0, 1);
}
var BLOOMS_KEYWORDS = {
  create: ["create", "design", "construct", "develop", "formulate", "compose", "invent", "generate", "produce", "plan", "build", "propose"],
  evaluate: ["evaluate", "justify", "critique", "argue", "assess", "defend", "support", "judge", "recommend", "prioritize", "verify", "validate", "debate"],
  analyze: ["analyze", "differentiate", "categorize", "examine", "investigate", "organize", "structure", "attribute", "diagram", "map", "inspect", "compare", "contrast"],
  apply: ["apply", "use", "solve", "compute", "calculate", "demonstrate", "perform", "execute", "implement", "operate", "model", "show", "carry out", "find"],
  understand: ["explain", "summarize", "describe", "interpret", "classify", "paraphrase", "outline", "discuss", "report", "restate", "illustrate", "state", "name"],
  remember: ["identify", "list", "define", "recall", "label", "match", "select", "recognize", "repeat", "choose", "underline", "point", "circle", "highlight"]
};
function inferBloomLevelFromText(text) {
  const lower = (text ?? "").toLowerCase();
  const hit = (keywords) => keywords.some((keyword) => lower.includes(keyword));
  if (hit(BLOOMS_KEYWORDS.create))
    return 6;
  if (hit(BLOOMS_KEYWORDS.evaluate))
    return 5;
  if (hit(BLOOMS_KEYWORDS.analyze))
    return 4;
  if (hit(BLOOMS_KEYWORDS.apply))
    return 3;
  if (hit(BLOOMS_KEYWORDS.understand))
    return 2;
  if (hit(BLOOMS_KEYWORDS.remember))
    return 1;
  return 3;
}
function toNormalizedItems(row) {
  const structure = deriveStructure(row);
  const metadata = row.metadata;
  const linguisticLoad = clamp(readNumber(metadata, ["linguisticLoad", "linguistic_load", "phaseB.linguisticLoad", "phaseB.linguistic_load", "metrics.linguistic_load"]) ?? estimateLinguisticLoad(row.stem ?? ""), 0, 1);
  const cognitiveLoad = clamp(readNumber(metadata, ["cognitiveLoad", "cognitive_load", "phaseB.cognitiveLoad", "phaseB.cognitive_load", "metrics.cognitive_load"]) ?? linguisticLoad, 0, 1);
  const representationLoad = clamp(readNumber(metadata, ["representationLoad", "representation_load", "phaseB.representationLoad", "phaseB.representation_load", "metrics.representation_load"]) ?? 0.5, 0, 1);
  const bloomLevel = clamp(readNumber(metadata, ["bloomLevel", "bloom_level", "bloomsLevel", "phaseB.bloomLevel", "phaseB.bloom_level", "phaseB.bloomsLevel", "metrics.bloom_level", "metrics.blooms_level"]) ?? inferBloomLevelFromText(row.stem ?? ""), 1, 6);
  const vocabLevel1 = readNumber(metadata, ["vocabCounts.level1", "vocab_counts.level1", "metrics.vocab_counts.level1", "metrics.vocabCounts.level1"]) ?? 0;
  const vocabLevel2 = readNumber(metadata, ["vocabCounts.level2", "vocab_counts.level2", "metrics.vocab_counts.level2", "metrics.vocabCounts.level2"]) ?? 0;
  const vocabLevel3 = readNumber(metadata, ["vocabCounts.level3", "vocab_counts.level3", "metrics.vocab_counts.level3", "metrics.vocabCounts.level3"]) ?? 0;
  const vocabDensity = vocabLevel1 + vocabLevel2 + vocabLevel3;
  const symbolDensity = readNumber(metadata, ["symbolDensity", "symbol_density", "metrics.symbol_density"]);
  const steps = readNumber(metadata, ["steps", "phaseB.steps", "metrics.steps"]);
  const baseItem = {
    itemId: row.id,
    itemNumber: structure.itemNumber,
    groupId: structure.groupId,
    partIndex: structure.partIndex,
    logicalLabel: structure.logicalLabel,
    isParent: structure.isParent,
    traits: {
      bloomLevel,
      linguisticLoad,
      cognitiveLoad,
      representationLoad,
      vocabDensity: vocabDensity > 0 ? vocabDensity : void 0,
      symbolDensity,
      steps
    }
  };
  if (!baseItem.isParent || baseItem.partIndex > 0) {
    return [baseItem];
  }
  const inferredParts = inferMultipartPartIndices(row);
  if (inferredParts.length === 0) {
    return [baseItem];
  }
  return inferredParts.map((partIndex) => ({
    ...baseItem,
    itemId: `${row.id}::part-${partIndex}`,
    partIndex,
    logicalLabel: `${baseItem.groupId}${partIndexToSuffix(partIndex)}`,
    isParent: false
  }));
}
function sortNormalizedItems(items) {
  return [...items].sort((a, b) => {
    if (a.groupId !== b.groupId) {
      return a.groupId.localeCompare(b.groupId, void 0, { numeric: true });
    }
    if (a.partIndex !== b.partIndex) {
      return a.partIndex - b.partIndex;
    }
    const aNumber = a.itemNumber ?? Number.POSITIVE_INFINITY;
    const bNumber = b.itemNumber ?? Number.POSITIVE_INFINITY;
    return aNumber - bNumber;
  });
}
function isSyntheticPartItem(item) {
  return item.partIndex > 0 && item.itemId.includes("::part-");
}
function dedupeNormalizedItems(items) {
  const byItemId = /* @__PURE__ */ new Map();
  for (const item of items) {
    byItemId.set(item.itemId, item);
  }
  const uniqueById = [...byItemId.values()];
  const byGroupPart = /* @__PURE__ */ new Map();
  for (const item of uniqueById) {
    const key = `${item.groupId}::${item.partIndex}`;
    const bucket = byGroupPart.get(key) ?? [];
    bucket.push(item);
    byGroupPart.set(key, bucket);
  }
  const deduped = [];
  for (const bucket of byGroupPart.values()) {
    const hasReal = bucket.some((entry) => !isSyntheticPartItem(entry));
    if (!hasReal) {
      deduped.push(...bucket);
      continue;
    }
    deduped.push(...bucket.filter((entry) => !isSyntheticPartItem(entry)));
  }
  const sorted = sortNormalizedItems(deduped);
  const byLabel = /* @__PURE__ */ new Map();
  for (const item of sorted) {
    const key = item.logicalLabel ?? item.itemId;
    const existing = byLabel.get(key);
    if (!existing) {
      byLabel.set(key, item);
    } else if (isSyntheticPartItem(existing) && !isSyntheticPartItem(item)) {
      byLabel.set(key, item);
    }
  }
  return sortNormalizedItems([...byLabel.values()]);
}
async function normalizeItemsPhaseB(documentId) {
  const rows = await supabaseRest("v4_items", {
    method: "GET",
    select: "id,item_number,stem,answer_key,metadata",
    filters: {
      document_id: `eq.${documentId}`,
      order: "item_number.asc"
    }
  });
  const normalizedRaw = (rows ?? []).flatMap((row) => toNormalizedItems(row));
  const normalized = dedupeNormalizedItems(normalizedRaw);
  const groupsWithChildren = new Set(normalized.filter((item) => item.partIndex > 0).map((item) => item.groupId));
  const withoutMultipartParents = normalized.filter((item) => !item.isParent || !groupsWithChildren.has(item.groupId));
  const effectiveItems = withoutMultipartParents.length > 0 ? withoutMultipartParents : normalized;
  return {
    items: sortNormalizedItems(effectiveItems)
  };
}
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
function clamp2(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
var classesMemory = /* @__PURE__ */ new Map();
var studentsMemory = /* @__PURE__ */ new Map();
var simulationRunsMemory = /* @__PURE__ */ new Map();
var simulationResultsMemory = /* @__PURE__ */ new Map();
var phaseCSupabaseDisabled = false;
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
function normalizeSimulationRun(run) {
  return {
    id: run.id,
    class_id: run.classId,
    document_id: run.documentId,
    created_at: run.createdAt
  };
}
function normalizeSimulationResult(result) {
  return {
    id: result.id,
    simulation_id: result.simulationId,
    synthetic_student_id: result.syntheticStudentId,
    item_id: result.itemId,
    item_label: result.itemLabel,
    linguistic_load: result.linguisticLoad,
    confusion_score: result.confusionScore,
    time_seconds: result.timeSeconds,
    bloom_gap: result.bloomGap,
    difficulty_score: result.difficultyScore,
    ability_score: result.abilityScore,
    p_correct: result.pCorrect,
    traits_snapshot: result.traitsSnapshot ?? null
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
async function createSimulationRun(input) {
  const run = {
    id: randomUUID(),
    classId: input.classId,
    documentId: input.documentId,
    createdAt: new Date().toISOString()
  };
  simulationRunsMemory.set(run.id, run);
  if (canUseSupabase()) {
    try {
      await supabaseRest("simulation_runs", {
        method: "POST",
        body: normalizeSimulationRun(run),
        prefer: "return=minimal"
      });
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  return run;
}
async function saveSimulationResults(simulationId, results) {
  simulationResultsMemory.set(simulationId, [...results]);
  if (canUseSupabase() && results.length > 0) {
    try {
      await supabaseRest("simulation_results", {
        method: "POST",
        body: results.map((result) => normalizeSimulationResult(result)),
        prefer: "return=minimal"
      });
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  return results;
}
function applyPhaseCCore(student, measurable) {
  const cfg = PHASE_C_CONFIG.formula;
  const readingGap = Math.max(0, measurable.linguisticLoad - student.traits.readingLevel);
  const vocabularyGap = Math.max(0, measurable.linguisticLoad - student.traits.vocabularyLevel);
  const bloomGap = Math.abs(measurable.bloomLevel - student.traits.bloomMastery);
  const speedPenalty = Math.max(0, (cfg.baselineProcessingCenter - student.traits.processingSpeed) / cfg.processingPenaltyDivisor);
  const knowledgePenalty = Math.max(0, (cfg.baselineKnowledgeCenter - student.traits.backgroundKnowledge) / cfg.processingPenaltyDivisor);
  const confusionProfile = clamp2(measurable.confusionScore + cfg.readingGapToConfusion * readingGap + cfg.vocabularyGapToConfusion * vocabularyGap + cfg.bloomGapToConfusion * bloomGap + cfg.speedPenaltyToConfusion * speedPenalty + cfg.knowledgePenaltyToConfusion * knowledgePenalty, cfg.minConfusionScore, cfg.maxConfusionScore);
  const timeProfile = Math.max(0, measurable.timeSeconds * (1 + cfg.readingGapToTime * readingGap + cfg.vocabularyGapToTime * vocabularyGap + cfg.bloomGapToTime * bloomGap + cfg.speedPenaltyToTime * speedPenalty + cfg.knowledgePenaltyToTime * knowledgePenalty));
  return {
    bloomGap,
    confusionProfile,
    timeProfile
  };
}
function applyBiases(student, confusionProfile, timeProfile) {
  const confusionScore = clamp2(confusionProfile * (1 + student.biases.confusionBias), 0, 1);
  const timeSeconds = Math.max(timeProfile * (1 + student.biases.timeBias), 0);
  return {
    confusionScore,
    timeSeconds
  };
}
function computeDifficultyScore(measurable) {
  return 0.35 * measurable.linguisticLoad + 0.35 * measurable.cognitiveLoad + 0.2 * measurable.bloomLevel + 0.1 * measurable.representationLoad;
}
function computeAbilityScore(student) {
  return 0.3 * student.traits.readingLevel + 0.2 * student.traits.vocabularyLevel + 0.2 * student.traits.backgroundKnowledge + 0.15 * student.traits.processingSpeed + 0.15 * student.traits.bloomMastery;
}
function computeTraitBonus(student) {
  return -0.2 * student.biases.timeBias + -0.2 * student.biases.confusionBias;
}
function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}
function measurableFromNormalizedItem(item) {
  const label = item.logicalLabel ? `Item ${item.logicalLabel}` : typeof item.itemNumber === "number" ? `Item ${item.itemNumber}` : `Item ${item.itemId}`;
  const linguisticLoad = clamp2(item.traits.linguisticLoad, 0, 1);
  const cognitiveLoad = clamp2(item.traits.cognitiveLoad, 0, 1);
  const bloomLevel = clamp2(item.traits.bloomLevel, 1, 6);
  const representationLoad = clamp2(item.traits.representationLoad, 0, 1);
  const confusionScore = clamp2((linguisticLoad + cognitiveLoad + representationLoad) / 3, 0, 1);
  const timeSeconds = Math.max(0, 30 + 45 * linguisticLoad + 15 * representationLoad);
  return {
    itemId: item.itemId,
    itemLabel: label,
    linguisticLoad,
    cognitiveLoad,
    bloomLevel,
    representationLoad,
    confusionScore,
    timeSeconds
  };
}
function studentMatchesProfiles(student, selectedProfileIds) {
  if (selectedProfileIds.length === 0) {
    return true;
  }
  const studentValues = /* @__PURE__ */ new Set([
    ...student.profiles.map((profile) => profile.toLowerCase()),
    ...student.positiveTraits.map((trait) => trait.toLowerCase())
  ]);
  return selectedProfileIds.some((value) => studentValues.has(value.toLowerCase()));
}
async function runPhaseCSimulation(input) {
  const classRecord = await getClassById(input.classId);
  if (!classRecord) {
    throw new Error("Class not found");
  }
  const students = await getSyntheticStudentsForClass(classRecord.id);
  if (students.length === 0) {
    throw new Error("Synthetic students not found for class");
  }
  const selectedProfileIds = input.selectedProfileIds ?? [];
  const scopedStudents = students.filter((student) => studentMatchesProfiles(student, selectedProfileIds));
  if (scopedStudents.length === 0) {
    throw new Error("Synthetic students not found for class");
  }
  const normalizedItems = input.items ?? [];
  if (normalizedItems.length === 0) {
    throw new Error("No document items found for documentId");
  }
  const measurableItems = normalizedItems.map((item) => measurableFromNormalizedItem(item));
  const simulationRun = await createSimulationRun({
    classId: classRecord.id,
    documentId: input.documentId
  });
  const results = [];
  for (const student of scopedStudents) {
    for (const measurable of measurableItems) {
      const profileOutput = applyPhaseCCore(student, measurable);
      const biasedOutput = applyBiases(student, profileOutput.confusionProfile, profileOutput.timeProfile);
      const difficultyScore = computeDifficultyScore(measurable);
      const abilityScore = computeAbilityScore(student);
      const traitBonus = computeTraitBonus(student);
      const pCorrect = sigmoid(abilityScore + traitBonus - difficultyScore);
      results.push({
        id: randomUUID2(),
        simulationId: simulationRun.id,
        syntheticStudentId: student.id,
        itemId: measurable.itemId,
        itemLabel: measurable.itemLabel,
        linguisticLoad: measurable.linguisticLoad,
        confusionScore: biasedOutput.confusionScore,
        timeSeconds: biasedOutput.timeSeconds,
        bloomGap: profileOutput.bloomGap,
        difficultyScore,
        abilityScore,
        pCorrect,
        traitsSnapshot: {
          traits: student.traits,
          profiles: student.profiles,
          positiveTraits: student.positiveTraits,
          biases: student.biases
        }
      });
    }
  }
  await saveSimulationResults(simulationRun.id, results);
  return {
    simulationRun,
    resultCount: results.length
  };
}
var runtime = "nodejs";
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
function sendError(res, code, message, httpStatus) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(httpStatus).json({ error: { code, message } });
}
function normalizePhaseBItemsFromClient(rawItems) {
  const clampTrait = (v) => typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.5;
  const clampBloom = (v) => typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 1), 6) : 3;
  const items = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const logicalLabel = typeof raw.logicalLabel === "string" && raw.logicalLabel.trim() ? raw.logicalLabel.trim() : null;
    if (!logicalLabel) continue;
    const alphaMatch = logicalLabel.match(/^(\d+)([a-z])$/i);
    const numericMatch = logicalLabel.match(/^(\d+)$/);
    const groupId = alphaMatch ? alphaMatch[1] : numericMatch ? numericMatch[1] : logicalLabel;
    const partIndex = alphaMatch ? (alphaMatch[2].toLowerCase().charCodeAt(0) - 96) : 0;
    const isParent = partIndex === 0 && !alphaMatch;
    const itemId = typeof raw.itemId === "string" && raw.itemId.trim() ? raw.itemId.trim() : `client-item-${logicalLabel}`;
    const itemNumber = typeof raw.itemNumber === "number" && Number.isFinite(raw.itemNumber) ? raw.itemNumber : void 0;
    items.push({
      itemId,
      itemNumber,
      groupId,
      partIndex,
      logicalLabel,
      isParent,
      traits: {
        //moved bloom out then back in
        bloomLevel: clampBloom(raw.bloomLevel ?? raw.traits?.bloomLevel),
        linguisticLoad: clampTrait(raw.linguisticLoad ?? raw.traits?.linguisticLoad),
        cognitiveLoad: clampTrait(raw.cognitiveLoad ?? raw.traits?.cognitiveLoad),
        representationLoad: clampTrait(raw.representationLoad ?? raw.traits?.representationLoad),
        vocabDensity: typeof raw.vocabDensity === "number" && Number.isFinite(raw.vocabDensity) ? raw.vocabDensity : void 0,
        symbolDensity: typeof raw.symbolDensity === "number" && Number.isFinite(raw.symbolDensity) ? raw.symbolDensity : void 0,
        steps: typeof raw.steps === "number" && Number.isFinite(raw.steps) ? raw.steps : void 0
      }
    });
  }
  return items;
}
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
    let simulationItems = null;
    if (Array.isArray(payload.phaseBItems) && payload.phaseBItems.length > 0) {
      simulationItems = normalizePhaseBItemsFromClient(payload.phaseBItems);
    }
    if (!simulationItems || simulationItems.length === 0) {
      const phaseB = await normalizeItemsPhaseB(payload.documentId);
      simulationItems = phaseB.items;
    }
    if (simulationItems.length === 0) {
      return sendError(res, "not_found", "No document items found for documentId", 404);
    }
    for (const item of simulationItems) {
      if (!item.itemId || !item.groupId || !item.logicalLabel || !item.traits) {
        return sendError(res, "invalid_request", `Malformed document: item ${item.itemId ?? item.itemNumber ?? "unknown"} is missing required phase-b fields`, 400);
      }
    }
    const result = await runPhaseCSimulation({
      classId: payload.classId,
      documentId: payload.documentId,
      items: simulationItems,
      selectedProfileIds: Array.isArray(payload.selectedProfileIds) ? payload.selectedProfileIds : []
    });
    return res.status(201).json({
      simulationId: result.simulationRun.id,
      classId: result.simulationRun.classId,
      documentId: result.simulationRun.documentId,
      createdAt: result.simulationRun.createdAt,
      resultCount: result.resultCount,
      mode,
      selectedProfileIds: Array.isArray(payload.selectedProfileIds) ? payload.selectedProfileIds : []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation run failed";
    console.error("[simulation/run] error:", message);
    if (message === "Class not found" || message === "Synthetic students not found for class" || message === "No document items found for documentId") {
      return sendError(res, "not_found", message, 404);
    }
    return sendError(res, "internal_error", "Simulation run failed", 500);
  }
}
export {
  handler as default,
  runtime
};
