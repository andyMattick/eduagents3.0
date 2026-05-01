"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/simulations/[simulationId].ts
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
function hydrateSimulationRun(row) {
  return {
    id: row.id,
    classId: row.class_id,
    documentId: row.document_id,
    createdAt: row.created_at
  };
}
function hydrateSimulationResult(row) {
  return {
    id: row.id,
    simulationId: row.simulation_id,
    syntheticStudentId: row.synthetic_student_id,
    itemId: row.item_id,
    itemLabel: row.item_label,
    linguisticLoad: Number(row.linguistic_load ?? 0),
    confusionScore: Number(row.confusion_score ?? 0),
    timeSeconds: Number(row.time_seconds ?? 0),
    bloomGap: Number(row.bloom_gap ?? 0),
    difficultyScore: Number(row.difficulty_score ?? 0),
    abilityScore: Number(row.ability_score ?? 0),
    pCorrect: Number(row.p_correct ?? 0),
    traitsSnapshot: row.traits_snapshot ?? void 0
  };
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
async function getSimulationRun(simulationId) {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("simulation_runs", {
        method: "GET",
        select: "id,class_id,document_id,created_at",
        filters: { id: `eq.${simulationId}` }
      });
      const row = (rows ?? [])[0];
      return row ? hydrateSimulationRun(row) : null;
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  return simulationRunsMemory.get(simulationId) ?? null;
}
async function listSimulationResults(simulationId) {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("simulation_results", {
        method: "GET",
        select: "id,simulation_id,synthetic_student_id,item_id,item_label,linguistic_load,confusion_score,time_seconds,bloom_gap,difficulty_score,ability_score,p_correct,traits_snapshot",
        filters: {
          simulation_id: `eq.${simulationId}`,
          order: "item_id.asc,synthetic_student_id.asc"
        }
      });
      return (rows ?? []).map((row) => hydrateSimulationResult(row));
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  return [...simulationResultsMemory.get(simulationId) ?? []];
}
var runtime = "nodejs";
function resolveQuery(req, key) {
  const value = req.query[key];
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === "string" && single.trim().length > 0 ? single.trim() : void 0;
}
function readMetadataString(metadata, keys) {
  if (!metadata) {
    return void 0;
  }
  for (const key of keys) {
    const parts = key.split(".");
    let value = metadata;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        value = void 0;
        break;
      }
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return void 0;
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
function deriveItemStructure(row) {
  const itemNumber = typeof row.item_number === "number" && Number.isFinite(row.item_number) ? row.item_number : void 0;
  const extractedProblemId = readMetadataString(row.metadata, ["extractedProblemId", "extracted_problem_id", "problemId", "problem_id"]);
  if (extractedProblemId) {
    const match = extractedProblemId.match(/^p?(\d+)([a-z])?$/i);
    if (match?.[1]) {
      const groupId = match[1];
      const partIndex = match[2] ? letterToPartIndex(match[2]) : 0;
      return {
        itemNumber,
        groupId,
        partIndex,
        logicalLabel: `${groupId}${match[2] ? match[2].toLowerCase() : ""}`,
        isParent: partIndex === 0 ? !hasAnswerKey(row.answer_key) : false
      };
    }
  }
  const stem = (row.stem ?? "").trim();
  const hasKey = hasAnswerKey(row.answer_key);
  const alphaNumeric = stem.match(/^(\d+)\s*([a-z])[\).:\s]/i);
  if (alphaNumeric?.[1] && alphaNumeric[2]) {
    const groupId = alphaNumeric[1];
    const suffix = alphaNumeric[2].toLowerCase();
    return {
      itemNumber,
      groupId,
      partIndex: letterToPartIndex(suffix),
      logicalLabel: `${groupId}${suffix}`,
      isParent: !hasKey
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
      isParent: !hasKey
    };
  }
  const fallbackGroup = typeof itemNumber === "number" ? String(itemNumber) : row.id;
  return {
    itemNumber,
    groupId: fallbackGroup,
    partIndex: 0,
    logicalLabel: typeof itemNumber === "number" ? String(itemNumber) : void 0,
    isParent: !hasKey
  };
}
function parseStructureFromResultLabel(itemLabel) {
  const compact = itemLabel.replace(/^Item\s+/i, "").trim();
  const alphaNumeric = compact.match(/^(\d+)([a-z])$/i);
  if (alphaNumeric?.[1] && alphaNumeric[2]) {
    return {
      groupId: alphaNumeric[1],
      partIndex: letterToPartIndex(alphaNumeric[2]),
      logicalLabel: `${alphaNumeric[1]}${alphaNumeric[2].toLowerCase()}`
    };
  }
  const numeric = compact.match(/^(\d+)$/);
  if (numeric?.[1]) {
    return {
      groupId: numeric[1],
      partIndex: 0,
      logicalLabel: numeric[1]
    };
  }
  return {
    groupId: void 0,
    partIndex: void 0,
    logicalLabel: void 0
  };
}
function compareByStructure(left, right) {
  const leftGroup = left.groupId ?? String(left.itemNumber ?? left.logicalLabel ?? "");
  const rightGroup = right.groupId ?? String(right.itemNumber ?? right.logicalLabel ?? "");
  const groupCompare = leftGroup.localeCompare(rightGroup, void 0, { numeric: true });
  if (groupCompare !== 0) {
    return groupCompare;
  }
  const leftPart = typeof left.partIndex === "number" && Number.isFinite(left.partIndex) ? left.partIndex : 0;
  const rightPart = typeof right.partIndex === "number" && Number.isFinite(right.partIndex) ? right.partIndex : 0;
  if (leftPart !== rightPart) {
    return leftPart - rightPart;
  }
  const leftNumber = typeof left.itemNumber === "number" && Number.isFinite(left.itemNumber) ? left.itemNumber : Number.POSITIVE_INFINITY;
  const rightNumber = typeof right.itemNumber === "number" && Number.isFinite(right.itemNumber) ? right.itemNumber : Number.POSITIVE_INFINITY;
  return leftNumber - rightNumber;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildHardestItems(results, itemTraits) {
  const byItem = /* @__PURE__ */ new Map();
  for (const result of results) {
    const current = byItem.get(result.itemId) ?? {
      itemId: result.itemId,
      itemLabel: result.itemLabel,
      pCorrect: []
    };
    current.pCorrect.push(Number(result.pCorrect ?? 0));
    byItem.set(result.itemId, current);
  }
  return [...byItem.values()].map((entry) => {
    const traits = itemTraits[entry.itemId] ?? {};
    return {
      itemId: entry.itemId,
      itemLabel: entry.itemLabel,
      logicalLabel: traits.logicalLabel,
      pCorrect: average(entry.pCorrect)
    };
  }).sort((left, right) => left.pCorrect - right.pCorrect).slice(0, 5);
}

async function buildNarrativePayload(params) {
  const useAzure = String(process.env.USE_AZURE_NARRATIVE ?? "false").toLowerCase() === "true";
  if (!useAzure) {
    return {
      provider: "deterministic",
      text: "Narrative running in deterministic mode. Set USE_AZURE_NARRATIVE=true to enable Azure narrative generation.",
      usage: void 0
    };
  }
  try {
    const { buildTeacherNarrativeFromSimulation } = await import("../../../src/prism-v4/intelligence/buildTeacherNarrative.ts");
    const narrative = await buildTeacherNarrativeFromSimulation(params);
    return {
      provider: "azure",
      text: narrative.text,
      usage: narrative.usage
    };
  } catch (error) {
    console.warn("[simulation/get] Azure narrative failed; returning deterministic fallback.", {
      message: error instanceof Error ? error.message : String(error),
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION
    });
    return {
      provider: "deterministic-fallback",
      text: "Narrative temporarily unavailable. Please retry in a moment.",
      usage: void 0
    };
  }
}

function readNumeric(metadata, keys) {
  if (!metadata) {
    return void 0;
  }
  for (const key of keys) {
    const parts = key.split(".");
    let value = metadata;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        value = void 0;
        break;
      }
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return void 0;
}
function readVocabCounts(metadata) {
  if (!metadata) {
    return void 0;
  }
  const direct = metadata.vocabCounts;
  const nested = metadata.metrics?.vocab_counts;
  const value = direct && typeof direct === "object" ? direct : nested;
  if (!value) {
    return void 0;
  }
  const level1 = typeof value.level1 === "number" && Number.isFinite(value.level1) ? value.level1 : 0;
  const level2 = typeof value.level2 === "number" && Number.isFinite(value.level2) ? value.level2 : 0;
  const level3 = typeof value.level3 === "number" && Number.isFinite(value.level3) ? value.level3 : 0;
  if (level1 === 0 && level2 === 0 && level3 === 0) {
    return void 0;
  }
  return { level1, level2, level3 };
}
function extractItemTraits(row) {
  const metadata = row.metadata;
  return {
    ...deriveItemStructure(row),
    linguisticLoad: readNumeric(metadata, ["linguisticLoad", "linguistic_load", "phaseB.linguisticLoad", "phaseB.linguistic_load", "metrics.linguistic_load"]),
    cognitiveLoad: readNumeric(metadata, ["cognitiveLoad", "cognitive_load", "phaseB.cognitiveLoad", "phaseB.cognitive_load", "metrics.cognitive_load"]),
    bloomLevel: readNumeric(metadata, ["bloomLevel", "bloom_level", "bloomsLevel", "phaseB.bloomLevel", "phaseB.bloom_level", "phaseB.bloomsLevel", "metrics.bloom_level", "metrics.blooms_level"]),
    representationLoad: readNumeric(metadata, ["representationLoad", "representation_load", "phaseB.representationLoad", "phaseB.representation_load", "metrics.representation_load"]),
    symbolDensity: readNumeric(metadata, ["symbolDensity", "symbol_density", "metrics.symbol_density"]),
    vocabCounts: readVocabCounts(metadata)
  };
}
async function loadItemTraits(documentId) {
  try {
    const rows = await supabaseRest("v4_items", {
      method: "GET",
      select: "id,item_number,stem,answer_key,metadata",
      filters: {
        document_id: `eq.${documentId}`
      }
    });
    return rows.reduce((accumulator, row) => {
      accumulator[row.id] = extractItemTraits(row);
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}
function aggregateClass(results) {
  const total = results.length;
  if (total === 0) {
    return {
      totalRecords: 0,
      averageConfusionScore: 0,
      averageTimeSeconds: 0,
      averageBloomGap: 0
    };
  }
  const sums = results.reduce((accumulator, result) => {
    accumulator.confusion += result.confusionScore;
    accumulator.time += result.timeSeconds;
    accumulator.bloomGap += result.bloomGap;
    return accumulator;
  }, { confusion: 0, time: 0, bloomGap: 0 });
  return {
    totalRecords: total,
    averageConfusionScore: sums.confusion / total,
    averageTimeSeconds: sums.time / total,
    averageBloomGap: sums.bloomGap / total
  };
}
function filterByProfileOrTrait(results, students, profile) {
  const matchingIds = new Set(students.filter((student) => student.profiles.includes(profile) || student.positiveTraits.includes(profile)).map((student) => student.id));
  return results.filter((result) => matchingIds.has(result.syntheticStudentId));
}
function studentSummary(results, itemTraits) {
  const byItem = results.reduce((accumulator, result) => {
    const traits = itemTraits[result.itemId] ?? {};
    const parsedStructure = parseStructureFromResultLabel(result.itemLabel);
    accumulator[result.itemId] = {
      itemLabel: result.itemLabel,
      itemNumber: traits.itemNumber,
      groupId: traits.groupId ?? parsedStructure.groupId,
      partIndex: traits.partIndex ?? parsedStructure.partIndex,
      logicalLabel: traits.logicalLabel ?? parsedStructure.logicalLabel,
      isParent: traits.isParent,
      confusionScore: result.confusionScore,
      timeSeconds: result.timeSeconds,
      bloomGap: result.bloomGap,
      difficultyScore: result.difficultyScore,
      abilityScore: result.abilityScore,
      pCorrect: result.pCorrect,
      metadata: traits,
      linguisticLoad: traits.linguisticLoad ?? result.linguisticLoad,
      cognitiveLoad: traits.cognitiveLoad ?? result.linguisticLoad,
      bloomLevel: traits.bloomLevel ?? 3 + result.bloomGap,
      representationLoad: traits.representationLoad ?? 0.5,
      symbolDensity: traits.symbolDensity,
      vocabCounts: traits.vocabCounts
    };
    return accumulator;
  }, {});
  const entries = Object.entries(byItem).map(([itemId, values]) => ({ itemId, ...values }));
  const groupsWithChildren = new Set(entries.filter((entry) => (entry.partIndex ?? 0) > 0).map((entry) => entry.groupId ?? String(entry.itemNumber ?? entry.logicalLabel ?? "")));
  const adjusted = entries.map((entry) => {
    const groupKey = entry.groupId ?? String(entry.itemNumber ?? entry.logicalLabel ?? "");
    const keepAsParent = Boolean(entry.isParent) && groupsWithChildren.has(groupKey);
    return { ...entry, isParent: keepAsParent };
  });
  const allParents = adjusted.length > 0 && adjusted.every((entry) => entry.isParent);
  const normalizedParents = allParents ? adjusted.map((entry) => ({ ...entry, isParent: false })) : adjusted;
  const sorted = normalizedParents.sort((left, right) => compareByStructure(left, right));
  const seenLabels = /* @__PURE__ */ new Set();
  return sorted.filter((entry) => {
    const key = entry.logicalLabel ?? entry.itemLabel ?? entry.itemId;
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });
}
function phaseBSummary(results, itemTraits) {
  const byItem = /* @__PURE__ */ new Map();
  for (const result of results) {
    if (byItem.has(result.itemId)) {
      continue;
    }
    const traits = itemTraits[result.itemId] ?? {};
    const parsed = parseStructureFromResultLabel(result.itemLabel);
    byItem.set(result.itemId, {
      itemId: result.itemId,
      itemNumber: traits.itemNumber,
      groupId: traits.groupId ?? parsed.groupId,
      partIndex: traits.partIndex ?? parsed.partIndex,
      logicalLabel: traits.logicalLabel ?? parsed.logicalLabel,
      isParent: traits.isParent,
      traits: {
        bloomLevel: traits.bloomLevel ?? 3 + result.bloomGap,
        linguisticLoad: traits.linguisticLoad ?? result.linguisticLoad,
        cognitiveLoad: traits.cognitiveLoad ?? result.linguisticLoad,
        representationLoad: traits.representationLoad ?? 0.5,
        vocabDensity: traits.vocabCounts ? traits.vocabCounts.level1 + traits.vocabCounts.level2 + traits.vocabCounts.level3 : void 0,
        symbolDensity: traits.symbolDensity,
        steps: void 0
      }
    });
  }
  const entries = [...byItem.values()].sort((left, right) => compareByStructure(left, right));
  const groupsWithChildren = new Set(entries.filter((entry) => (entry.partIndex ?? 0) > 0).map((entry) => entry.groupId ?? String(entry.itemNumber ?? entry.logicalLabel ?? "")));
  const adjusted = entries.map((entry) => {
    const groupKey = entry.groupId ?? String(entry.itemNumber ?? entry.logicalLabel ?? "");
    const keepAsParent = Boolean(entry.isParent) && groupsWithChildren.has(groupKey);
    return { ...entry, isParent: keepAsParent };
  });
  const allParents = adjusted.length > 0 && adjusted.every((entry) => entry.isParent);
  return allParents ? adjusted.map((entry) => ({ ...entry, isParent: false })) : adjusted;
}
async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Method not allowed" } });
  }
  const simulationId = resolveQuery(req, "simulationId");
  if (!simulationId || typeof simulationId !== "string") {
    return res.status(400).json({ error: { code: "invalid_request", message: "simulationId is required" } });
  }
  const VALID_VIEWS = /* @__PURE__ */ new Set(["class", "profile", "student", "phase-b"]);
  const view = resolveQuery(req, "view") ?? "class";
  if (!VALID_VIEWS.has(view)) {
    return res.status(400).json({ error: { code: "invalid_request", message: "view must be one of class, profile, student, or phase-b" } });
  }
  try {
    const run = await getSimulationRun(simulationId);
    if (!run) {
      return res.status(404).json({ error: { code: "not_found", message: "Simulation not found" } });
    }
    const [results, students] = await Promise.all([
      listSimulationResults(simulationId),
      getSyntheticStudentsForClass(run.classId)
    ]);
    const itemTraits = await loadItemTraits(run.documentId);
      const hardestItems = buildHardestItems(results, itemTraits);
    const availableStudentIds = Array.from(new Set(results.map((result) => result.syntheticStudentId)));
    if (view === "class") {
        const narrative = await buildNarrativePayload({
          simulationId,
          classId: run.classId,
          documentId: run.documentId,
          summary: aggregateClass(results),
          hardestItems
        });
      return res.status(200).json({
        simulationId,
        classId: run.classId,
        documentId: run.documentId,
        view,
        summary: aggregateClass(results),
          narrative,
          suggestions: { hardestItems },
        availableStudentIds
      });
    }
    if (view === "profile") {
      const profile = resolveQuery(req, "profile");
      if (!profile) {
        return res.status(400).json({ error: { code: "invalid_request", message: "profile is required when view=profile" } });
      }
      const scoped = filterByProfileOrTrait(results, students, profile);
      return res.status(200).json({
        simulationId,
        classId: run.classId,
        documentId: run.documentId,
        view,
        profile,
        summary: aggregateClass(scoped),
        availableStudentIds
      });
    }
    if (view === "student") {
      const studentId = resolveQuery(req, "studentId") ?? availableStudentIds[0];
      if (!studentId) {
        return res.status(404).json({ error: { code: "not_found", message: "No student results found for simulation" } });
      }
      const scoped = results.filter((result) => result.syntheticStudentId === studentId);
      return res.status(200).json({
        simulationId,
        classId: run.classId,
        documentId: run.documentId,
        view,
        studentId,
        summary: aggregateClass(scoped),
        items: studentSummary(scoped, itemTraits),
        availableStudentIds
      });
    }
    if (view === "phase-b") {
      return res.status(200).json({
        simulationId,
        classId: run.classId,
        documentId: run.documentId,
        view,
        summary: aggregateClass(results),
        items: phaseBSummary(results, itemTraits),
        availableStudentIds
      });
    }
    return res.status(400).json({ error: { code: "invalid_request", message: "view must be one of class, profile, student, or phase-b" } });
  } catch (error) {
    console.error("[simulation/get] error:", error instanceof Error ? error.message : error);
    return res.status(500).json({ error: { code: "internal_error", message: "Simulation lookup failed" } });
  }
}
export {
  handler as default,
  runtime
};
