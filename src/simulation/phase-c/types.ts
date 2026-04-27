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
  traitsSnapshot?: SimulationTraitsSnapshot;
};

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
