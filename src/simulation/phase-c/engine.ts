import { randomUUID } from "crypto";

import { clamp, PHASE_C_CONFIG } from "./traits";
import {
  createSimulationRun,
  getClassById,
  getSyntheticStudentsForClass,
  saveSimulationResults,
} from "./store";
import type {
  PhaseBNormalizedItemInput,
  RunSimulationInput,
  SimulationResult,
  SimulationRun,
  SyntheticStudent,
} from "./types";

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

function measurableFromNormalizedItem(item: PhaseBNormalizedItemInput): PhaseBItemMeasurables {
  const label = item.logicalLabel
    ? `Item ${item.logicalLabel}`
    : typeof item.itemNumber === "number"
    ? `Item ${item.itemNumber}`
    : `Item ${item.itemId}`;

  const linguisticLoad = clamp(item.traits.linguisticLoad, 0, 1);
  const cognitiveLoad = clamp(item.traits.cognitiveLoad, 0, 1);
  const bloomLevel = clamp(item.traits.bloomLevel, 1, 6);
  const representationLoad = clamp(item.traits.representationLoad, 0, 1);
  const confusionScore = clamp((linguisticLoad + cognitiveLoad + representationLoad) / 3, 0, 1);
  const timeSeconds = Math.max(0, 30 + (45 * linguisticLoad) + (15 * representationLoad));

  return {
    itemId: item.itemId,
    itemLabel: label,
    linguisticLoad,
    cognitiveLoad,
    bloomLevel,
    representationLoad,
    confusionScore,
    timeSeconds,
  };
}

function studentMatchesProfiles(student: SyntheticStudent, selectedProfileIds: string[]): boolean {
  if (selectedProfileIds.length === 0) {
    return true;
  }

  const studentValues = new Set<string>([
    ...student.profiles.map((profile) => profile.toLowerCase()),
    ...student.positiveTraits.map((trait) => trait.toLowerCase()),
  ]);

  return selectedProfileIds.some((value) => studentValues.has(value.toLowerCase()));
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

  const selectedProfileIds = input.selectedProfileIds ?? [];
  const scopedStudents = students.filter((student) => studentMatchesProfiles(student, selectedProfileIds));
  if (scopedStudents.length === 0) {
    throw new Error("Synthetic students not found for class");
  }

  const normalizedItems = input.items ?? [];
  if (normalizedItems.length === 0) {
    throw new Error("No document items found for documentId");
  }

  const measurableItems = normalizedItems.map((item) => measurableFromNormalizedItem(item));

  const simulationRun = await createSimulationRun({
    classId: classRecord.id,
    documentId: input.documentId,
  });

  const results: SimulationResult[] = [];
  for (const student of scopedStudents) {
    for (const measurable of measurableItems) {
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
