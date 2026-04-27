import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseRest } from "../../../lib/supabase";

import {
  getSimulationRun,
  getSyntheticStudentsForClass,
  listSimulationResults,
} from "../../../src/simulation/phase-c";
import type { SimulationResult, SyntheticStudent } from "../../../src/simulation/phase-c";

export const runtime = "nodejs";

type ApiSimulationView = "class" | "profile" | "student" | "phase-b";

function resolveQuery(req: VercelRequest, key: string): string | undefined {
  const value = req.query[key];
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === "string" && single.trim().length > 0 ? single.trim() : undefined;
}

type ItemTraitSnapshot = {
  itemNumber?: number;
  groupId?: string;
  partIndex?: number;
  logicalLabel?: string;
  isParent?: boolean;
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

type ItemRow = {
  id: string;
  item_number?: number;
  stem?: string;
  answer_key?: unknown;
  metadata?: Record<string, unknown>;
};

function readMetadataString(metadata: Record<string, unknown> | undefined, keys: string[]): string | undefined {
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

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function hasAnswerKey(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length === 0) {
      return false;
    }

    return Object.values(record).some((entry) => {
      if (entry === null || entry === undefined) {
        return false;
      }
      if (typeof entry === "string") {
        return entry.trim().length > 0;
      }
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }
      if (typeof entry === "object") {
        return Object.keys(entry as Record<string, unknown>).length > 0;
      }
      return true;
    });
  }

  return true;
}

function letterToPartIndex(letter: string): number {
  const code = letter.toLowerCase().charCodeAt(0);
  if (code >= 97 && code <= 122) {
    return (code - 97) + 1;
  }

  return 0;
}

function deriveItemStructure(row: ItemRow): Pick<ItemTraitSnapshot, "itemNumber" | "groupId" | "partIndex" | "logicalLabel" | "isParent"> {
  const itemNumber = typeof row.item_number === "number" && Number.isFinite(row.item_number)
    ? row.item_number
    : undefined;
  const extractedProblemId = readMetadataString(row.metadata, ["extractedProblemId", "extracted_problem_id", "problemId", "problem_id"]);
  if (extractedProblemId) {
    const match = extractedProblemId.match(/^p?(\d+)([a-z])?$/i);
    if (match?.[1]) {
      const groupId = match[1];
      const partIndex = match[2] ? letterToPartIndex(match[2]) : 0;
      return {
        itemNumber,
        groupId,
        partIndex,
        logicalLabel: `${groupId}${match[2] ? match[2].toLowerCase() : ""}`,
        isParent: partIndex === 0 ? !hasAnswerKey(row.answer_key) : false,
      };
    }
  }

  const stem = (row.stem ?? "").trim();
  const hasKey = hasAnswerKey(row.answer_key);
  const alphaNumeric = stem.match(/^(\d+)\s*([a-z])[\).:\s]/i);
  if (alphaNumeric?.[1] && alphaNumeric[2]) {
    const groupId = alphaNumeric[1];
    const suffix = alphaNumeric[2].toLowerCase();
    return {
      itemNumber,
      groupId,
      partIndex: letterToPartIndex(suffix),
      logicalLabel: `${groupId}${suffix}`,
      isParent: !hasKey,
    };
  }

  const numeric = stem.match(/^(\d+)[\).:\s]/);
  if (numeric?.[1]) {
    const groupId = numeric[1];
    return {
      itemNumber,
      groupId,
      partIndex: 0,
      logicalLabel: groupId,
      isParent: !hasKey,
    };
  }

  const fallbackGroup = typeof itemNumber === "number" ? String(itemNumber) : row.id;
  return {
    itemNumber,
    groupId: fallbackGroup,
    partIndex: 0,
    logicalLabel: typeof itemNumber === "number" ? String(itemNumber) : undefined,
    isParent: !hasKey,
  };
}

function parseStructureFromResultLabel(itemLabel: string): Pick<ItemTraitSnapshot, "groupId" | "partIndex" | "logicalLabel"> {
  const compact = itemLabel.replace(/^Item\s+/i, "").trim();
  const alphaNumeric = compact.match(/^(\d+)([a-z])$/i);
  if (alphaNumeric?.[1] && alphaNumeric[2]) {
    return {
      groupId: alphaNumeric[1],
      partIndex: letterToPartIndex(alphaNumeric[2]),
      logicalLabel: `${alphaNumeric[1]}${alphaNumeric[2].toLowerCase()}`,
    };
  }

  const numeric = compact.match(/^(\d+)$/);
  if (numeric?.[1]) {
    return {
      groupId: numeric[1],
      partIndex: 0,
      logicalLabel: numeric[1],
    };
  }

  return {
    groupId: undefined,
    partIndex: undefined,
    logicalLabel: undefined,
  };
}

