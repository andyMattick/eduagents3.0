function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

async function supabaseRest(table, options = {}) {
  const config = supabaseAdmin();
  if (!config) {
    return [];
  }

  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer,
    timeoutMs = 8000,
  } = options;

  const reqUrl = new URL(`${config.url}/rest/v1/${table}`);
  if (select) {
    reqUrl.searchParams.set("select", select);
  }

  for (const [key, value] of Object.entries(filters)) {
    reqUrl.searchParams.set(key, value);
  }

  const headers = {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(reqUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase REST ${method} ${table} failed (${response.status}): ${text}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return [];
}

function resolveClassId(req) {
  const value = Array.isArray(req.query.classId) ? req.query.classId[0] : req.query.classId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveAssessmentId(req) {
  const value = Array.isArray(req.query.assessmentId) ? req.query.assessmentId[0] : req.query.assessmentId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseItemResults(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function loadStudents(classId) {
  const rows = await supabaseRest("synthetic_students", {
    method: "GET",
    select: "id,profiles,positive_traits",
    filters: {
      class_id: `eq.${classId}`,
      limit: "1000",
    },
  });

  const map = new Map();
  for (const row of rows ?? []) {
    map.set(row.id, {
      profiles: row.profiles ?? [],
      positiveTraits: row.positive_traits ?? [],
    });
  }

  return map;
}

async function loadPredictedRuns(classId, assessmentId) {
  const filters = {
    class_id: `eq.${classId}`,
    order: "created_at.desc",
    limit: "100",
  };

  if (assessmentId) {
    filters.document_id = `eq.${assessmentId}`;
  }

  return supabaseRest("simulation_runs", {
    method: "GET",
    select: "id,class_id,document_id,created_at",
    filters,
  });
}

async function loadPredictedResults(simulationId) {
  return supabaseRest("simulation_results", {
    method: "GET",
    select: "simulation_id,synthetic_student_id,item_id,confusion_score,time_seconds,p_correct",
    filters: {
      simulation_id: `eq.${simulationId}`,
      order: "item_id.asc",
      limit: "50000",
    },
  });
}

async function loadActualRows(classId, assessmentId) {
  const filters = {
    class_id: `eq.${classId}`,
    order: "created_at.desc",
    limit: "50000",
  };

  if (assessmentId) {
    filters.assessment_id = `eq.${assessmentId}`;
  }

  return supabaseRest("class_actual_results", {
    method: "GET",
    select: "class_id,assessment_id,synthetic_student_id,profiles,positive_traits,score,time_seconds,item_results,created_at",
    filters,
  });
}

function aggregatePredicted(predictedRows, studentsById) {
  const avgTime = average(predictedRows.map((row) => Number(row.time_seconds ?? 0)));
  const avgConfusion = average(predictedRows.map((row) => Number(row.confusion_score ?? 0)));
  const avgPCorrect = average(predictedRows.map((row) => Number(row.p_correct ?? 0)));

  const byItem = new Map();
  const byProfile = new Map();

  for (const row of predictedRows) {
    const itemId = String(row.item_id ?? "");
    const itemEntry = byItem.get(itemId) ?? { time: [], confusion: [], pCorrect: [] };
    itemEntry.time.push(Number(row.time_seconds ?? 0));
    itemEntry.confusion.push(Number(row.confusion_score ?? 0));
    itemEntry.pCorrect.push(Number(row.p_correct ?? 0));
    byItem.set(itemId, itemEntry);

    const student = studentsById.get(row.synthetic_student_id);
    const profiles = student?.profiles ?? [];
    for (const profile of profiles) {
      const profileEntry = byProfile.get(profile) ?? { time: [], confusion: [], pCorrect: [] };
      profileEntry.time.push(Number(row.time_seconds ?? 0));
      profileEntry.confusion.push(Number(row.confusion_score ?? 0));
      profileEntry.pCorrect.push(Number(row.p_correct ?? 0));
      byProfile.set(profile, profileEntry);
    }
  }

  return {
    avgTime,
    avgConfusion,
    avgPCorrect,
    itemMetrics: [...byItem.entries()].map(([itemId, entry]) => ({
      itemId,
      avgTime: average(entry.time),
      avgConfusion: average(entry.confusion),
      avgPCorrect: average(entry.pCorrect),
    })),
    profileMetrics: [...byProfile.entries()].reduce((accumulator, [profile, entry]) => {
      accumulator[profile] = {
        avgTime: average(entry.time),
        avgConfusion: average(entry.confusion),
        avgPCorrect: average(entry.pCorrect),
      };
      return accumulator;
    }, {}),
  };
}

function aggregateActual(actualRows, studentsById) {
  const byStudent = new Map();
  for (const row of actualRows) {
    const studentId = row.synthetic_student_id ?? `unmapped-${byStudent.size + 1}`;
    if (byStudent.has(studentId)) {
      continue;
    }

    const student = studentsById.get(studentId);
    byStudent.set(studentId, {
      studentId,
      profiles: row.profiles ?? student?.profiles ?? [],
      positiveTraits: row.positive_traits ?? student?.positiveTraits ?? [],
      actual: {
        score: Number(row.score ?? 0),
        time: Number(row.time_seconds ?? 0),
        itemResults: parseItemResults(row.item_results).map((item) => ({
          itemId: String(item.itemId ?? item.item_id ?? ""),
          correct: Boolean(item.correct),
          time: Number(item.time ?? item.time_seconds ?? 0),
          confusion: Number(item.confusion ?? 0),
        })),
      },
    });
  }

  const students = [...byStudent.values()];

  const allItems = students.flatMap((student) => student.actual.itemResults);
  const avgTime = average(students.map((student) => student.actual.time));
  const avgConfusion = average(allItems.map((item) => item.confusion));
  const avgPCorrect = average(allItems.map((item) => (item.correct ? 1 : 0)));

  const byItem = new Map();
  for (const item of allItems) {
    const entry = byItem.get(item.itemId) ?? { time: [], confusion: [], pCorrect: [] };
    entry.time.push(Number(item.time ?? 0));
    entry.confusion.push(Number(item.confusion ?? 0));
    entry.pCorrect.push(item.correct ? 1 : 0);
    byItem.set(item.itemId, entry);
  }

  const byProfile = new Map();
  for (const student of students) {
    for (const profile of student.profiles ?? []) {
      const entry = byProfile.get(profile) ?? { time: [], confusion: [], pCorrect: [] };
      entry.time.push(Number(student.actual.time ?? 0));
      entry.confusion.push(...student.actual.itemResults.map((item) => Number(item.confusion ?? 0)));
      entry.pCorrect.push(...student.actual.itemResults.map((item) => (item.correct ? 1 : 0)));
      byProfile.set(profile, entry);
    }
  }

  return {
    students,
    avgTime,
    avgConfusion,
    avgPCorrect,
    itemMetrics: [...byItem.entries()].map(([itemId, entry]) => ({
      itemId,
      avgTime: average(entry.time),
      avgConfusion: average(entry.confusion),
      avgPCorrect: average(entry.pCorrect),
    })),
    profileMetrics: [...byProfile.entries()].reduce((accumulator, [profile, entry]) => {
      accumulator[profile] = {
        avgTime: average(entry.time),
        avgConfusion: average(entry.confusion),
        avgPCorrect: average(entry.pCorrect),
      };
      return accumulator;
    }, {}),
  };
}

function computeProfileDeltas(predictedProfiles, actualProfiles) {
  const standardProfiles = ["ELL", "SPED", "ADHD", "Dyslexic", "Gifted"];
  const keys = new Set([...standardProfiles, ...Object.keys(predictedProfiles), ...Object.keys(actualProfiles)]);

  const output = {};
  for (const key of keys) {
    const predicted = predictedProfiles[key] ?? { avgTime: 0, avgConfusion: 0, avgPCorrect: 0 };
    const actual = actualProfiles[key] ?? { avgTime: 0, avgConfusion: 0, avgPCorrect: 0 };
    output[key] = {
      timingDelta: actual.avgTime - predicted.avgTime,
      confusionDelta: actual.avgConfusion - predicted.avgConfusion,
      accuracyDelta: actual.avgPCorrect - predicted.avgPCorrect,
    };
  }

  return output;
}

async function upsertClassAssessmentDelta({ classId, assessmentId, timingDelta, confusionDelta, accuracyDelta, profileDeltas }) {
  if (!supabaseAdmin()) {
    return;
  }

  await supabaseRest("class_assessment_deltas", {
    method: "POST",
    body: {
      class_id: classId,
      assessment_id: assessmentId,
      timing_delta: timingDelta,
      confusion_delta: confusionDelta,
      accuracy_delta: accuracyDelta,
      profile_deltas: profileDeltas,
    },
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export {
  aggregateActual,
  aggregatePredicted,
  average,
  computeProfileDeltas,
  loadActualRows,
  loadPredictedResults,
  loadPredictedRuns,
  loadStudents,
  resolveAssessmentId,
  resolveClassId,
  supabaseRest,
  upsertClassAssessmentDelta,
};
