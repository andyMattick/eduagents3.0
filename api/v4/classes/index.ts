import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createClassWithSyntheticStudents, listClasses } from "../../../src/simulation/phase-c";
import type { ClassComposition, ClassTendencies, CreateClassInput } from "../../../src/simulation/phase-c";

export const runtime = "nodejs";

function parseBody(body: unknown) {
  if (typeof body !== "string") {
    return body as Partial<CreateClassInput>;
  }
  return JSON.parse(body) as Partial<CreateClassInput>;
}

function parseTeacherId(req: VercelRequest): string | undefined {
  const value = req.headers?.["x-user-id"];
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === "string" && single.trim().length > 0 ? single.trim() : undefined;
}

function defaultComposition(input?: Partial<ClassComposition>): ClassComposition {
  return {
    ell: input?.ell ?? "None",
    sped: input?.sped ?? "None",
    gifted: input?.gifted ?? "None",
    attentionChallenges: input?.attentionChallenges ?? "None",
    readingChallenges: input?.readingChallenges ?? "None",
  };
}

function defaultTendencies(input?: ClassTendencies): ClassTendencies {
  return {
    manyFastWorkers: Boolean(input?.manyFastWorkers),
    manySlowAndCareful: Boolean(input?.manySlowAndCareful),
    manyDetailOriented: Boolean(input?.manyDetailOriented),
    manyTestAnxious: Boolean(input?.manyTestAnxious),
    manyMathConfident: Boolean(input?.manyMathConfident),
    manyStruggleReading: Boolean(input?.manyStruggleReading),
    manyEasilyDistracted: Boolean(input?.manyEasilyDistracted),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const teacherId = parseTeacherId(req);
      const classes = await listClasses(teacherId);
      return res.status(200).json({ classes });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Class listing failed" });
    }
  }

  if (req.method === "POST") {
    try {
      const payload = parseBody(req.body ?? {});
      if (!payload.name || !payload.level) {
        return res.status(400).json({ error: "name and level are required" });
      }

      const teacherId = payload.teacherId ?? parseTeacherId(req);
      const result = await createClassWithSyntheticStudents({
        teacherId,
        name: payload.name,
        level: payload.level,
        gradeBand: payload.gradeBand,
        schoolYear: payload.schoolYear,
        studentCount: payload.studentCount,
        seed: payload.seed,
        overlays: {
          composition: defaultComposition(payload.overlays?.composition),
          tendencies: defaultTendencies(payload.overlays?.tendencies),
        },
      });

      return res.status(201).json({
        class: result.classRecord,
        students: result.students,
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Class creation failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
