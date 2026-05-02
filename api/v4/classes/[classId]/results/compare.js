import {
  aggregateActual,
  aggregatePredicted,
  computeProfileDeltas,
  loadActualRows,
  loadPredictedResults,
  loadPredictedRuns,
  loadStudents,
  resolveAssessmentId,
  resolveClassId,
  upsertClassAssessmentDelta,
} from "./_shared.js";

export const runtime = "nodejs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const classId = resolveClassId(req);
  if (!classId) {
    return res.status(400).json({ error: "classId is required" });
  }

  try {
    const requestedAssessmentId = resolveAssessmentId(req);

    const [studentsById, predictedRuns, actualRows] = await Promise.all([
      loadStudents(classId),
      loadPredictedRuns(classId, requestedAssessmentId),
      loadActualRows(classId, requestedAssessmentId),
    ]);

    const defaultAssessmentId =
      requestedAssessmentId
      ?? (actualRows?.[0]?.assessment_id ?? null)
      ?? (predictedRuns?.[0]?.document_id ?? null);

    const predictedRun = (predictedRuns ?? []).find((run) => run.document_id === defaultAssessmentId) ?? predictedRuns?.[0] ?? null;
    const scopedActualRows = defaultAssessmentId
      ? (actualRows ?? []).filter((row) => row.assessment_id === defaultAssessmentId)
      : [];

    if (!predictedRun || scopedActualRows.length === 0) {
      return res.status(200).json({
        classId,
        assessmentId: defaultAssessmentId,
        timingDelta: 0,
        confusionDelta: 0,
        accuracyDelta: 0,
        profileDeltas: {},
        classAverages: {
          predicted: { avgTime: 0, avgConfusion: 0, avgPCorrect: 0 },
          actual: { avgTime: 0, avgConfusion: 0, avgPCorrect: 0 },
        },
        itemDeltas: [],
      });
    }

    const predictedRows = await loadPredictedResults(predictedRun.id);
    const predicted = aggregatePredicted(predictedRows ?? [], studentsById);
    const actual = aggregateActual(scopedActualRows, studentsById);

    const timingDelta = actual.avgTime - predicted.avgTime;
    const confusionDelta = actual.avgConfusion - predicted.avgConfusion;
    const accuracyDelta = actual.avgPCorrect - predicted.avgPCorrect;

    const predictedByItem = new Map(predicted.itemMetrics.map((item) => [item.itemId, item]));
    const actualByItem = new Map(actual.itemMetrics.map((item) => [item.itemId, item]));
    const allItemIds = new Set([...predictedByItem.keys(), ...actualByItem.keys()]);

    const itemDeltas = [...allItemIds].map((itemId) => {
      const predictedItem = predictedByItem.get(itemId) ?? { avgTime: 0, avgConfusion: 0, avgPCorrect: 0 };
      const actualItem = actualByItem.get(itemId) ?? { avgTime: 0, avgConfusion: 0, avgPCorrect: 0 };
      return {
        itemId,
        timingDelta: actualItem.avgTime - predictedItem.avgTime,
        confusionDelta: actualItem.avgConfusion - predictedItem.avgConfusion,
        accuracyDelta: actualItem.avgPCorrect - predictedItem.avgPCorrect,
      };
    });

    const profileDeltas = computeProfileDeltas(predicted.profileMetrics, actual.profileMetrics);

    await upsertClassAssessmentDelta({
      classId,
      assessmentId: defaultAssessmentId,
      timingDelta,
      confusionDelta,
      accuracyDelta,
      profileDeltas,
    });

    return res.status(200).json({
      classId,
      assessmentId: defaultAssessmentId,
      timingDelta,
      confusionDelta,
      accuracyDelta,
      profileDeltas,
      classAverages: {
        predicted: {
          avgTime: predicted.avgTime,
          avgConfusion: predicted.avgConfusion,
          avgPCorrect: predicted.avgPCorrect,
        },
        actual: {
          avgTime: actual.avgTime,
          avgConfusion: actual.avgConfusion,
          avgPCorrect: actual.avgPCorrect,
        },
      },
      itemDeltas,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Comparison retrieval failed" });
  }
}
