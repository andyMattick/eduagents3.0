import {
  aggregateActual,
  average,
  loadActualRows,
  loadStudents,
  resolveAssessmentId,
  resolveClassId,
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
