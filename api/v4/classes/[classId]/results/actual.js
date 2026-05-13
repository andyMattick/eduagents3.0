import {
  aggregatePredicted,
  aggregateActual,
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
} from "./_shared.js";

export const runtime = "nodejs";

function parseBody(body) {
  if (typeof body !== "string") {
    return body;
  }
  return JSON.parse(body);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAssessmentItemKey(itemNumber, partLabel) {
  const base = String(itemNumber ?? "").trim().toLowerCase();
  const part = String(partLabel ?? "").trim().toLowerCase();
  if (part) {
    if (/^\d+[a-z]+$/i.test(part)) {
      return part;
    }
    if (/^[a-z]+$/i.test(part) && base) {
      return `${base}${part}`;
    }
  }
  return base;
}

function normalizeActualResultRow(raw) {
  const studentId = typeof raw?.studentId === "string" && raw.studentId.trim().length > 0
    ? raw.studentId.trim()
    : typeof raw?.student_id === "string" && raw.student_id.trim().length > 0
      ? raw.student_id.trim()
      : typeof raw?.externalId === "string" && raw.externalId.trim().length > 0
        ? raw.externalId.trim()
        : typeof raw?.external_id === "string" && raw.external_id.trim().length > 0
          ? raw.external_id.trim()
          : null;
  const itemNumber = raw?.itemNumber ?? raw?.item_number;
  const partLabel = raw?.partLabel ?? raw?.part_label ?? null;
  const correct = raw?.correct;
  if (!studentId || itemNumber == null || correct == null) {
    throw new Error("Each row requires student_id (or external_id), item_number, and correct.");
  }
  return {
    studentId,
    itemNumber,
    partLabel: partLabel == null ? null : String(partLabel),
    correct: correct === true || correct === 1 || correct === "1",
    timeSeconds: raw?.timeSeconds ?? raw?.time_seconds ?? null,
    confusion: raw?.confusion ?? null,
  };
}

async function loadAssessmentItemMap(assessmentId) {
  const rows = await supabaseRest("v4_items", {
    method: "GET",
    select: "id,item_number",
    filters: {
      document_id: `eq.${assessmentId}`,
      order: "item_number.asc",
      limit: "5000",
    },
  });

  const itemMap = new Map();
  for (const row of rows ?? []) {
    const key = normalizeAssessmentItemKey(row.item_number, null);
    if (key) {
      itemMap.set(key, row.id);
    }
  }
  return itemMap;
}

function buildActualResultRecords({ classId, assessmentId, rows, studentsById, itemMap }) {
  const grouped = new Map();
  const missingStudents = [];
  const missingItems = [];

  for (const row of rows) {
    const student = studentsById.get(row.studentId);
    if (!student) {
      missingStudents.push(row.studentId);
      continue;
    }
    const itemKey = normalizeAssessmentItemKey(row.itemNumber, row.partLabel);
    const itemId = itemMap.get(itemKey);
    if (!itemId) {
      missingItems.push(itemKey || String(row.itemNumber));
      continue;
    }
    const current = grouped.get(row.studentId) ?? {
      class_id: classId,
      assessment_id: assessmentId,
      synthetic_student_id: row.studentId,
      profiles: student.profiles ?? [],
      positive_traits: student.positiveTraits ?? [],
      score: 0,
      time_seconds: 0,
      item_results: [],
    };
    current.item_results.push({
      itemId,
      correct: row.correct,
      time: Number(row.timeSeconds ?? 0),
      confusion: Number(row.confusion ?? 0),
    });
    grouped.set(row.studentId, current);
  }

  if (missingStudents.length > 0) {
    throw new Error(`Unknown student_id values: ${Array.from(new Set(missingStudents)).join(", ")}`);
  }
  if (missingItems.length > 0) {
    throw new Error(`Unknown item_number/part_label values for assessment ${assessmentId}: ${Array.from(new Set(missingItems)).join(", ")}`);
  }

  return [...grouped.values()].map((record) => {
    const totalCorrect = record.item_results.reduce((sum, item) => sum + (item.correct ? 1 : 0), 0);
    const totalTime = record.item_results.reduce((sum, item) => sum + Number(item.time ?? 0), 0);
    return {
      ...record,
      score: record.item_results.length > 0 ? totalCorrect / record.item_results.length : 0,
      time_seconds: totalTime,
    };
  });
}

async function applyCalibration(classId, assessmentId, studentsById, actualRecords) {
  const predictedRuns = await loadPredictedRuns(classId, assessmentId);
  const latestPredictedRun = Array.isArray(predictedRuns) ? predictedRuns[0] : null;
  if (!latestPredictedRun?.id) {
    return { calibrationApplied: false };
  }

  const predictedRows = await loadPredictedResults(latestPredictedRun.id);
  const predicted = aggregatePredicted(predictedRows, studentsById);
  const actual = aggregateActual(actualRecords, studentsById);
  const timingDelta = actual.avgTime - predicted.avgTime;
  const confusionDelta = actual.avgConfusion - predicted.avgConfusion;
  const accuracyDelta = actual.avgPCorrect - predicted.avgPCorrect;
  const profileDeltas = computeProfileDeltas(predicted.profileMetrics, actual.profileMetrics);

  await upsertClassAssessmentDelta({
    classId,
    assessmentId,
    timingDelta,
    confusionDelta,
    accuracyDelta,
    profileDeltas,
  });

  const biasRows = await supabaseRest("synthetic_students", {
    method: "GET",
    select: "id,biases",
    filters: {
      class_id: `eq.${classId}`,
      limit: "1000",
    },
  });
  const predictedByStudent = new Map();
  for (const row of predictedRows ?? []) {
    const studentId = row.synthetic_student_id;
    const current = predictedByStudent.get(studentId) ?? [];
    current.push(row);
    predictedByStudent.set(studentId, current);
  }
  const actualByStudent = new Map(actual.students.map((student) => [student.studentId, student]));
  const classWeight = actual.students.length >= 5 ? 0.35 : 0.2;
  const classTimingRatio = predicted.avgTime > 0 ? timingDelta / Math.max(predicted.avgTime, 1) : 0;

  for (const row of biasRows ?? []) {
    const currentBiases = row.biases ?? { confusionBias: 0, timeBias: 0 };
    const actualStudent = actualByStudent.get(row.id) ?? null;
    const predictedStudentRows = predictedByStudent.get(row.id) ?? [];
    const predictedTime = average(predictedStudentRows.map((entry) => Number(entry.time_seconds ?? 0)));
    const predictedConfusion = average(predictedStudentRows.map((entry) => Number(entry.confusion_score ?? 0)));
    const predictedAccuracy = average(predictedStudentRows.map((entry) => Number(entry.p_correct ?? 0)));
    const actualAccuracy = actualStudent ? average(actualStudent.actual.itemResults.map((item) => item.correct ? 1 : 0)) : 0;
    const actualConfusion = actualStudent ? average(actualStudent.actual.itemResults.map((item) => Number(item.confusion ?? 0))) : 0;
    const studentTimingRatio = actualStudent && predictedTime > 0 ? (actualStudent.actual.time - predictedTime) / Math.max(predictedTime, 1) : 0;
    const studentConfusionDelta = actualStudent ? actualConfusion - predictedConfusion : 0;
    const studentAccuracyDelta = actualStudent ? actualAccuracy - predictedAccuracy : 0;
    const studentWeight = actualStudent ? actualStudent.actual.itemResults.length >= 3 ? 0.7 : 0.45 : 0;
    const nextBiases = {
      confusionBias: clamp(
        Number(currentBiases.confusionBias ?? 0) + confusionDelta * classWeight + studentConfusionDelta * studentWeight - (accuracyDelta * 0.1 + studentAccuracyDelta * 0.25),
        -0.35,
        0.35,
      ),
      timeBias: clamp(
        Number(currentBiases.timeBias ?? 0) + classTimingRatio * classWeight + studentTimingRatio * studentWeight,
        -0.35,
        0.35,
      ),
    };
    await supabaseRest("synthetic_students", {
      method: "PATCH",
      filters: { id: `eq.${row.id}` },
      body: { biases: nextBiases },
      prefer: "return=minimal",
    });
  }

  return { calibrationApplied: true, timingDelta, confusionDelta, accuracyDelta };
}

export default async function handler(req, res) {
  const classId = resolveClassId(req);
  if (!classId) {
    return res.status(400).json({ error: "classId is required" });
  }

  if (req.method === "POST") {
    try {
      const body = parseBody(req.body ?? {});
      const assessmentId = typeof body?.assessmentId === "string" && body.assessmentId.trim().length > 0 ? body.assessmentId.trim() : null;
      const rows = Array.isArray(body?.rows) ? body.rows.map((row) => normalizeActualResultRow(row)) : [];
      if (!assessmentId) {
        return res.status(400).json({ error: "assessmentId is required" });
      }
      if (rows.length === 0) {
        return res.status(400).json({ error: "rows are required" });
      }

      const studentsById = await loadStudents(classId);
      const itemMap = await loadAssessmentItemMap(assessmentId);
      const actualRecords = buildActualResultRecords({ classId, assessmentId, rows, studentsById, itemMap });
      await supabaseRest("class_actual_results", {
        method: "DELETE",
        filters: {
          class_id: `eq.${classId}`,
          assessment_id: `eq.${assessmentId}`,
        },
        prefer: "return=minimal",
      });
      await supabaseRest("class_actual_results", {
        method: "POST",
        body: actualRecords,
        prefer: "return=minimal",
      });

      const calibration = body?.applyCalibration === false ? { calibrationApplied: false } : await applyCalibration(classId, assessmentId, studentsById, actualRecords);
      return res.status(200).json({
        classId,
        assessmentId,
        studentCount: actualRecords.length,
        rowCount: rows.length,
        calibrationApplied: calibration.calibrationApplied === true,
      });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Actual results ingestion failed" });
    }
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const assessmentId = resolveAssessmentId(req);
    const [studentsById, actualRows] = await Promise.all([
      loadStudents(classId),
      loadActualRows(classId, assessmentId),
    ]);

    const selectedAssessmentId = assessmentId ?? (actualRows?.[0]?.assessment_id ?? null);
    const scopedRows = selectedAssessmentId
      ? (actualRows ?? []).filter((row) => row.assessment_id === selectedAssessmentId)
      : [];

    const actual = aggregateActual(scopedRows, studentsById);

    return res.status(200).json({
      classId,
      assessmentId: selectedAssessmentId,
      students: actual.students,
      summary: {
        averageScore: average(actual.students.map((student) => student.actual.score)),
        averageTime: actual.avgTime,
        averageConfusion: actual.avgConfusion,
        averageCorrectRate: actual.avgPCorrect,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Actual results retrieval failed" });
  }
}
