export type ClassLevel = "AP" | "Honors" | "Standard" | "Remedial";
export type GradeBand = "9-10" | "11-12" | "Mixed";

export type PresenceLevel = "None" | "A few" | "Some" | "Many";

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

export type ClassComposition = {
  ell: PresenceLevel;
  sped: PresenceLevel;
  gifted: PresenceLevel;
  attentionChallenges: PresenceLevel;
  readingChallenges: PresenceLevel;
};

export type ClassTendencies = {
  manyFastWorkers?: boolean;
  manySlowAndCareful?: boolean;
  manyDetailOriented?: boolean;
  manyTestAnxious?: boolean;
  manyMathConfident?: boolean;
  manyStruggleReading?: boolean;
  manyEasilyDistracted?: boolean;
};

export type ClassOverlays = {
  composition: ClassComposition;
  tendencies: ClassTendencies;
};

export type PhaseCClass = {
  id: string;
  teacherId?: string;
  name: string;
  level: ClassLevel;
  gradeBand?: GradeBand;
  schoolYear: string;
  overlays: ClassOverlays;
  createdAt: string;
};
export type Class = PhaseCClass;

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
  traitsSnapshot?: TraitVector;
};

export type CreateClassInput = {
  teacherId?: string;
  name: string;
  level: ClassLevel;
  gradeBand?: GradeBand;
  schoolYear?: string;
  overlays: ClassOverlays;
  studentCount?: number;
  seed?: string;
};

export type RegenerateStudentsInput = {
  classId: string;
  studentCount?: number;
  seed?: string;
};

export type RunSimulationInput = {
  classId: string;
  documentId: string;
};

export type SimulationView = "class" | "profile" | "student";