function compareByStructure(
  left: { groupId?: string; partIndex?: number; itemNumber?: number; logicalLabel?: string },
  right: { groupId?: string; partIndex?: number; itemNumber?: number; logicalLabel?: string },
): number {
  const leftGroup = left.groupId ?? String(left.itemNumber ?? left.logicalLabel ?? "");
  const rightGroup = right.groupId ?? String(right.itemNumber ?? right.logicalLabel ?? "");
  const groupCompare = leftGroup.localeCompare(rightGroup, undefined, { numeric: true });
  if (groupCompare !== 0) {
    return groupCompare;
  }

  const leftPart = typeof left.partIndex === "number" && Number.isFinite(left.partIndex) ? left.partIndex : 0;
  const rightPart = typeof right.partIndex === "number" && Number.isFinite(right.partIndex) ? right.partIndex : 0;
  if (leftPart !== rightPart) {
    return leftPart - rightPart;
  }

  const leftNumber = typeof left.itemNumber === "number" && Number.isFinite(left.itemNumber)
    ? left.itemNumber
    : Number.POSITIVE_INFINITY;
  const rightNumber = typeof right.itemNumber === "number" && Number.isFinite(right.itemNumber)
    ? right.itemNumber
    : Number.POSITIVE_INFINITY;
  return leftNumber - rightNumber;
}

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

function extractItemTraits(row: ItemRow): ItemTraitSnapshot {
  const metadata = row.metadata;
  return {
    ...deriveItemStructure(row),
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
      select: "id,item_number,stem,answer_key,metadata",
      filters: {
        document_id: `eq.${documentId}`,
      },
    }) as ItemRow[];

    return rows.reduce<Record<string, ItemTraitSnapshot>>((accumulator, row) => {
      accumulator[row.id] = extractItemTraits(row);
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
    itemNumber?: number;
    groupId?: string;
    partIndex?: number;
    logicalLabel?: string;
    isParent?: boolean;
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
    const parsedStructure = parseStructureFromResultLabel(result.itemLabel);
    accumulator[result.itemId] = {
      itemLabel: result.itemLabel,
      itemNumber: traits.itemNumber,
      groupId: traits.groupId ?? parsedStructure.groupId,
      partIndex: traits.partIndex ?? parsedStructure.partIndex,
      logicalLabel: traits.logicalLabel ?? parsedStructure.logicalLabel,
      isParent: traits.isParent,
      confusionScore: result.confusionScore,
      timeSeconds: result.timeSeconds,
      bloomGap: result.bloomGap,
      difficultyScore: result.difficultyScore,
      abilityScore: result.abilityScore,
      pCorrect: result.pCorrect,
      metadata: traits,
      linguisticLoad: traits.linguisticLoad ?? result.linguisticLoad,
      cognitiveLoad: traits.cognitiveLoad ?? result.linguisticLoad,
      bloomLevel: traits.bloomLevel ?? (3 + result.bloomGap),
      representationLoad: traits.representationLoad ?? 0.5,
      symbolDensity: traits.symbolDensity,
      vocabCounts: traits.vocabCounts,
    };
    return accumulator;
  }, {});

  const entries = Object.entries(byItem).map(([itemId, values]) => ({ itemId, ...values }));
  const groupsWithChildren = new Set(
    entries
      .filter((entry) => (entry.partIndex ?? 0) > 0)
      .map((entry) => entry.groupId ?? String(entry.itemNumber ?? entry.logicalLabel ?? "")),
  );

  const adjusted = entries.map((entry) => {
    const groupKey = entry.groupId ?? String(entry.itemNumber ?? entry.logicalLabel ?? "");
    const keepAsParent = Boolean(entry.isParent) && groupsWithChildren.has(groupKey);
    return { ...entry, isParent: keepAsParent };
  });

  const allParents = adjusted.length > 0 && adjusted.every((entry) => entry.isParent);
  const normalizedParents = allParents ? adjusted.map((entry) => ({ ...entry, isParent: false })) : adjusted;
  return normalizedParents.sort((left, right) => compareByStructure(left, right));
}

