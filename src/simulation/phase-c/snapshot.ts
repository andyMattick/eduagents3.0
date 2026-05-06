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

function mean(values: number[], fallback = 0): number {
  if (values.length === 0) {
    return fallback;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
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

/**
 * Compute answer key measurables from raw answer text.
 * Returns difficulty adjustment and p-correct adjustment based on answer complexity.
 */
function computeAnswerKeyAdjustments(answer: string): { answerKeyDifficultyAdjustment: number; answerKeyPCorrectAdjustment: number } {
  const normalized = answer.trim();
  if (!normalized) {
    return { answerKeyDifficultyAdjustment: 0, answerKeyPCorrectAdjustment: 0 };
  }

  // Detect answer type
  const isMultipleChoice = /^[a-e]$/i.test(normalized);
  const isNumeric = /^-?\d+(\.\d+)?$/.test(normalized);
  const isSymbolic = /[=^\-+*/(){}[\]<>]/.test(normalized);

  // Ambiguity: multiple answers separated by | or /
  const ambiguityScore = /[|/,]|\bor\b/i.test(normalized) ? 0.5 : 0;

  // Format complexity
  let formatComplexity = 0;
  if (isNumeric) formatComplexity = 0.2;
  else if (isMultipleChoice) formatComplexity = 0.1;
  else if (isSymbolic) formatComplexity = 0.55;
  else formatComplexity = 0.45;

  // Length penalty
  const lengthPenalty = normalized.length > 24 ? 0.25 : 0;

  const answerKeyDifficultyAdjustment = Number(((ambiguityScore * 0.18) + (formatComplexity * 0.12) + (lengthPenalty * 0.05)).toFixed(4));
  const answerKeyPCorrectAdjustment = Number(clamp(-answerKeyDifficultyAdjustment * 0.55, -0.3, 0.2).toFixed(4));

  return { answerKeyDifficultyAdjustment, answerKeyPCorrectAdjustment };
}

/**
 * Compute worked solution measurables from step texts.
 * Returns step difficulty curves and branching factor.
 */
function computeWorkedSolutionAdjustments(
  steps: string[],
  baseDifficulty: number,
): {
  stepDifficultyCurve: number[];
  stepTimeCurve: number[];
  stepCognitiveLoadCurve: number[];
  branchingFactor: number;
  errorOpportunityCount: number;
} {
  if (!steps || steps.length === 0) {
    return {
      stepDifficultyCurve: [],
      stepTimeCurve: [],
      stepCognitiveLoadCurve: [],
      branchingFactor: 1,
      errorOpportunityCount: 0,
    };
  }

  let symbolCount = 0;
  let characterCount = 0;

  const stepDifficultyCurve: number[] = [];
  const stepTimeCurve: number[] = [];
  const stepCognitiveLoadCurve: number[] = [];

  steps.forEach((step, index) => {
    const words = step.split(/\s+/).filter(Boolean).length;
    const symbols = (step.match(/[=+\-*/^<>()[\]{}]/g) ?? []).length;
    symbolCount += symbols;
    characterCount += Math.max(step.length, 1);

    // Determine step type based on keywords
    const lower = step.toLowerCase();
    let stepTypeComplexity = 0.4;
    if (/calculate|compute|solve|simplify|substitute|evaluate/.test(lower)) {
      stepTypeComplexity = 0.45;
    } else if (/infer|conclude|deduce|imply|therefore/.test(lower)) {
      stepTypeComplexity = 0.75;
    } else if (/define|concept|principle|why|because/.test(lower)) {
      stepTypeComplexity = 0.68;
    } else if (/first|next|then|step|procedure|algorithm/.test(lower)) {
      stepTypeComplexity = 0.55;
    }

    const positionLift = Math.min(index / Math.max(steps.length - 1, 1), 1) * 0.15;
    stepDifficultyCurve.push(Number(clamp(baseDifficulty + stepTypeComplexity * 0.35 + positionLift, 0, 1).toFixed(4)));
    stepTimeCurve.push(Number(Math.max(8, (words * 2.1) + (symbols * 1.8) + (stepTypeComplexity * 9)).toFixed(4)));
    stepCognitiveLoadCurve.push(Number(clamp((stepTypeComplexity * 0.8) + (symbols * 0.03), 0, 1).toFixed(4)));
  });

  const transformationDensity = characterCount > 0 ? symbolCount / characterCount : 0;
  const branchingFactor = Math.max(1, Math.min(6, Math.round(steps.length / 2)));
  const errorOpportunityCount = Math.max(1, steps.length - 1 + (branchingFactor - 1));

  return {
    stepDifficultyCurve,
    stepTimeCurve,
    stepCognitiveLoadCurve,
    branchingFactor,
    errorOpportunityCount,
  };
}

type ItemMeasurable = {
  itemId: string;
  bloomLevel: number;
  linguisticLoad: number;
  cognitiveLoad: number;
  representationLoad: number;
  confusionScore: number;
  timeSeconds: number;
  stepDifficultyCurve: number[];
  stepTimeCurve: number[];
  stepCognitiveLoadCurve: number[];
  answerKeyDifficultyAdjustment: number;
  answerKeyPCorrectAdjustment: number;
  branchingFactor: number;
  errorOpportunityCount: number;
};

/**
 * @deprecated Item traits now come from v4_items.metadata.final via the ingestion washover pipeline.
 * The runtime handler (api/v4/simulations/run.js) loads traits directly from the database using
 * loadItemTraitsFromDb(documentId). This stub exists only to satisfy the TypeScript build.
 */
function itemMeasurables(
  _seed?: string,
  _answerKeyByItem?: Record<number, string>,
  _workedSolutionByItem?: Record<number, string[]>,
): ItemMeasurable[] {
  return [];
}

function simulateItem(
  students: ReturnType<typeof generateSyntheticStudents>,
  baseTraitDeltas: Record<string, number>,
  index: number,
  previous: ItemSnapshot | null,
  measurable: ItemMeasurable,
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
  ) + measurable.answerKeyDifficultyAdjustment;

  for (const student of students) {
    const readingGap = Math.max(0, measurable.linguisticLoad - student.traits.readingLevel);
    const vocabularyGap = Math.max(0, measurable.linguisticLoad - student.traits.vocabularyLevel);
    const bloomGap = Math.max(0, measurable.bloomLevel - student.traits.bloomMastery);
    const speedPenalty = Math.max(0, (cfg.baselineProcessingCenter - student.traits.processingSpeed) / cfg.processingPenaltyDivisor);
    const knowledgePenalty = Math.max(0, (cfg.baselineKnowledgeCenter - student.traits.backgroundKnowledge) / cfg.processingPenaltyDivisor);

    const confusionProfile = clamp(
      mean(measurable.stepCognitiveLoadCurve, measurable.confusionScore)
        + Math.min((measurable.branchingFactor - 1) * 0.04, 0.2)
        + Math.min(measurable.errorOpportunityCount * 0.01, 0.1)
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
      measurable.stepTimeCurve.reduce((total, value) => total + value, 0) * (
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
    const pCorrect = clamp(sigmoid(ability + traitBonus - difficulty) + measurable.answerKeyPCorrectAdjustment, 0, 1);

    pCorrectTotal += pCorrect;
    confusionTotal += confusion;
    timeTotal += timeSeconds;
  }

  const studentCount = Math.max(students.length, 1);
  const pCorrect = pCorrectTotal / studentCount;
  const confusion = confusionTotal / studentCount;
  const timeSeconds = timeTotal / studentCount;

  const fatigue = clamp(0.12 + (index * 0.02), 0, 1);
  const momentum = Number((previous ? pCorrect - previous.pCorrect : 0).toFixed(4));
  const z95 = 1.96;
  const pStdErr = Math.sqrt((pCorrect * Math.max(1 - pCorrect, 0)) / studentCount);
  const ciLow = clamp(pCorrect - (z95 * pStdErr), 0, 1);
  const ciHigh = clamp(pCorrect + (z95 * pStdErr), 0, 1);
  const predictedDifficultyCurve = measurable.stepDifficultyCurve.map((value) => Number(clamp(value + Math.max(0, -momentum) * 0.1, 0, 1).toFixed(4)));
  const predictedTimeCurve = measurable.stepTimeCurve.map((value, stepIndex) => Number((value * (1 + (fatigue * 0.08) + (stepIndex * 0.01))).toFixed(4)));
  const predictedConfusionCurve = measurable.stepCognitiveLoadCurve.map((value) => Number(clamp(value + (fatigue * 0.15), 0, 1).toFixed(4)));

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
    momentum,
    confidenceInterval: [Number(ciLow.toFixed(4)), Number(ciHigh.toFixed(4))],
    predictedDifficultyCurve,
    predictedTimeCurve,
    predictedConfusionCurve,
    predictedState: {
      fatigue: Number(fatigue.toFixed(4)),
      confusion: Number(confusion.toFixed(4)),
      momentum,
    },
    profileNarrative: `Item ${measurable.itemId} projects ${confusion > 0.35 ? "heightened" : "stable"} confusion with momentum ${momentum >= 0 ? "improving" : "declining"}.`,
    comparisonNarrative: previous
      ? `Compared with ${previous.itemId}, projected difficulty moved by ${Number((difficulty - previous.difficulty).toFixed(4))}.`
      : "Baseline projection item.",
    traitDeltas: { ...baseTraitDeltas },
  };
}

export function simulateAssessment(input: {
  seed: string;
  documentId?: string;
  studentCount?: number;
  answerKeyByItem?: Record<number, string>;
  workedSolutionByItem?: Record<number, string[]>;
}): SimulationSnapshot {
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
  const measurables = itemMeasurables(input.seed, input.answerKeyByItem, input.workedSolutionByItem);
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
