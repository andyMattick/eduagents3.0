export interface SimulationSnapshot {
  engineVersion: string;
  seed: string;

  items: ItemSnapshot[];
  class: ClassSnapshot;
  traits: TraitSnapshot[];
}

export interface Spike {
  fromItemId: string;
  deltaConfusion: number;
}

export interface Cliff {
  fromItemId: string;
  deltaDifficulty: number;
}

export interface ItemSnapshot {
  itemId: string;
  bloom: number;
  difficulty: number;
  linguisticLoad: number;
  cognitiveLoad: number;

  pCorrect: number;
  confusion: number;
  timeSeconds: number;

  spikes: Spike[];
  cliffs: Cliff[];
  fatigue: number;
  momentum?: number;
  confidenceInterval?: [number, number];
  predictedDifficultyCurve?: number[];
  predictedTimeCurve?: number[];
  predictedConfusionCurve?: number[];
  predictedState?: {
    fatigue: number;
    confusion: number;
    momentum: number;
  };
  profileNarrative?: string;
  comparisonNarrative?: string;

  traitDeltas: Record<string, number>;
}

export interface ClassSnapshot {
  students: StudentSnapshot[];
}

export interface StudentSnapshot {
  id: string;
  traits: Record<string, number>;
}

export interface TraitSnapshot {
  name: string;
  delta: number;
}
