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
  cognitiveLoad: number;
  bloomLevel: number;
  representationLoad: number;
  confusionScore: number;
  timeSeconds: number;
};

function isSupabaseSchemaCacheError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("PGRST205")
    || error.message.includes("PGRST204")
    || error.message.includes("Could not find the table")
    || error.message.includes("schema cache");
}

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
    readNumeric(item.metadata, ["linguisticLoad", "linguistic_load", "phaseB.linguisticLoad", "phaseB.linguistic_load", "metrics.linguistic_load"], avgSentenceLength / cfg.defaultLinguisticLoadDivisor),
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
  const bloomLevel = clamp(readNumeric(item.metadata, ["bloomLevel", "bloom_level", "bloomsLevel", "phaseB.bloomLevel", "phaseB.bloom_level", "phaseB.bloomsLevel", "metrics.bloom_level", "metrics.blooms_level"], cfg.defaultBloomsLevel), cfg.minBloomsLevel, cfg.maxBloomsLevel);
  const cognitiveLoad = clamp(readNumeric(item.metadata, ["cognitiveLoad", "cognitive_load", "phaseB.cognitiveLoad", "phaseB.cognitive_load", "metrics.cognitive_load"], linguisticLoad), cfg.minLinguisticLoad, cfg.maxLinguisticLoad);
  const representationLoad = clamp(readNumeric(item.metadata, ["representationLoad", "representation_load", "phaseB.representationLoad", "phaseB.representation_load", "metrics.representation_load"], 1), cfg.minLinguisticLoad, cfg.maxLinguisticLoad);

  return {
    itemId: item.id,
    itemLabel: `Item ${item.item_number}`,
    linguisticLoad,
    cognitiveLoad,
    bloomLevel,
    representationLoad,
    confusionScore,
    timeSeconds,
  };
}

async function loadDocumentItems(documentId: string): Promise<SourceItem[]> {
  try {
    const rows = await supabaseRest("v4_items", {
      method: "GET",
      select: "id,item_number,stem,metadata",
      filters: {
        document_id: `eq.${documentId}`,
        order: "item_number.asc",
      },
    });

    return (rows as SourceItem[]) ?? [];
  } catch (error) {
    if (!isSupabaseSchemaCacheError(error)) {
      throw error;
    }

    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`Phase C: failed to read v4_items; treating as missing document items. ${detail}`);
    return [];
  }
}

function applyPhaseCCore(student: SyntheticStudent, measurable: PhaseBItemMeasurables) {
  const cfg = PHASE_C_CONFIG.formula;
  const readingGap = Math.max(0, measurable.linguisticLoad - student.traits.readingLevel);
  const vocabularyGap = Math.max(0, measurable.linguisticLoad - student.traits.vocabularyLevel);
  const bloomGap = Math.max(0, measurable.bloomLevel - student.traits.bloomMastery);
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

function computeDifficultyScore(measurable: PhaseBItemMeasurables): number {
  return (
    0.35 * measurable.linguisticLoad
    + 0.35 * measurable.cognitiveLoad
    + 0.20 * measurable.bloomLevel
    + 0.10 * measurable.representationLoad
  );
}

function computeAbilityScore(student: SyntheticStudent): number {
  return (
    0.30 * student.traits.readingLevel
    + 0.20 * student.traits.vocabularyLevel
    + 0.20 * student.traits.backgroundKnowledge
    + 0.15 * student.traits.processingSpeed
    + 0.15 * student.traits.bloomMastery
  );
}

function computeTraitBonus(student: SyntheticStudent): number {
  return (-0.20 * student.biases.timeBias) + (-0.20 * student.biases.confusionBias);
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
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
      const difficultyScore = computeDifficultyScore(measurable);
      const abilityScore = computeAbilityScore(student);
      const traitBonus = computeTraitBonus(student);
      const pCorrect = sigmoid(abilityScore + traitBonus - difficultyScore);

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
        difficultyScore,
        abilityScore,
        pCorrect,
        traitsSnapshot: {
          traits: student.traits,
          profiles: student.profiles,
          positiveTraits: student.positiveTraits,
          biases: student.biases,
        },
      });
    }
  }

  await saveSimulationResults(simulationRun.id, results);
  return {
    simulationRun,
    resultCount: results.length,
  };
}
