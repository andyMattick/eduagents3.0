import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseRest } from "../../../lib/supabase";

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

type ItemTraitSnapshot = {
  linguisticLoad?: number;
  cognitiveLoad?: number;
  bloomLevel?: number;
  representationLoad?: number;
  symbolDensity?: number;
  vocabCounts?: {
    level1: number;
    level2: number;
    level3: number;
  };
};

function readNumeric(metadata: Record<string, unknown> | undefined, keys: string[]): number | undefined {
  if (!metadata) {
    return undefined;
  }

  for (const key of keys) {
    const parts = key.split(".");
    let value: unknown = metadata;
    for (const part of parts) {
      if (value && typeof value === "object" && part in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function readVocabCounts(metadata: Record<string, unknown> | undefined): ItemTraitSnapshot["vocabCounts"] | undefined {
  if (!metadata) {
    return undefined;
  }

  const direct = metadata.vocabCounts;
  const nested = (metadata.metrics as Record<string, unknown> | undefined)?.vocab_counts;
  const value = (direct && typeof direct === "object" ? direct : nested) as Record<string, unknown> | undefined;

  if (!value) {
    return undefined;
  }

  const level1 = typeof value.level1 === "number" && Number.isFinite(value.level1) ? value.level1 : 0;
  const level2 = typeof value.level2 === "number" && Number.isFinite(value.level2) ? value.level2 : 0;
  const level3 = typeof value.level3 === "number" && Number.isFinite(value.level3) ? value.level3 : 0;

  if (level1 === 0 && level2 === 0 && level3 === 0) {
    return undefined;
  }

  return { level1, level2, level3 };
}

function extractItemTraits(metadata: Record<string, unknown> | undefined): ItemTraitSnapshot {
  return {
    linguisticLoad: readNumeric(metadata, ["linguisticLoad", "linguistic_load", "phaseB.linguisticLoad", "phaseB.linguistic_load", "metrics.linguistic_load"]),
    cognitiveLoad: readNumeric(metadata, ["cognitiveLoad", "cognitive_load", "phaseB.cognitiveLoad", "phaseB.cognitive_load", "metrics.cognitive_load"]),
    bloomLevel: readNumeric(metadata, ["bloomLevel", "bloom_level", "bloomsLevel", "phaseB.bloomLevel", "phaseB.bloom_level", "phaseB.bloomsLevel", "metrics.bloom_level", "metrics.blooms_level"]),
    representationLoad: readNumeric(metadata, ["representationLoad", "representation_load", "phaseB.representationLoad", "phaseB.representation_load", "metrics.representation_load"]),
    symbolDensity: readNumeric(metadata, ["symbolDensity", "symbol_density", "metrics.symbol_density"]),
    vocabCounts: readVocabCounts(metadata),
  };
}

async function loadItemTraits(documentId: string): Promise<Record<string, ItemTraitSnapshot>> {
  try {
    const rows = await supabaseRest("v4_items", {
      method: "GET",
      select: "id,metadata",
      filters: {
        document_id: `eq.${documentId}`,
      },
    }) as Array<{ id: string; metadata?: Record<string, unknown> }>;

    return rows.reduce<Record<string, ItemTraitSnapshot>>((accumulator, row) => {
      accumulator[row.id] = extractItemTraits(row.metadata);
      return accumulator;
    }, {});
  } catch {
    return {};
  }
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

function studentSummary(results: SimulationResult[], itemTraits: Record<string, ItemTraitSnapshot>) {
  const byItem = results.reduce<Record<string, {
    itemLabel: string;
    confusionScore: number;
    timeSeconds: number;
    bloomGap: number;
    difficultyScore: number;
    abilityScore: number;
    pCorrect: number;
    metadata?: ItemTraitSnapshot;
    linguisticLoad?: number;
    cognitiveLoad?: number;
    bloomLevel?: number;
    representationLoad?: number;
    symbolDensity?: number;
    vocabCounts?: {
      level1: number;
      level2: number;
      level3: number;
    };
  }>>((accumulator, result) => {
    const traits = itemTraits[result.itemId] ?? {};
    accumulator[result.itemId] = {
      itemLabel: result.itemLabel,
      confusionScore: result.confusionScore,
      timeSeconds: result.timeSeconds,
      bloomGap: result.bloomGap,
      difficultyScore: result.difficultyScore,
      abilityScore: result.abilityScore,
      pCorrect: result.pCorrect,
      metadata: traits,
      linguisticLoad: traits.linguisticLoad,
      cognitiveLoad: traits.cognitiveLoad,
      bloomLevel: traits.bloomLevel,
      representationLoad: traits.representationLoad,
      symbolDensity: traits.symbolDensity,
      vocabCounts: traits.vocabCounts,
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
    const itemTraits = await loadItemTraits(run.documentId);
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
        items: studentSummary(scoped, itemTraits),
        availableStudentIds,
      });
    }

    return res.status(400).json({ error: "view must be one of class, profile, or student" });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Simulation lookup failed" });
  }
}
