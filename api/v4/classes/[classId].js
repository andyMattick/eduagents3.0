"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/classes/[classId].ts
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
var simulationRunsMemory = /* @__PURE__ */ new Map();
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
function hydrateSimulationRun(row) {
  return {
    id: row.id,
    classId: row.class_id,
    documentId: row.document_id,
    createdAt: row.created_at
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
async function listSimulationRunsForClass(classId) {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRest("simulation_runs", {
        method: "GET",
        select: "id,class_id,document_id,created_at",
        filters: {
          class_id: `eq.${classId}`,
          order: "created_at.desc"
        }
      });
      return (rows ?? []).map((row) => hydrateSimulationRun(row));
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) {
        throw error;
      }
      disableSupabaseForPhaseC(error);
    }
  }
  return Array.from(simulationRunsMemory.values()).filter((run) => run.classId === classId).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
var runtime = "nodejs";
function resolveClassId(req) {
  const value = Array.isArray(req.query.classId) ? req.query.classId[0] : req.query.classId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function countBy(values) {
  return values.reduce((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}
async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const classId = resolveClassId(req);
  if (!classId) {
    return res.status(400).json({ error: "classId is required" });
  }
  try {
    const classRecord = await getClassById(classId);
    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }
    const [students, simulations] = await Promise.all([
      getSyntheticStudentsForClass(classId),
      listSimulationRunsForClass(classId)
    ]);
    const profileCounts = countBy(students.flatMap((student) => student.profiles));
    const positiveTraitCounts = countBy(students.flatMap((student) => student.positiveTraits));
    return res.status(200).json({
      class: classRecord,
      students,
      summary: {
        studentCount: students.length,
        profileCounts,
        positiveTraitCounts
      },
      simulations
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Class retrieval failed" });
  }
}
export {
  handler as default,
  runtime
};
