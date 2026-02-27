import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { buildArchitectUAR } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { Blueprint } from "@/pipeline/contracts/Blueprint";
import { buildArchitectPrompt } from "./architectPrompt";
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

  // ── Weighted pacing model ─────────────────────────────────────────────────
  // Instead of a flat seconds-per-item, we estimate time per slot based on:
  //   question type × cognitive demand × grade-level adjustment
  //
  // Base seconds by question type:
  const PACING_BASE: Record<string, number> = {
    multipleChoice: 60,
    trueFalse: 30,
    shortAnswer: 150,
    constructedResponse: 240,
    fillInTheBlank: 75,
    matching: 75,
    ordering: 90,
    image: 60,
  };

  // Cognitive-demand multiplier (higher Bloom → more time)
  const BLOOM_MULTIPLIER: Record<string, number> = {
    remember: 1.0,
    understand: 1.15,
    apply: 1.3,
    analyze: 1.5,
    evaluate: 1.7,
    create: 2.0,
  };

  // Grade-level adjustment: younger students need more time per cognitive unit
  const gradeNum = parseInt(architectUAR.grade, 10);
  const gradeMultiplier =
    !isNaN(gradeNum) && gradeNum <= 3 ? 1.6 :
    !isNaN(gradeNum) && gradeNum <= 5 ? 1.35 :
    !isNaN(gradeNum) && gradeNum <= 8 ? 1.15 :
    1.0; // high school baseline

  // Assessment-type speed factor (bellRingers/exitTickets are faster-paced)
  const assessmentSpeedFactor =
    architectUAR.assessmentType === "bellRinger" || architectUAR.assessmentType === "exitTicket"
      ? 0.6
      : architectUAR.assessmentType === "quiz"
      ? 0.8
      : 1.0;

  /** Estimate realistic seconds for a single slot */
  function estimateSlotSeconds(qType: string, cognitiveDemand: string): number {
    const base = PACING_BASE[qType] ?? 60;
    const bloom = BLOOM_MULTIPLIER[cognitiveDemand] ?? 1.0;
    return Math.round(base * bloom * gradeMultiplier * assessmentSpeedFactor);
  }

  // For the initial question-count inference we use a weighted average
  // across the teacher's requested question types.
  const requestedTypes = architectUAR.questionTypes?.length
    ? architectUAR.questionTypes
    : ["multipleChoice", "shortAnswer"];
  const avgBaseSeconds =
    requestedTypes.reduce((sum, t) => sum + (PACING_BASE[t] ?? 60), 0) / requestedTypes.length;
  const avgPacingSeconds = Math.round(avgBaseSeconds * 1.2 * gradeMultiplier * assessmentSpeedFactor);

  // Legacy flat value kept on the plan for backward compatibility (used by Gatekeeper)
  const pacingSecondsPerItem = avgPacingSeconds;

  const totalEstimatedTimeSeconds = architectUAR.timeMinutes * 60;

  const questionCount = Math.max(
    1,
    architectUAR.questionCount ?? Math.floor(totalEstimatedTimeSeconds / avgPacingSeconds)
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

  // Depth cap: assessments under 25 minutes should not demand deep Bloom levels.
  // Replace any "analyze" or "evaluate" entries with "apply" to keep the workload
  // realistic for shorter tests where students won't have time to reason deeply.
  const timeMinutes: number = architectUAR.timeMinutes ?? 40;
  if (timeMinutes < 25) {
    for (let i = 0; i < cps.length; i++) {
      if (cps[i] === "analyze" || cps[i] === "evaluate") {
        cps[i] = "apply";
      }
    }
  }

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
  // 9. Grade-text plausibility check
  //
  // Flag when canonical complex literature or mature content is paired
  // with a primary or elementary grade level. This is informational — it
  // never blocks the run, but surfaces a warning for the teacher.
  //

  const COMPLEX_TEXTS = [
    "frankenstein", "1984", "lord of the flies", "macbeth", "hamlet",
    "romeo and juliet", "the great gatsby", "to kill a mockingbird",
    "animal farm", "brave new world", "the crucible", "the odyssey",
    "the iliad", "beowulf", "heart of darkness", "crime and punishment",
    "war and peace", "les misérables", "moby dick", "dracula",
    "of mice and men", "the scarlet letter", "fahrenheit 451",
    "a tale of two cities", "jane eyre", "wuthering heights",
    "pride and prejudice", "the catcher in the rye", "slaughterhouse-five",
    "beloved", "invisible man", "their eyes were watching god",
    "the handmaid's tale", "things fall apart", "an inspector calls"
  ];

  const warnings: string[] = [];

  if (!isNaN(gradeNum) && gradeNum <= 6) {
    const searchText = [
      architectUAR.unitName ?? "",
      architectUAR.lessonName ?? "",
      architectUAR.topic ?? ""
    ].join(" ").toLowerCase();

    const matchedText = COMPLEX_TEXTS.find(t => searchText.includes(t));
    if (matchedText) {
      warnings.push(
        `Grade–text plausibility: "${matchedText}" is typically studied at the secondary level. ` +
        `This assessment targets grade ${gradeNum}. The literary work may exceed typical reading ` +
        `level and content appropriateness for this age group. Confirm intent?`
      );
    }
  }

  //
  // 10. Realistic time check using weighted pacing
  //
  // Now that we have final slots, compute the realistic total time using
  // per-slot weighted estimates.
  //

  const realisticTotalSeconds = (finalPlan.slots ?? slots).reduce(
    (sum: number, slot: any) => sum + estimateSlotSeconds(slot.questionType, slot.cognitiveDemand),
    0
  );
  const realisticTotalMinutes = Math.round(realisticTotalSeconds / 60);

  if (realisticTotalMinutes > architectUAR.timeMinutes * 1.2) {
    warnings.push(
      `Time realism: weighted pacing estimates ~${realisticTotalMinutes} min for a ` +
      `${architectUAR.timeMinutes}-min window. The assessment may exceed the time limit ` +
      `for this grade level (grade ${architectUAR.grade}). Consider reducing question count ` +
      `or lowering cognitive demand on constructed-response items.`
    );
  }

  //
  // 11. Constraints + writerPrompt + Blueprint
  //

  return {
    uar,
    writerPrompt: "",
    plan: {
      ...finalPlan,
      realisticTotalSeconds,
      realisticTotalMinutes,
    },
    constraints: {
      mustAlignToTopic: true,
      avoidTrickQuestions: true,
      avoidSensitiveContent: true,
      respectTimeLimit: true
    },
    warnings,
  };
}
