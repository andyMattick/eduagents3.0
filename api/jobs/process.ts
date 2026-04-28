"use strict";
/* Bundled by esbuild — do not edit */

// api/jobs/process.ts
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var init_supabase = __esm({
  "lib/supabase.ts"() {
    "use strict";
  }
});
var learningService_exports = {};
__export(learningService_exports, {
  DRIFT_FREEZE_THRESHOLD: () => DRIFT_FREEZE_THRESHOLD,
  FREEZE_EVIDENCE_THRESHOLD: () => FREEZE_EVIDENCE_THRESHOLD,
  MIN_LEARNING_EVIDENCE: () => MIN_LEARNING_EVIDENCE,
  aggregateTemplateLearning: () => aggregateTemplateLearning,
  applyLearningAdjustments: () => applyLearningAdjustments,
  listTeacherActions: () => listTeacherActions,
  loadTeacherActionEvents: () => loadTeacherActionEvents,
  loadTemplateLearning: () => loadTemplateLearning,
  loadTemplateLearningRecords: () => loadTemplateLearningRecords,
  recordTeacherAction: () => recordTeacherAction,
  resetLearningState: () => resetLearningState,
  saveTeacherActionEvent: () => saveTeacherActionEvent,
  saveTemplateLearningRecord: () => saveTemplateLearningRecord
});
function canUseSupabase() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function toStableUuid(value) {
  if (isUuid(value)) {
    return value.toLowerCase();
  }
  const seed = [
    hashText(value),
    hashText(`${value}:a`),
    hashText(`${value}:b`),
    hashText(`${value}:c`)
  ].join("");
  const chars = seed.slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = ["8", "9", "a", "b"][parseInt(chars[16] ?? "0", 16) % 4];
  const hex = chars.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
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
function normalizeTeacherActionEvent(event) {
  return {
    teacher_id: toStableUuid(event.teacherId),
    problem_id: event.problemId,
    action_type: event.actionType,
    old_value: event.oldValue ?? null,
    new_value: event.newValue ?? null,
    context: {
      ...event.context,
      originalTeacherId: event.teacherId
    },
    created_at: toIsoString(event.timestamp)
  };
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
async function recordTeacherAction(event) {
  teacherActionMemory.push(event);
  learningDirty = true;
  if (canUseSupabase()) {
    await supabaseRest("teacher_action_events", {
      method: "POST",
      body: normalizeTeacherActionEvent(event),
      prefer: "return=minimal"
    });
  }
}
async function saveTeacherActionEvent(event) {
  await recordTeacherAction(event);
}
async function listTeacherActions() {
  return loadTeacherActionEvents();
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
function applyLearningAdjustments(templates, learningRecords) {
  if (learningRecords.length === 0) {
    return templates;
  }
  const learningMap = new Map(learningRecords.map((record) => [record.templateId, record]));
  return templates.flatMap((template) => {
    const learning = learningMap.get(template.id);
    if (!learning) {
      return [template];
    }
    const hasLearnedSteps = typeof learning.learnedExpectedSteps === "number";
    const isFrozen = Boolean(learning.frozen);
    const adjusted = {
      ...template,
      learningAdjustment: {
        confidenceDelta: isFrozen ? void 0 : learning.confidenceDelta,
        frozen: isFrozen,
        learnedExpectedSteps: learning.learnedExpectedSteps,
        learnedStepType: isStepType(learning.learnedStepType) ? learning.learnedStepType : void 0,
        originalExpectedSteps: template.stepHints?.expectedSteps,
        driftScore: learning.driftScore,
        evidenceCount: learning.evidenceCount,
        status: isFrozen ? "frozen" : (learning.evidenceCount ?? 0) > 0 || hasLearnedSteps || typeof learning.confidenceDelta === "number" ? "learning" : "stable"
      }
    };
    if (!isFrozen && typeof learning.learnedExpectedSteps === "number") {
      adjusted.stepHints = {
        expectedSteps: learning.learnedExpectedSteps,
        stepType: isStepType(learning.learnedStepType) ? learning.learnedStepType : template.stepHints?.stepType ?? "mixed"
      };
    }
    return [adjusted];
  });
}
function resetLearningState() {
  teacherActionMemory.length = 0;
  learningRecordMemory.clear();
  learningDirty = false;
}
var teacherActionMemory;
var learningRecordMemory;
var learningDirty;
var MIN_LEARNING_EVIDENCE;
var FREEZE_EVIDENCE_THRESHOLD;
var DRIFT_FREEZE_THRESHOLD;
var ONE_WEEK_MS;
var init_learningService = __esm({
  "src/prism-v4/semantic/learning/learningService.ts"() {
    "use strict";
    init_supabase();
    teacherActionMemory = [];
    learningRecordMemory = /* @__PURE__ */ new Map();
    learningDirty = false;
    MIN_LEARNING_EVIDENCE = 2;
    FREEZE_EVIDENCE_THRESHOLD = 3;
    DRIFT_FREEZE_THRESHOLD = 0.4;
    ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
  }
});
var azure_exports = {};
__export(azure_exports, {
  analyzeAzureDocument: () => analyzeAzureDocument,
  azureAnalyzeUrl: () => azureAnalyzeUrl,
  getAzureConfig: () => getAzureConfig,
  mapAzureResult: () => mapAzureResult
});
function normalizeEndpoint(raw) {
  let s = raw.trim().replace(/\.{2,}/g, "").replace(/^https:\/(?!\/)/, "https://").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(s)) {
    s = `https://${s}`;
  }
  return s;
}
function getEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return void 0;
}
function getAzureConfig() {
  const endpoint = getEnvValue("AZURE_DOCUMENT_ENDPOINT", "AZURE_FORM_RECOGNIZER_ENDPOINT");
  const key = getEnvValue("AZURE_DOCUMENT_KEY", "AZURE_FORM_RECOGNIZER_KEY");
  const model = getEnvValue("AZURE_DOCUMENT_MODEL", "AZURE_FORM_RECOGNIZER_MODEL") ?? "prebuilt-read";
  const pages = getEnvValue("AZURE_DOCUMENT_PAGES", "AZURE_FORM_RECOGNIZER_PAGES") ?? "1-";
  if (!endpoint || !key) {
    throw new Error("Azure is not configured. Set AZURE_DOCUMENT_ENDPOINT and AZURE_DOCUMENT_KEY, or AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY.");
  }
  const clean = normalizeEndpoint(endpoint);
  console.log("[azure] normalized endpoint:", clean);
  return { endpoint: clean, key, model, pages };
}
function azureAnalyzeUrl(endpoint, model, pages) {
  const selectedModel = model?.trim() || "prebuilt-read";
  const url = new URL(`${endpoint}/documentintelligence/documentModels/${selectedModel}:analyze`);
  url.searchParams.set("api-version", "2024-11-30");
  if (pages && pages.trim().length > 0) {
    url.searchParams.set("pages", pages.trim());
  }
  return url.toString();
}
async function analyzeAzureDocument(fileBuffer, mimeType = "application/pdf") {
  const config2 = getAzureConfig();
  const analyzeUrl = azureAnalyzeUrl(config2.endpoint, config2.model, config2.pages);
  const fallbackAnalyzeUrl = azureAnalyzeUrl(config2.endpoint, config2.model);
  console.log("[azure] URL:", analyzeUrl);
  console.log("[azure] model:", config2.model);
  console.log("[azure] pages policy:", config2.pages || "<none>");
  let submitRes = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config2.key,
      "Content-Type": mimeType
    },
    body: new Uint8Array(fileBuffer)
  });
  if (submitRes.status !== 202 && config2.pages) {
    const firstAttemptError = await submitRes.text();
    const normalizedError = firstAttemptError.toLowerCase();
    const shouldFallback = normalizedError.includes("pages") || normalizedError.includes("query") || normalizedError.includes("invalid");
    if (shouldFallback) {
      console.warn("[azure] pages parameter rejected; retrying without pages query", {
        status: submitRes.status
      });
      submitRes = await fetch(fallbackAnalyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": config2.key,
          "Content-Type": mimeType
        },
        body: new Uint8Array(fileBuffer)
      });
    } else {
      throw new Error(`Azure rejected the document (${submitRes.status}): ${firstAttemptError}`);
    }
  }
  if (submitRes.status !== 202) {
    const errText = await submitRes.text();
    throw new Error(`Azure rejected the document (${submitRes.status}): ${errText}`);
  }
  const operationLocation = submitRes.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Azure did not return an operation-location header");
  }
  const maxPolls = 30;
  const pollIntervalMs = 1500;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const pollRes = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": config2.key
      }
    });
    const pollData = await pollRes.json();
    if (pollData.status === "succeeded") {
      return pollData.analyzeResult ?? { content: "", pages: [], paragraphs: [], tables: [] };
    }
    if (pollData.status === "failed") {
      throw new Error(`Azure analysis failed: ${JSON.stringify(pollData)}`);
    }
  }
  throw new Error("Azure analysis timed out after polling");
}
function mapAzureResult(az, fileName) {
  const pages = (az.pages ?? []).map((page) => ({
    pageNumber: page.pageNumber,
    content: ""
  }));
  const paragraphs = (az.paragraphs ?? []).map((p) => ({
    text: (p.content ?? "").trim(),
    role: p.role ?? "body"
  }));
  const tables = (az.tables ?? []).map((t) => {
    const header = t.cells.filter((c) => c.rowIndex === 0).sort((a, b) => a.columnIndex - b.columnIndex).map((c) => c.content).join(" | ");
    return {
      rowCount: t.rowCount,
      columnCount: t.columnCount,
      preview: header.slice(0, 200)
    };
  });
  return { fileName, content: az.content ?? "", pages, paragraphs, tables };
}
var init_azure = __esm({
  "lib/azure.ts"() {
    "use strict";
  }
});
async function authenticateUser(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or malformed Authorization header.", status: 401 };
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase env vars missing.", status: 500 };
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey
      }
    });
    if (!res.ok) {
      return { error: "Invalid or expired session.", status: 401 };
    }
    const user = await res.json();
    return user?.id ? { userId: user.id } : { error: "User not found.", status: 401 };
  } catch (err) {
    console.error("Auth error:", err);
    return { error: "Auth verification failed.", status: 500 };
  }
}
init_supabase();
var runtime = "nodejs";
var config = { maxDuration: 60 };
async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }
    let body = req.body;
    if (typeof body === "string")
      body = JSON.parse(body);
    const jobId = body?.id;
    if (!jobId) {
      return res.status(400).json({ error: "Missing required field: id" });
    }
    const { url, key } = supabaseAdmin();
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };
    const fetchUrl = new URL(`${url}/rest/v1/jobs`);
    fetchUrl.searchParams.set("id", `eq.${jobId}`);
    fetchUrl.searchParams.set("user_id", `eq.${auth.userId}`);
    fetchUrl.searchParams.set("select", "*");
    const fetchRes = await fetch(fetchUrl.toString(), { headers });
    const jobs = await fetchRes.json();
    const job = Array.isArray(jobs) ? jobs[0] : null;
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (job.status !== "pending") {
      return res.status(409).json({ error: `Job is already ${job.status}` });
    }
    await patchJob(url, key, jobId, { status: "running", updated_at: new Date().toISOString() });
    try {
      const output = await executeJob(job);
      await patchJob(url, key, jobId, {
        status: "succeeded",
        output,
        updated_at: new Date().toISOString()
      });
      return res.status(200).json({ status: "succeeded", output });
    } catch (execErr) {
      await patchJob(url, key, jobId, {
        status: "failed",
        error: execErr.message,
        updated_at: new Date().toISOString()
      });
      return res.status(200).json({ status: "failed", error: execErr.message });
    }
  } catch (err) {
    console.error("jobs/process error:", err);
    return res.status(500).json({ error: err.message });
  }
}
async function executeJob(job) {
  switch (job.type) {
    case "azure-extract":
      return executeAzureExtract(job.input);
    case "llm-generate":
      throw new Error("Job type 'llm-generate' is disabled");
    case "template-learning-aggregate":
      return executeTemplateLearningAggregate();
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
async function executeTemplateLearningAggregate() {
  const { aggregateTemplateLearning: aggregateTemplateLearning2 } = await Promise.resolve().then(() => (init_learningService(), learningService_exports));
  const records = await aggregateTemplateLearning2();
  return { records };
}
async function executeAzureExtract(input) {
  const { getAzureConfig: getAzureConfig2, azureAnalyzeUrl: azureAnalyzeUrl2, mapAzureResult: mapAzureResult2 } = await Promise.resolve().then(() => (init_azure(), azure_exports));
  const { endpoint, key } = getAzureConfig2();
  const fileBuffer = Buffer.from(input.fileBase64, "base64");
  const submitRes = await fetch(azureAnalyzeUrl2(endpoint), {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": input.mimeType || "application/pdf"
    },
    body: fileBuffer
  });
  if (submitRes.status !== 202) {
    throw new Error(`Azure rejected document (${submitRes.status})`);
  }
  const operationLocation = submitRes.headers.get("operation-location");
  if (!operationLocation)
    throw new Error("No operation-location from Azure");
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": key }
    });
    const data = await poll.json();
    if (data.status === "succeeded") {
      return mapAzureResult2(data.analyzeResult, input.fileName || "upload");
    }
    if (data.status === "failed")
      throw new Error("Azure analysis failed");
  }
  throw new Error("Azure analysis timed out");
}
async function patchJob(supabaseUrl, apiKey, jobId, fields) {
  const patchUrl = new URL(`${supabaseUrl}/rest/v1/jobs`);
  patchUrl.searchParams.set("id", `eq.${jobId}`);
  await fetch(patchUrl.toString(), {
    method: "PATCH",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(fields)
  });
}
export {
  config,
  handler as default,
  runtime
};
