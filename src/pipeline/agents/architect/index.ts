import { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { Blueprint } from "@/pipeline/contracts/Blueprint";
import {
  BlueprintPlanV3_2,
  CognitiveProcess,
  DifficultyProfile,
  DifficultyModifier,
  OrderingStrategy,
  QuestionType
} from "@/pipeline/contracts/BlueprintPlanV3_2";
import { buildWriterPrompt } from "@/pipeline/agents/writer/writerPrompt";

export async function runArchitect(uar: UnifiedAssessmentRequest): Promise<Blueprint> {
  //
  // 1. Derive high-level knobs from UAR
  //

  // Intensity from time
  const intensity: BlueprintPlanV3_2["intensity"] =
    uar.time <= 10 ? "light" :
    uar.time <= 25 ? "moderate" :
    "deep";

  // Difficulty profile – keep simple/onLevel for now, could later key off studentLevel
  const difficultyProfile: DifficultyProfile = "onLevel";

  // Ordering strategy from assessmentType
  const orderingStrategy: OrderingStrategy =
    uar.assessmentType === "testReview" || uar.assessmentType === "worksheet"
      ? "mixed"
      : "progressive";

  // Pacing per item by assessmentType
  const pacingSecondsPerItem =
    uar.assessmentType === "bellRinger" || uar.assessmentType === "exitTicket"
      ? 30
      : uar.assessmentType === "quiz"
      ? 45
      : 60;

  const totalEstimatedTimeSeconds = uar.time * 60;

  // Question count from time and pacing
  const questionCount = Math.max(
    1,
    Math.floor(totalEstimatedTimeSeconds / pacingSecondsPerItem)
  );

  const pacingToleranceSeconds = 10;

  //
  // 2. Choose a target cognitive distribution (weights)
  //

  const baseDistribution: Record<CognitiveProcess, number> =
    uar.assessmentType === "bellRinger" || uar.assessmentType === "exitTicket"
      ? { remember: 0.5, understand: 0.4, apply: 0.1, analyze: 0, evaluate: 0 }
      : uar.assessmentType === "quiz"
      ? { remember: 0.2, understand: 0.4, apply: 0.3, analyze: 0.1, evaluate: 0 }
      : uar.assessmentType === "test" || uar.assessmentType === "testReview"
      ? { remember: 0.15, understand: 0.25, apply: 0.3, analyze: 0.2, evaluate: 0.1 }
      : // worksheet default
        { remember: 0.2, understand: 0.3, apply: 0.3, analyze: 0.15, evaluate: 0.05 };

  //
  // 3. Generate cognitiveProcess sequence for slots
  //

  const cpOrder: CognitiveProcess[] = [
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate"
  ];

  const cps: CognitiveProcess[] = [];
  for (const cp of cpOrder) {
    const count = Math.round(baseDistribution[cp] * questionCount);
    for (let i = 0; i < count; i++) {
      cps.push(cp);
    }
  }

  // Adjust length to exactly questionCount
  while (cps.length < questionCount) {
    cps.push("understand");
  }
  if (cps.length > questionCount) {
    cps.length = questionCount;
  }

  //
  // 4. Derive depth band from actual cps used
  //

  const usedSet = new Set<CognitiveProcess>(cps);
  const usedOrdered = cpOrder.filter(cp => usedSet.has(cp));
  const depthFloor: CognitiveProcess = usedOrdered[0] ?? "remember";
  const depthCeiling: CognitiveProcess =
    usedOrdered[usedOrdered.length - 1] ?? "understand";

  //
  // 5. Build slots
  //

  const defaultType: QuestionType = "multipleChoice";

  const slots: BlueprintPlanV3_2["slots"] = cps.map((cp, i) => {
    const difficultyModifier: DifficultyModifier =
      cp === "remember"
        ? "low"
        : cp === "understand"
        ? "medium"
        : cp === "apply"
        ? "medium"
        : "high";

    return {
      index: i + 1, // 1-based
      cognitiveProcess: cp,
      type: defaultType,
      difficultyModifier,
      conceptTag: undefined,
      estimatedTimeSeconds: pacingSecondsPerItem
    };
  });

  //
  // 6. Compute actual cognitiveDistribution from slots
  //

  const cognitiveDistribution: BlueprintPlanV3_2["cognitiveDistribution"] = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0
  };

  for (const slot of slots) {
    cognitiveDistribution[slot.cognitiveProcess] += 1 / questionCount;
  }

  //
  // 7. Validation contract
  //

  const validation: BlueprintPlanV3_2["validation"] = {
    enforceDistributionMatch: true,
    enforceDepthBand: true,
    maxSequentialCognitiveRepeats: 3,
    enforceDifficultyMapping: true,
    enforceOrderingStrategy: true,
    enforcePacing: true,
    enforceScopeWidth: true
  };

  //
  // 8. Scope width – simple default for now
  //

  const scopeWidth: BlueprintPlanV3_2["scopeWidth"] =
    uar.assessmentType === "test" || uar.assessmentType === "testReview"
      ? "broad"
      : uar.assessmentType === "quiz"
      ? "focused"
      : "narrow";

  //
  // 9. Assemble plan
  //

  const plan: BlueprintPlanV3_2 = {
    intensity,
    scopeWidth,
    depthFloor,
    depthCeiling,
    difficultyProfile,
    questionCount,
    cognitiveDistribution,
    orderingStrategy,
    pacingSecondsPerItem,
    totalEstimatedTimeSeconds,
    pacingToleranceSeconds,
    slots,
    validation
  };

  //
  // 10. Constraints + writerPrompt + Blueprint
  //

  const constraints: Blueprint["constraints"] = {
    mustAlignToTopic: true,
    avoidTrickQuestions: true,
    avoidSensitiveContent: true,
    respectTimeLimit: true
  };

  const writerPrompt = buildWriterPrompt(uar, plan, constraints);

  return {
    uar,
    writerPrompt,
    plan,
    constraints
  };
}
