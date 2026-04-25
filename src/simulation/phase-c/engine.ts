import { randomUUID } from "crypto";

import { supabaseRest } from "../../../lib/supabase";
import { clamp, PHASE_C_CONFIG } from "./traits";
import {
  createSimulationRun,
  getClassById,
  getSyntheticStudentsForClass,
  saveSimulationResults,
} from "./store";
import type {
  RunSimulationInput,
  SimulationResult,
  SimulationRun,
  SyntheticStudent,
} from "./types";

type SourceItem = {
  id: string;
  item_number: number;
  stem: string;
  metadata?: Record<string, unknown>;
};

type PhaseBItemMeasurables = {
  itemId: string;
  itemLabel: string;
  linguisticLoad: number;
  confusionScore: number;
  timeSeconds: number;
  bloomsLevel: number;
};

function readNumeric(metadata: Record<string, unknown> | undefined, keys: string[], fallback: number): number {
  if (!metadata) {
    return fallback;
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

  return fallback;
}

function estimateMeasurables(item: SourceItem): PhaseBItemMeasurables {
  const cfg = PHASE_C_CONFIG.formula;
  const text = item.stem ?? "";
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = text.split(/[.!?]+/).filter((entry) => entry.trim().length > 0).length || 1;
  const avgSentenceLength = wordCount / sentenceCount;

  const linguisticLoad = clamp(
    readNumeric(item.metadata, ["linguisticLoad", "phaseB.linguisticLoad", "metrics.linguistic_load"], avgSentenceLength / cfg.defaultLinguisticLoadDivisor),
    cfg.minLinguisticLoad,
    cfg.maxLinguisticLoad,
  );
  const confusionScore = clamp(
    readNumeric(item.metadata, ["confusionScore", "phaseB.confusionScore", "metrics.confusion_score"], Math.min(cfg.maxConfusionScore, avgSentenceLength / cfg.defaultConfusionSentenceDivisor)),
    cfg.minConfusionScore,
    cfg.maxConfusionScore,
  );
  const timeSeconds = Math.max(
    0,
    readNumeric(item.metadata, ["timeToProcessSeconds", "phaseB.timeSeconds", "metrics.time_seconds"], Math.max(cfg.defaultTimeFloorSeconds, wordCount * cfg.defaultTimePerWordSeconds)),
  );
  const bloomsLevel = clamp(readNumeric(item.metadata, ["bloomsLevel", "phaseB.bloomsLevel", "metrics.blooms_level"], cfg.defaultBloomsLevel), cfg.minBloomsLevel, cfg.maxBloomsLevel);

  return {
    itemId: item.id,
    itemLabel: `Item ${item.item_number}`,
    linguisticLoad,
    confusionScore,
    timeSeconds,
    bloomsLevel,
  };
}

async function loadDocumentItems(documentId: string): Promise<SourceItem[]> {
  const rows = await supabaseRest("v4_items", {
    method: "GET",
    select: "id,item_number,stem,metadata",
    filters: {
      document_id: `eq.${documentId}`,
      order: "item_number.asc",
    },
  });

  return (rows as SourceItem[]) ?? [];
}

function applyPhaseCCore(student: SyntheticStudent, measurable: PhaseBItemMeasurables) {
  const cfg = PHASE_C_CONFIG.formula;
  const readingGap = Math.max(0, measurable.linguisticLoad - student.traits.readingLevel);
  const vocabularyGap = Math.max(0, measurable.linguisticLoad - student.traits.vocabularyLevel);
  const bloomGap = Math.max(0, measurable.bloomsLevel - student.traits.bloomMastery);
  const speedPenalty = Math.max(0, (cfg.baselineProcessingCenter - student.traits.processingSpeed) / cfg.processingPenaltyDivisor);
  const knowledgePenalty = Math.max(0, (cfg.baselineKnowledgeCenter - student.traits.backgroundKnowledge) / cfg.processingPenaltyDivisor);

  const confusionProfile = clamp(
    measurable.confusionScore
      + cfg.readingGapToConfusion * readingGap
      + cfg.vocabularyGapToConfusion * vocabularyGap
      + cfg.bloomGapToConfusion * bloomGap
      + cfg.speedPenaltyToConfusion * speedPenalty
      + cfg.knowledgePenaltyToConfusion * knowledgePenalty,
    cfg.minConfusionScore,
    cfg.maxConfusionScore,
  );

  const timeProfile = Math.max(
    0,
    measurable.timeSeconds * (
      1
      + cfg.readingGapToTime * readingGap
      + cfg.vocabularyGapToTime * vocabularyGap
      + cfg.bloomGapToTime * bloomGap
      + cfg.speedPenaltyToTime * speedPenalty
      + cfg.knowledgePenaltyToTime * knowledgePenalty
    ),
  );

  return {
    bloomGap,
    confusionProfile,
    timeProfile,
  };
}

function applyBiases(student: SyntheticStudent, confusionProfile: number, timeProfile: number) {
  const confusionScore = clamp(confusionProfile * (1 + student.biases.confusionBias), 0, 1);
  const timeSeconds = Math.max(timeProfile * (1 + student.biases.timeBias), 0);
  return {
    confusionScore,
    timeSeconds,
  };
}

export async function runPhaseCSimulation(input: RunSimulationInput): Promise<{
  simulationRun: SimulationRun;
  resultCount: number;
}> {
  const classRecord = await getClassById(input.classId);
  if (!classRecord) {
    throw new Error("Class not found");
  }

  const students = await getSyntheticStudentsForClass(classRecord.id);
  if (students.length === 0) {
    throw new Error("Synthetic students not found for class");
  }

  const items = await loadDocumentItems(input.documentId);
  if (items.length === 0) {
    throw new Error("No document items found for documentId");
  }

  const measurables = items.map((item) => estimateMeasurables(item));

  const simulationRun = await createSimulationRun({
    classId: classRecord.id,
    documentId: input.documentId,
  });

  const results: SimulationResult[] = [];
  for (const student of students) {
    for (const measurable of measurables) {
      const profileOutput = applyPhaseCCore(student, measurable);
      const biasedOutput = applyBiases(student, profileOutput.confusionProfile, profileOutput.timeProfile);

      results.push({
        id: randomUUID(),
        simulationId: simulationRun.id,
        syntheticStudentId: student.id,
        itemId: measurable.itemId,
        itemLabel: measurable.itemLabel,
        linguisticLoad: measurable.linguisticLoad,
        confusionScore: biasedOutput.confusionScore,
        timeSeconds: biasedOutput.timeSeconds,
        bloomGap: profileOutput.bloomGap,
        traitsSnapshot: student.traits,
      });
    }
  }

  await saveSimulationResults(simulationRun.id, results);
  return {
    simulationRun,
    resultCount: results.length,
  };
}
