"use strict";
/* Bundled by esbuild — do not edit */

// lib/supabase.ts
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

// src/prism-v4/semantic/learning/learningService.ts
var teacherActionMemory = [];
var learningRecordMemory = /* @__PURE__ */ new Map();
var learningDirty = false;
var MIN_LEARNING_EVIDENCE = 2;
var FREEZE_EVIDENCE_THRESHOLD = 3;
var DRIFT_FREEZE_THRESHOLD = 0.4;
var ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
function canUseSupabase() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function toIsoString(value) {
  return new Date(value).toISOString();
}
async function readJsonIfAvailable(response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = (await response.text()).trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function normalizeTemplateLearningRecord(record) {
  return {
    template_id: record.templateId,
    strong_matches: record.strongMatches,
    weak_matches: record.weakMatches,
    teacher_overrides: record.teacherOverrides,
    expected_steps_corrections: record.expectedStepsCorrections,
    drift_score: record.driftScore,
    last_updated: toIsoString(record.lastUpdated)
  };
}
function hydrateTeacherActionEvent(row) {
  const context = row.context ?? { subject: "unknown" };
  const fallbackTeacherId = typeof row.teacher_id === "string" ? row.teacher_id : "unknown-teacher";
  return {
    eventId: typeof row.id === "string" ? row.id : `event-${Date.now()}`,
    teacherId: typeof context.originalTeacherId === "string" ? context.originalTeacherId : fallbackTeacherId,
    problemId: String(row.problem_id ?? "unknown-problem"),
    timestamp: Date.parse(String(row.created_at ?? new Date().toISOString())),
    actionType: row.action_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    context
  };
}
function hydrateTemplateLearningRecord(row) {
  return {
    templateId: String(row.template_id),
    strongMatches: Number(row.strong_matches ?? 0),
    weakMatches: Number(row.weak_matches ?? 0),
    teacherOverrides: Number(row.teacher_overrides ?? 0),
    expectedStepsCorrections: Number(row.expected_steps_corrections ?? 0),
    driftScore: Number(row.drift_score ?? 0),
    lastUpdated: Date.parse(String(row.last_updated ?? new Date().toISOString()))
  };
}
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
function clampExpectedSteps(value) {
  return Math.min(6, Math.max(1, Math.round(value)));
}
function isStepType(value) {
  return typeof value === "string" && ["procedural", "conceptual", "interpretive", "mixed", "definition", "code-interpretation"].includes(value);
}
function toExpectedSteps(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampExpectedSteps(1 + clamp01(value) * 5);
  }
  if (value && typeof value === "object") {
    const candidate = value;
    if (typeof candidate.expectedSteps === "number" && Number.isFinite(candidate.expectedSteps)) {
      return clampExpectedSteps(candidate.expectedSteps);
    }
  }
  return void 0;
}
function toStepType(value) {
  if (value && typeof value === "object") {
    const candidate = value;
    if (isStepType(candidate.stepType)) {
      return candidate.stepType;
    }
  }
  return void 0;
}
function confidenceDeltaFor(record) {
  if ((record.evidenceCount ?? 0) < MIN_LEARNING_EVIDENCE) {
    return 0;
  }
  const support = record.strongMatches * 0.03 + record.weakMatches * 0.015 + record.expectedStepsCorrections * 0.02;
  const correctionPressure = record.teacherOverrides * 0.06 + record.driftScore * 0.08;
  return Math.min(0.08, Math.max(-0.25, support - correctionPressure));
}
function emptyRecord(templateId) {
  return {
    templateId,
    strongMatches: 0,
    weakMatches: 0,
    teacherOverrides: 0,
    expectedStepsCorrections: 0,
    driftScore: 0,
    lastUpdated: Date.now()
  };
}
function affectedTemplateIds(context) {
  return [...new Set([...context.templateIds ?? [], ...context.teacherTemplateIds ?? []].filter(Boolean))];
}
async function loadTeacherActionEvents(since) {
  const sinceTimestamp = since instanceof Date ? since.getTime() : typeof since === "string" ? Date.parse(since) : typeof since === "number" ? since : void 0;
  if (canUseSupabase()) {
    const rows = await supabaseRest("teacher_action_events", {
      select: "id,teacher_id,problem_id,action_type,old_value,new_value,context,created_at",
      filters: {
        ...typeof sinceTimestamp === "number" && Number.isFinite(sinceTimestamp) ? { created_at: `gte.${toIsoString(sinceTimestamp)}` } : {},
        order: "created_at.asc"
      }
    });
    return (rows ?? []).map(hydrateTeacherActionEvent);
  }
  return teacherActionMemory.filter((event) => typeof sinceTimestamp === "number" ? event.timestamp >= sinceTimestamp : true);
}
async function saveTemplateLearningRecord(record) {
  learningRecordMemory.set(record.templateId, record);
  if (canUseSupabase()) {
    await supabaseRest("template_learning_records", {
      method: "POST",
      body: normalizeTemplateLearningRecord(record),
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  }
}
async function loadTemplateLearningRecords() {
  if (typeof window !== "undefined") {
    const response = await fetch("/api/v4/teacher-feedback/learning");
    if (!response.ok) {
      return [];
    }
    const payload = await readJsonIfAvailable(response);
    return payload?.records ?? [];
  }
  if (canUseSupabase()) {
    const rows = await supabaseRest("template_learning_records", {
      select: "template_id,strong_matches,weak_matches,teacher_overrides,expected_steps_corrections,drift_score,last_updated",
      filters: { order: "last_updated.desc" }
    });
    return (rows ?? []).map(hydrateTemplateLearningRecord);
  }
  return [...learningRecordMemory.values()];
}
async function aggregateTemplateLearning(since = Date.now() - ONE_WEEK_MS) {
  const stepSignals = /* @__PURE__ */ new Map();
  const stepTypes = /* @__PURE__ */ new Map();
  const nextRecords = /* @__PURE__ */ new Map();
  const teacherActions = await loadTeacherActionEvents(since);
  for (const event of teacherActions) {
    const strongIds = new Set(event.context.teacherTemplateIds ?? []);
    const weakIds = new Set(event.context.templateIds ?? []);
    for (const templateId of affectedTemplateIds(event.context)) {
      const current = nextRecords.get(templateId) ?? emptyRecord(templateId);
      if (strongIds.has(templateId)) {
        current.strongMatches += 1;
      }
      if (weakIds.has(templateId)) {
        current.weakMatches += 1;
      }
      switch (event.actionType) {
        case "expected_steps_correction":
          current.expectedStepsCorrections += 1;
          break;
        case "template_override":
        case "difficulty_correction":
        case "representation_correction":
        case "multipart_restructure":
          current.teacherOverrides += 1;
          break;
      }
      const learnedSteps = toExpectedSteps(event.newValue);
      if (event.actionType === "expected_steps_correction" && typeof learnedSteps === "number") {
        const values = stepSignals.get(templateId) ?? [];
        values.push(learnedSteps);
        stepSignals.set(templateId, values);
      }
      const learnedStepType = toStepType(event.newValue);
      if (event.actionType === "expected_steps_correction" && learnedStepType) {
        const values = stepTypes.get(templateId) ?? [];
        values.push(learnedStepType);
        stepTypes.set(templateId, values);
      }
      current.lastUpdated = Math.max(current.lastUpdated, event.timestamp);
      nextRecords.set(templateId, current);
    }
  }
  for (const record of nextRecords.values()) {
    record.evidenceCount = record.strongMatches + record.weakMatches + record.teacherOverrides + record.expectedStepsCorrections;
    record.driftScore = clamp01((record.teacherOverrides + record.expectedStepsCorrections * 0.35) / Math.max(1, record.strongMatches + record.weakMatches));
    record.confidenceDelta = confidenceDeltaFor(record);
    if ((record.evidenceCount ?? 0) >= FREEZE_EVIDENCE_THRESHOLD && record.driftScore >= DRIFT_FREEZE_THRESHOLD) {
      record.frozen = true;
    }
    const learnedSteps = stepSignals.get(record.templateId);
    if (learnedSteps && learnedSteps.length >= MIN_LEARNING_EVIDENCE) {
      record.learnedExpectedSteps = clampExpectedSteps(learnedSteps.reduce((sum, value) => sum + value, 0) / learnedSteps.length);
    }
    const learnedTypes = stepTypes.get(record.templateId);
    if (learnedTypes && learnedTypes.length >= MIN_LEARNING_EVIDENCE) {
      record.learnedStepType = learnedTypes[learnedTypes.length - 1];
    }
  }
  learningRecordMemory.clear();
  for (const record of nextRecords.values()) {
    await saveTemplateLearningRecord(record);
  }
  learningDirty = false;
  return [...learningRecordMemory.values()];
}
async function loadTemplateLearning() {
  if (typeof window !== "undefined") {
    return loadTemplateLearningRecords();
  }
  if (learningDirty) {
    return aggregateTemplateLearning();
  }
  const records = await loadTemplateLearningRecords();
  if (records.length > 0 || canUseSupabase()) {
    return records;
  }
  return [...learningRecordMemory.values()];
}

// api/v4/teacher-feedback/learning.ts
var runtime = "nodejs";
async function handler(_req, res) {
  if (_req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const records = await loadTemplateLearning();
    return res.status(200).json({ records });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load template learning records" });
  }
}
export {
  handler as default,
  runtime
};