function phaseBSummary(results: SimulationResult[], itemTraits: Record<string, ItemTraitSnapshot>) {
  const byItem = new Map<string, {
    itemId: string;
    itemNumber?: number;
    groupId?: string;
    partIndex?: number;
    logicalLabel?: string;
    isParent?: boolean;
    traits: {
      bloomLevel?: number;
      linguisticLoad?: number;
      cognitiveLoad?: number;
      representationLoad?: number;
      vocabDensity?: number;
      symbolDensity?: number;
      steps?: number;
    };
  }>();

  for (const result of results) {
    if (byItem.has(result.itemId)) {
      continue;
    }

    const traits = itemTraits[result.itemId] ?? {};
    const parsed = parseStructureFromResultLabel(result.itemLabel);
    byItem.set(result.itemId, {
      itemId: result.itemId,
      itemNumber: traits.itemNumber,
      groupId: traits.groupId ?? parsed.groupId,
      partIndex: traits.partIndex ?? parsed.partIndex,
      logicalLabel: traits.logicalLabel ?? parsed.logicalLabel,
      isParent: traits.isParent,
      traits: {
        bloomLevel: traits.bloomLevel ?? (3 + result.bloomGap),
        linguisticLoad: traits.linguisticLoad ?? result.linguisticLoad,
        cognitiveLoad: traits.cognitiveLoad ?? result.linguisticLoad,
        representationLoad: traits.representationLoad ?? 0.5,
        vocabDensity: traits.vocabCounts ? (traits.vocabCounts.level1 + traits.vocabCounts.level2 + traits.vocabCounts.level3) : undefined,
        symbolDensity: traits.symbolDensity,
        steps: undefined,
      },
    });
  }

  const entries = [...byItem.values()].sort((left, right) => compareByStructure(left, right));
  const groupsWithChildren = new Set(
    entries
      .filter((entry) => (entry.partIndex ?? 0) > 0)
      .map((entry) => entry.groupId ?? String(entry.itemNumber ?? entry.logicalLabel ?? "")),
  );

  const adjusted = entries.map((entry) => {
    const groupKey = entry.groupId ?? String(entry.itemNumber ?? entry.logicalLabel ?? "");
    const keepAsParent = Boolean(entry.isParent) && groupsWithChildren.has(groupKey);
    return { ...entry, isParent: keepAsParent };
  });

  const allParents = adjusted.length > 0 && adjusted.every((entry) => entry.isParent);
  return allParents ? adjusted.map((entry) => ({ ...entry, isParent: false })) : adjusted;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const simulationId = resolveQuery(req, "simulationId");
  if (!simulationId) {
    return res.status(400).json({ error: "simulationId is required" });
  }

  const view = (resolveQuery(req, "view") ?? "class") as ApiSimulationView;

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
      return res.status(200).json({
        simulationId,
        classId: run.classId,
        documentId: run.documentId,
        view,
        summary: aggregateClass(results),
        availableStudentIds,
      });
    }

    if (view === "profile") {
      const profile = resolveQuery(req, "profile");
      if (!profile) {
        return res.status(400).json({ error: "profile is required when view=profile" });
      }

      const scoped = filterByProfileOrTrait(results, students, profile);
      return res.status(200).json({
        simulationId,
        classId: run.classId,
        documentId: run.documentId,
        view,
        profile,
        summary: aggregateClass(scoped),
        availableStudentIds,
      });
    }

    if (view === "student") {
      const studentId = resolveQuery(req, "studentId") ?? availableStudentIds[0];
      if (!studentId) {
        return res.status(404).json({ error: "No student results found for simulation" });
      }

      const scoped = results.filter((result) => result.syntheticStudentId === studentId);
      return res.status(200).json({
        simulationId,
        classId: run.classId,
        documentId: run.documentId,
        view,
        studentId,
        summary: aggregateClass(scoped),
        items: studentSummary(scoped, itemTraits),
        availableStudentIds,
      });
    }

    if (view === "phase-b") {
      return res.status(200).json({
        simulationId,
        classId: run.classId,
        documentId: run.documentId,
        view,
        summary: aggregateClass(results),
        items: phaseBSummary(results, itemTraits),
        availableStudentIds,
      });
    }

    return res.status(400).json({ error: "view must be one of class, profile, student, or phase-b" });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Simulation lookup failed" });
  }
}
