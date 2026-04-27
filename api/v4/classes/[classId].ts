import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getClassById, getSyntheticStudentsForClass, listSimulationRunsForClass } from "../../../src/simulation/phase-c";

export const runtime = "nodejs";

function resolveClassId(req: VercelRequest): string | null {
  const value = Array.isArray(req.query.classId) ? req.query.classId[0] : req.query.classId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      listSimulationRunsForClass(classId),
    ]);

    const profileCounts = countBy(students.flatMap((student) => student.profiles));
    const positiveTraitCounts = countBy(students.flatMap((student) => student.positiveTraits));

    return res.status(200).json({
      class: classRecord,
      students,
      summary: {
        studentCount: students.length,
        profileCounts,
        positiveTraitCounts,
      },
      simulations,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Class retrieval failed" });
  }
}
