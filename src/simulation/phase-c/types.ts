export type ClassLevel = "AP" | "Honors" | "Standard" | "Remedial";
export type GradeBand = "9-10" | "11-12" | "Mixed";

export type ProfileId = "ELL" | "SPED" | "Gifted" | "ADHD" | "Dyslexic" | "MathAnxious" | "TestCalm";
export type ProfileType = ProfileId;

export type PositiveTraitId =
  | "fast_worker"
  | "slow_and_careful"
  | "detail_oriented"
  | "impulsive"
  | "test_anxious"
  | "test_calm"
  | "strong_reader"
  | "struggles_with_reading"
  | "math_confident"
  | "math_avoidant"
  | "high_background_knowledge"
  | "low_background_knowledge"
  | "organized"
  | "easily_distracted"
  | "persistent"
  | "gives_up_quickly"
  | "creative_thinker"
  | "collaborative"
  | "independent"
  | "question_asker"
  | "reluctant_participant"
  | "memory_strong";
export type PositiveTraitType = PositiveTraitId;

export type TraitVector = {
  readingLevel: number;
  vocabularyLevel: number;
  backgroundKnowledge: number;
  processingSpeed: number;
  bloomMastery: number;
  mathLevel: number;
  writingLevel: number;
};

export type BiasVector = {
  confusionBias: number;
  timeBias: number;
};

export type ProfilePercentages = {
  ell: number;
  sped: number;
  adhd: number;
  dyslexia: number;
  gifted: number;
  attention504: number;
};

export type PhaseCClass = {
  id: string;
  teacherId?: string;
  name: string;
  level: ClassLevel;
  gradeBand?: GradeBand;
  schoolYear: string;
  createdAt: string;
};

export type Class = {
  id: string;
  name: string;
  gradeBand?: GradeBand;
  classLevel: ClassLevel;
  profilePercentages: ProfilePercentages;
};

export type SyntheticStudent = {
  id: string;
  classId: string;
  displayName: string;
  traits: TraitVector;
  profiles: ProfileId[];
  positiveTraits: PositiveTraitId[];
  profileSummaryLabel: string;
  biases: BiasVector;
};

export type SimulationRun = {
  id: string;
  classId: string;
  documentId: string;
  createdAt: string;
};

export type SimulationTraitsSnapshot = {
  traits: TraitVector;
  profiles: ProfileId[];
  positiveTraits: PositiveTraitId[];
  biases: BiasVector;
};

export type SimulationResult = {
  id: string;
  simulationId: string;
  syntheticStudentId: string;
  itemId: string;
  itemLabel: string;
  linguisticLoad: number;
  confusionScore: number;
  timeSeconds: number;
  bloomGap: number;
  difficultyScore: number;
  abilityScore: number;
  pCorrect: number;
  pScore?: number;
  partialCreditProbability?: number;
  traitsSnapshot?: SimulationTraitsSnapshot;
};

export interface RubricMeasurables {
  hasRubric: boolean;
  rubricStrictness: number;
  rubricTolerance: number;
  partialCreditEnabled: boolean;
  requiredElementsCount: number;
  qualityThreshold: number;
}

export interface BaseMeasurables {
  linguisticLoad: number;
  cognitiveLoad: number;
  bloomEstimate: number;
  conceptDensity: number;
  representationLoad: number;
  itemLength: number;
  readingComplexity: number;
  surfaceDifficulty: number;
}

export interface AnswerKeyMeasurables {
  hasAnswerKey: boolean;
  correctAnswer: string;
  answerType: "numeric" | "symbolic" | "mc" | "text";
  distractorCount?: number;
  distractorMapping?: Record<string, string>;
  misconceptionIds?: string[];
  answerAmbiguityScore: number;
  answerFormatComplexity: number;
  answerKeyDifficultyAdjustment: number;
  answerKeyPCorrectAdjustment: number;
}

export type StepType = "computational" | "inferential" | "conceptual" | "procedural" | "interpretive";

export interface StepMeasurables {
  hasWorkedSolution: boolean;
  stepCount: number;
  stepTypes: Record<StepType, number>;
  stepComplexity: number;
  branchingFactor: number;
  transformationDensity: number;
  errorOpportunityCount: number;
  stepDifficultyCurve: number[];
  stepTimeCurve: number[];
  stepCognitiveLoadCurve: number[];
  conceptTransitionMap: string[];
}

export interface CombinedMeasurables {
  hasAnswerKeyAndSteps: boolean;
  solutionPathFidelity: number;
  answerStepAlignment: number;
  minimalStepComparison: number;
  solutionEfficiencyScore: number;
  misconceptionStepMapping: Record<string, number[]>;
  distractorStepMapping: Record<string, number[]>;
  conceptToAnswerAlignment: number;
}

export interface ItemMeasurables {
  base: BaseMeasurables;
  answerKey?: AnswerKeyMeasurables;
  steps?: StepMeasurables;
  rubric?: RubricMeasurables;
  combined?: CombinedMeasurables;
}

export interface ItemResources {
  hasAnswerKey: boolean;
  hasWorkedSolution: boolean;
  hasRubric?: boolean;
}

export type CreateClassInput = {
  teacherId?: string;
  name: string;
  level: ClassLevel;
  gradeBand?: GradeBand;
  schoolYear?: string;
  profilePercentages: ProfilePercentages;
  studentCount?: number;
  seed?: string;
};

export type RegenerateStudentsInput = {
  classId: string;
  profilePercentages?: ProfilePercentages;
  studentCount?: number;
  seed?: string;
};

export type PhaseBNormalizedItemInput = {
  itemId: string;
  itemNumber?: number;
  logicalLabel?: string;
  resources?: ItemResources;
  measurables?: ItemMeasurables;
  traits: {
    bloomLevel: number;
    linguisticLoad: number;
    cognitiveLoad: number;
    representationLoad: number;
    symbolDensity?: number;
    vocabDensity?: number;
    steps?: number;
  };
};

export type RunSimulationInput = {
  classId: string;
  documentId: string;
  selectedProfileIds?: string[];
  items: PhaseBNormalizedItemInput[];
};

export type SimulationView = "class" | "profile" | "student";
