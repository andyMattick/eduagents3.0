import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  getSimulationRun,
  getSyntheticStudentsForClass,
  listSimulationResults,
} from "../../../src/simulation/phase-c";
import type { SimulationResult, SimulationView, SyntheticStudent } from "../../../src/simulation/phase-c";

export const runtime = "nodejs";

function resolveQuery(req: VercelRequest, key: string): string | undefined {
  const value = req.query[key];
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === "string" && single.trim().length > 0 ? single.trim() : undefined;
}

function aggregateClass(results: SimulationResult[]) {
  const total = results.length;
  if (total === 0) {
    return {
      totalRecords: 0,
      averageConfusionScore: 0,
      averageTimeSeconds: 0,
      averageBloomGap: 0,
    };
  }

  const sums = results.reduce(
    (accumulator, result) => {
      accumulator.confusion += result.confusionScore;
      accumulator.time += result.timeSeconds;
      accumulator.bloomGap += result.bloomGap;
      return accumulator;
    },
    { confusion: 0, time: 0, bloomGap: 0 },
  );

  return {
    totalRecords: total,
    averageConfusionScore: sums.confusion / total,
    averageTimeSeconds: sums.time / total,
    averageBloomGap: sums.bloomGap / total,
  };
}

function filterByProfileOrTrait(results: SimulationResult[], students: SyntheticStudent[], profile: string) {
  const matchingIds = new Set(
    students
      .filter((student) => student.profiles.includes(profile as never) || student.positiveTraits.includes(profile as never))
      .map((student) => student.id),
  );

  return results.filter((result) => matchingIds.has(result.syntheticStudentId));
}

function studentSummary(results: SimulationResult[]) {
  const byItem = results.reduce<Record<string, {
    itemLabel: string;
    confusionScore: number;
    timeSeconds: number;
    bloomGap: number;
    difficultyScore: number;
    abilityScore: number;
    pCorrect: number;
  }>>((accumulator, result) => {
    accumulator[result.itemId] = {
      itemLabel: result.itemLabel,
      confusionScore: result.confusionScore,
      timeSeconds: result.timeSeconds,
      bloomGap: result.bloomGap,
      difficultyScore: result.difficultyScore,
      abilityScore: result.abilityScore,
      pCorrect: result.pCorrect,
    };
    return accumulator;
  }, {});

  return Object.entries(byItem).map(([itemId, values]) => ({ itemId, ...values }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const simulationId = resolveQuery(req, "simulationId");
  if (!simulationId) {
    return res.status(400).json({ error: "simulationId is required" });
  }

  const view = (resolveQuery(req, "view") ?? "class") as SimulationView;

  try {
    const run = await getSimulationRun(simulationId);
    if (!run) {
      return res.status(404).json({ error: "Simulation not found" });
    }

    const [results, students] = await Promise.all([
      listSimulationResults(simulationId),
      getSyntheticStudentsForClass(run.classId),
    ]);
    const availableStudentIds = Array.from(new Set(results.map((result) => result.syntheticStudentId)));

    if (view === "class") {
      return res.status(200).json({ simulationId, view, summary: aggregateClass(results), availableStudentIds });
    }

    if (view === "profile") {
      const profile = resolveQuery(req, "profile");
      if (!profile) {
        return res.status(400).json({ error: "profile is required when view=profile" });
      }

      const scoped = filterByProfileOrTrait(results, students, profile);
      return res.status(200).json({ simulationId, view, profile, summary: aggregateClass(scoped), availableStudentIds });
    }

    if (view === "student") {
      const studentId = resolveQuery(req, "studentId") ?? availableStudentIds[0];
      if (!studentId) {
        return res.status(404).json({ error: "No student results found for simulation" });
      }

      const scoped = results.filter((result) => result.syntheticStudentId === studentId);
      return res.status(200).json({
        simulationId,
        view,
        studentId,
        summary: aggregateClass(scoped),
        items: studentSummary(scoped),
        availableStudentIds,
      });
    }

    return res.status(400).json({ error: "view must be one of class, profile, or student" });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Simulation lookup failed" });
  }
}
