export type CognitiveProcess =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate";

export type QuestionType =
  | "multipleChoice"
  | "shortAnswer"
  | "constructedResponse";

export type DifficultyProfile = "easy" | "onLevel" | "challenge";

export type DifficultyModifier = "low" | "medium" | "high";

export type OrderingStrategy =
  | "progressive"
  | "mixed"
  | "backloaded";

export type BlueprintPlanV3_2 = {
  // Global shape
  intensity: "light" | "moderate" | "deep";
  scopeWidth: "narrow" | "focused" | "broad";

  // Depth band
  depthFloor: CognitiveProcess;
  depthCeiling: CognitiveProcess;

  // Overall rigor
  difficultyProfile: DifficultyProfile;

  // Size
  questionCount: number;

  // Summary cognitive distribution (must match slots)
  cognitiveDistribution: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
  };

  // Ordering strategy for cognitive escalation
  orderingStrategy: OrderingStrategy;

  // Global pacing
  pacingSecondsPerItem: number;
  totalEstimatedTimeSeconds: number;
  pacingToleranceSeconds: number; // NEW

  // Binding, ordered slots
  slots: {
    index: number; // 1-based

    cognitiveProcess: CognitiveProcess;

    type: QuestionType;

    // Per-slot difficulty relative to overall profile
    difficultyModifier: DifficultyModifier;

    // Optional conceptual tag for breadth control
    conceptTag?: string;

    estimatedTimeSeconds: number;
  }[];

  // Validation contract (NEW)
  validation: {
    // Distribution must match slot counts
    enforceDistributionMatch: boolean;

    // Slot cognitiveProcess must be within depth band
    enforceDepthBand: boolean;

    // No more than N identical cognitive levels in sequence
    maxSequentialCognitiveRepeats: number;

    // Difficulty mapping table must be applied
    enforceDifficultyMapping: boolean;

    // Escalation strategy must be followed
    enforceOrderingStrategy: boolean;

    // Pacing must be within tolerance
    enforcePacing: boolean;

    // Scope width must match conceptTag diversity
    enforceScopeWidth: boolean;
  };
};
