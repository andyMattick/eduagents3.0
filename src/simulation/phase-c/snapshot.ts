import { generateSyntheticStudents } from "./generator";
import { clamp, PHASE_C_CONFIG } from "./traits";
import type { ProfilePercentages, TraitVector } from "./types";
import type {
  ClassSnapshot,
  Cliff,
  ItemSnapshot,
  SimulationSnapshot,
  Spike,
  StudentSnapshot,
  TraitSnapshot,
} from "../../types/simulation-snapshot";

const ENGINE_VERSION = "phase-c-snapshot-v1";

const DEFAULT_PROFILE_PERCENTAGES: ProfilePercentages = {
  ell: 20,
  sped: 10,
  adhd: 10,
  dyslexia: 10,
  gifted: 20,
  attention504: 10,
};

const SNAPSHOT_ITEMS = [
  { itemId: "item-1", bloomLevel: 3, linguisticLoad: 0.72, cognitiveLoad: 0.62, representationLoad: 0.45 },
  { itemId: "item-2", bloomLevel: 4, linguisticLoad: 0.62, cognitiveLoad: 0.58, representationLoad: 0.42 },
  { itemId: "item-3", bloomLevel: 4, linguisticLoad: 0.7, cognitiveLoad: 0.64, representationLoad: 0.48 },
  { itemId: "item-4", bloomLevel: 5, linguisticLoad: 0.72, cognitiveLoad: 0.66, representationLoad: 0.52 },
  { itemId: "item-5", bloomLevel: 6, linguisticLoad: 1, cognitiveLoad: 1, representationLoad: 1 },
  { itemId: "item-6", bloomLevel: 6, linguisticLoad: 0.94, cognitiveLoad: 0.9, representationLoad: 0.76 },
] as const;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string) {
  let state = hashSeed(seed) || 0xdeadbeef;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function computeDifficulty(linguisticLoad: number, cognitiveLoad: number, bloomLevel: number, representationLoad: number): number {
  return (0.35 * linguisticLoad) + (0.35 * cognitiveLoad) + (0.2 * (bloomLevel / 6)) + (0.1 * representationLoad);
}

function computeAbility(traits: TraitVector): number {
  return 0.5 * (
    (0.3 * traits.readingLevel)
    + (0.2 * traits.vocabularyLevel)
    + (0.2 * traits.backgroundKnowledge)
    + (0.15 * traits.processingSpeed)
    + (0.15 * traits.bloomMastery)
  );
}

function computeTraitBonus(confusionBias: number, timeBias: number): number {
  return (-0.2 * timeBias) + (-0.2 * confusionBias);
}

function buildTraitDeltas(students: StudentSnapshot[]): Record<string, number> {
  const totals: Record<string, number> = {
    readingLevel: 0,
    vocabularyLevel: 0,
    backgroundKnowledge: 0,
    processingSpeed: 0,
    bloomMastery: 0,
    mathLevel: 0,
    writingLevel: 0,
  };

  for (const student of students) {
    for (const [trait, value] of Object.entries(student.traits)) {
      totals[trait] += value;
    }
  }

  const count = Math.max(students.length, 1);
  const output: Record<string, number> = {};
  for (const [trait, total] of Object.entries(totals)) {
    output[trait] = Number(((total / count) - 3).toFixed(4));
  }

  return output;
}

function buildTraitSnapshot(traitDeltas: Record<string, number>): TraitSnapshot[] {
  return Object.entries(traitDeltas).map(([name, delta]) => ({ name, delta }));
}

function itemMeasurables(seed: string) {
  const rng = createRng(`${seed}:items`);
  return SNAPSHOT_ITEMS.map((item, index) => {
    const jitter = (rng() - 0.5) * 0.06;
    const linguisticLoad = clamp(item.linguisticLoad + jitter, 0, 1);
    const cognitiveLoad = clamp(item.cognitiveLoad + jitter, 0, 1);
    const representationLoad = clamp(item.representationLoad + jitter, 0, 1);
    const bloomLevel = clamp(item.bloomLevel + (index % 2 === 0 ? 0 : 0.15), 1, 6);

    const confusionScore = clamp((linguisticLoad + cognitiveLoad + representationLoad) / 9, 0, 1);
    const timeSeconds = Math.max(0, 21 + (20 * linguisticLoad) + (10 * representationLoad));

    return {
      itemId: item.itemId,
      bloomLevel,
      linguisticLoad,
      cognitiveLoad,
      representationLoad,
      confusionScore,
      timeSeconds,
    };
  });
}

function simulateItem(
  students: ReturnType<typeof generateSyntheticStudents>,
  baseTraitDeltas: Record<string, number>,
  index: number,
  previous: ItemSnapshot | null,
  measurable: ReturnType<typeof itemMeasurables>[number],
): ItemSnapshot {
  const cfg = PHASE_C_CONFIG.formula;

  let pCorrectTotal = 0;
  let confusionTotal = 0;
  let timeTotal = 0;

  const difficulty = computeDifficulty(
    measurable.linguisticLoad,
    measurable.cognitiveLoad,
    measurable.bloomLevel,
    measurable.representationLoad,
  );

  for (const student of students) {
    const readingGap = Math.max(0, measurable.linguisticLoad - student.traits.readingLevel);
    const vocabularyGap = Math.max(0, measurable.linguisticLoad - student.traits.vocabularyLevel);
    const bloomGap = Math.max(0, measurable.bloomLevel - student.traits.bloomMastery);
    const speedPenalty = Math.max(0, (cfg.baselineProcessingCenter - student.traits.processingSpeed) / cfg.processingPenaltyDivisor);
    const knowledgePenalty = Math.max(0, (cfg.baselineKnowledgeCenter - student.traits.backgroundKnowledge) / cfg.processingPenaltyDivisor);

    const confusionProfile = clamp(
      measurable.confusionScore
        + (cfg.readingGapToConfusion * readingGap)
        + (cfg.vocabularyGapToConfusion * vocabularyGap)
        + (cfg.bloomGapToConfusion * bloomGap)
        + (cfg.speedPenaltyToConfusion * speedPenalty)
        + (cfg.knowledgePenaltyToConfusion * knowledgePenalty),
      cfg.minConfusionScore,
      cfg.maxConfusionScore,
    );

    const timeProfile = Math.max(
      0,
      measurable.timeSeconds * (
        1
        + (cfg.readingGapToTime * readingGap)
        + (cfg.vocabularyGapToTime * vocabularyGap)
        + (cfg.bloomGapToTime * bloomGap)
        + (cfg.speedPenaltyToTime * speedPenalty)
        + (cfg.knowledgePenaltyToTime * knowledgePenalty)
      ),
    );

    const confusion = clamp(confusionProfile * (1 + student.biases.confusionBias), 0, 1);
    const timeSeconds = Math.max(timeProfile * (1 + student.biases.timeBias), 0);
    const ability = computeAbility(student.traits);
    const traitBonus = computeTraitBonus(student.biases.confusionBias, student.biases.timeBias);
    const pCorrect = sigmoid(ability + traitBonus - difficulty);

    pCorrectTotal += pCorrect;
    confusionTotal += confusion;
    timeTotal += timeSeconds;
  }

  const studentCount = Math.max(students.length, 1);
  const pCorrect = pCorrectTotal / studentCount;
  const confusion = confusionTotal / studentCount;
  const timeSeconds = timeTotal / studentCount;

  const fatigue = clamp(0.12 + (index * 0.02), 0, 1);

  const spikes: Spike[] = [];
  const cliffs: Cliff[] = [];
  if (previous) {
    const deltaConfusion = confusion - previous.confusion;
    if (deltaConfusion > 0.06) {
      spikes.push({ fromItemId: previous.itemId, deltaConfusion: Number(deltaConfusion.toFixed(4)) });
    }

    const deltaDifficulty = (difficulty - previous.difficulty) + Math.max(0, confusion - previous.confusion) + Math.max(0, previous.pCorrect - pCorrect);
    if (deltaDifficulty > 0.4) {
      cliffs.push({ fromItemId: previous.itemId, deltaDifficulty: Number(deltaDifficulty.toFixed(4)) });
    }
  }

  return {
    itemId: measurable.itemId,
    bloom: Number(measurable.bloomLevel.toFixed(4)),
    difficulty: Number(difficulty.toFixed(4)),
    linguisticLoad: Number(measurable.linguisticLoad.toFixed(4)),
    cognitiveLoad: Number(measurable.cognitiveLoad.toFixed(4)),
    pCorrect: Number(pCorrect.toFixed(4)),
    confusion: Number(confusion.toFixed(4)),
    timeSeconds: Number(timeSeconds.toFixed(4)),
    spikes,
    cliffs,
    fatigue: Number(fatigue.toFixed(4)),
    traitDeltas: { ...baseTraitDeltas },
  };
}

export function simulateAssessment(input: { seed: string; studentCount?: number }): SimulationSnapshot {
  const students = generateSyntheticStudents({
    classId: `phase1-${input.seed}`,
    classLevel: "Standard",
    profilePercentages: DEFAULT_PROFILE_PERCENTAGES,
    studentCount: input.studentCount ?? PHASE_C_CONFIG.defaultSyntheticStudentCount,
    seed: input.seed,
  });

  const classStudents: StudentSnapshot[] = students.map((student) => ({
    id: student.id,
    traits: {
      readingLevel: Number(student.traits.readingLevel.toFixed(4)),
      vocabularyLevel: Number(student.traits.vocabularyLevel.toFixed(4)),
      backgroundKnowledge: Number(student.traits.backgroundKnowledge.toFixed(4)),
      processingSpeed: Number(student.traits.processingSpeed.toFixed(4)),
      bloomMastery: Number(student.traits.bloomMastery.toFixed(4)),
      mathLevel: Number(student.traits.mathLevel.toFixed(4)),
      writingLevel: Number(student.traits.writingLevel.toFixed(4)),
    },
  }));

  const baseTraitDeltas = buildTraitDeltas(classStudents);
  const measurables = itemMeasurables(input.seed);
  const items: ItemSnapshot[] = [];

  for (let index = 0; index < measurables.length; index += 1) {
    const previous = index > 0 ? items[index - 1] : null;
    items.push(simulateItem(students, baseTraitDeltas, index, previous, measurables[index]));
  }

  const classSnapshot: ClassSnapshot = {
    students: classStudents,
  };

  return {
    engineVersion: ENGINE_VERSION,
    seed: input.seed,
    items,
    class: classSnapshot,
    traits: buildTraitSnapshot(baseTraitDeltas),
  };
}
