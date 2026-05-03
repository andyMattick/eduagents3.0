import { loadActualRows, loadPredictedRuns, resolveClassId } from "./_shared.js";

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
    const [predictedRuns, actualRows] = await Promise.all([
      loadPredictedRuns(classId),
      loadActualRows(classId),
    ]);

    const predictedHistory = (predictedRuns ?? []).map((run) => ({
      assessmentId: run.document_id,
      type: "predicted",
      timestamp: run.created_at,
    }));

    const latestActualByAssessment = new Map();
    for (const row of actualRows ?? []) {
      if (!row.assessment_id) {
        continue;
      }
      const current = latestActualByAssessment.get(row.assessment_id);
      if (!current || new Date(row.created_at).getTime() > new Date(current.created_at).getTime()) {
        latestActualByAssessment.set(row.assessment_id, row);
      }
    }

    const actualHistory = [...latestActualByAssessment.values()].map((row) => ({
      assessmentId: row.assessment_id,
      type: "actual",
      timestamp: row.created_at,
    }));

    const history = [...predictedHistory, ...actualHistory].sort((left, right) => {
      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });

    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Results history retrieval failed" });
  }
}
