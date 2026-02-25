import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { buildArchitectUAR } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { Blueprint } from "@/pipeline/contracts/Blueprint";
import { buildArchitectPrompt } from "./architectPrompt";
import { buildWriterPrompt } from "@/pipeline/agents/writer/writerPrompt";
import { callGemini } from "@/pipeline/llm/gemini";


import {
  BlueprintPlanV3_2,
  CognitiveProcess,
  DifficultyProfile,
  DifficultyModifier,
  OrderingStrategy
} from "@/pipeline/contracts/BlueprintPlanV3_2";

export async function runArchitect({
  uar,
  agentId: _agentId,
  compensation: _compensation
}: {
  uar: UnifiedAssessmentRequest;
  agentId: string;
  compensation: any;
}): Promise<Blueprint> {

  //
  // 0. Normalize to ArchitectUAR before any planning
  //
  const architectUAR = buildArchitectUAR(uar);

  //
  // 1. Your deterministic planning logic (unchanged)
  //

  const intensity: BlueprintPlanV3_2["intensity"] =
    architectUAR.timeMinutes <= 10 ? "light" :
    architectUAR.timeMinutes <= 25 ? "moderate" :
    "deep";

  const difficultyProfile: DifficultyProfile = "onLevel";

  const orderingStrategy: OrderingStrategy =
    architectUAR.assessmentType === "testReview" || architectUAR.assessmentType === "worksheet"
      ? "mixed"
      : "progressive";

  const pacingSecondsPerItem =
    architectUAR.assessmentType === "bellRinger" || architectUAR.assessmentType === "exitTicket"
      ? 30
      : architectUAR.assessmentType === "quiz"
      ? 45
      : 60;

  const totalEstimatedTimeSeconds = architectUAR.timeMinutes * 60;

  const questionCount = Math.max(
    1,
    architectUAR.questionCount ?? Math.floor(totalEstimatedTimeSeconds / pacingSecondsPerItem)
  );

  const pacingToleranceSeconds = 10;

  //
  // 2. Cognitive distribution (unchanged)
  //

  const baseDistribution: Record<CognitiveProcess, number> =
    architectUAR.assessmentType === "bellRinger" || architectUAR.assessmentType === "exitTicket"
      ? { remember: 0.5, understand: 0.4, apply: 0.1, analyze: 0, evaluate: 0 }
      : architectUAR.assessmentType === "quiz"
      ? { remember: 0.2, understand: 0.4, apply: 0.3, analyze: 0.1, evaluate: 0 }
      : architectUAR.assessmentType === "test" || architectUAR.assessmentType === "testReview"
      ? { remember: 0.15, understand: 0.25, apply: 0.3, analyze: 0.2, evaluate: 0.1 }
      : { remember: 0.2, understand: 0.3, apply: 0.3, analyze: 0.15, evaluate: 0.05 };

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
    for (let i = 0; i < count; i++) cps.push(cp);
  }

  while (cps.length < questionCount) cps.push("understand");
  if (cps.length > questionCount) cps.length = questionCount;

  const usedSet = new Set<CognitiveProcess>(cps);
  const usedOrdered = cpOrder.filter(cp => usedSet.has(cp));
  const depthFloor: CognitiveProcess = usedOrdered[0] ?? "remember";
  const depthCeiling: CognitiveProcess =
    usedOrdered[usedOrdered.length - 1] ?? "understand";

  //
  // 3. Build extensible slots (unchanged)
  //

  const teacherTypes = architectUAR.questionTypes

  const slots = cps.map((cp, i) => {
    const questionType = teacherTypes[i % teacherTypes.length];

    const difficultyModifier: DifficultyModifier =
      cp === "remember"
        ? "low"
        : cp === "understand"
        ? "medium"
        : cp === "apply"
        ? "medium"
        : "high";

    return {
      id: `slot_${i + 1}`,
      questionType,
      cognitiveDemand: cp,
      difficulty: difficultyModifier === "low" ? "easy" :
                  difficultyModifier === "medium" ? "medium" : "hard",
      pacing: "normal",
      requiresImage: questionType === "image",
      media: questionType === "image"
        ? { type: "image", url: undefined, alt: undefined }
        : undefined
    };
  });

  //
  // 4. Cognitive distribution (unchanged)
  //

  const cognitiveDistribution: BlueprintPlanV3_2["cognitiveDistribution"] = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0
  };

  for (const slot of slots) {
    cognitiveDistribution[slot.cognitiveDemand as CognitiveProcess] += 1 / questionCount;
  }

  //
  // 5. Validation contract (unchanged)
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

  const scopeWidth: BlueprintPlanV3_2["scopeWidth"] =
    architectUAR.assessmentType === "test" || architectUAR.assessmentType === "testReview"
      ? "broad"
      : architectUAR.assessmentType === "quiz"
      ? "focused"
      : "narrow";

  //
  // 6. Assemble deterministic plan
  //

  const deterministicPlan: BlueprintPlanV3_2 = {
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
  // 7. LLM refinement step
  //

  const architectPrompt = buildArchitectPrompt(architectUAR, deterministicPlan);

  const llmRaw = await callGemini({
    model: "gemini-2.5-flash",
    prompt: architectPrompt,
    temperature: 0.2,
    maxOutputTokens: 4096
  });




  let llmPlan: Partial<BlueprintPlanV3_2>;
  try {
    // Strip markdown code fences if present (LLMs often wrap JSON in ```json ... ```)
    const cleaned = llmRaw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    llmPlan = JSON.parse(cleaned);
  } catch {
    // If the LLM returns invalid JSON, fall back to deterministic plan
    console.warn("[Architect] LLM returned invalid JSON, using deterministic plan");
    llmPlan = {};
  }

  //
  // 8. Merge deterministic plan + LLM refinements
  //

  const finalPlan: BlueprintPlanV3_2 = {
    ...deterministicPlan,
    ...llmPlan
  };

  //
  // 9. Constraints + writerPrompt + Blueprint
  //

  const firstSlot = finalPlan.slots?.[0];
  const writerPrompt = firstSlot
    ? buildWriterPrompt(finalPlan as any, firstSlot)
    : `Write a ${architectUAR.assessmentType} assessment on ${architectUAR.topic} for ${architectUAR.grade} ${architectUAR.domain}.`;

  return { uar, writerPrompt, plan: finalPlan, constraints: { mustAlignToTopic: true, avoidTrickQuestions: true, avoidSensitiveContent: true, respectTimeLimit: true } };
}
