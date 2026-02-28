import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { buildArchitectUAR } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { Blueprint } from "@/pipeline/contracts/Blueprint";
import { buildArchitectPrompt } from "./architectPrompt";
import { callGemini } from "@/pipeline/llm/gemini";
import { runConstraintEngine } from "./constraintEngine";
import { resolveRigorProfile } from "./rigorProfile";
import { adjustPlanForTime, TIME_TOLERANCE_MINUTES } from "./adjustPlanForTime";
import { allocateBloomCounts } from "./allocateBloomCounts";

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
  // 0b. Constraint engine — classify, arbitrate, and translate teacher notes
  //
  // We run this early so that derived structural knobs (bloomBoost, preferMC, etc.)
  // can influence every downstream planning step.
  //
  const constraintSource = [
    architectUAR.additionalDetails ?? "",
    architectUAR.topic ?? "",
  ].join(" ");

  // We don't yet know the deterministic ceiling — seed with a conservative default
  // that will be updated after the Bloom distribution is computed below.
  const constraintEngineResult = runConstraintEngine(constraintSource, "understand");
  const { classifiedConstraints, resolvedConstraints, derivedStructuralConstraints } =
    constraintEngineResult;

  if (classifiedConstraints.length > 0) {
    console.info(
      `[Architect] Constraint engine: ${classifiedConstraints.length} classified, ` +
      `${resolvedConstraints.filter(c => c.resolved === false).length} dropped, ` +
      `${resolvedConstraints.filter(c => c.resolved === "softened").length} softened`
    );
  }

  //
  // 0c. Rigor profile — resolve canonical depth band from studentLevel + time + constraints
  //
  // This replaces the ad-hoc time-cap heuristic below with a principled,
  // studentLevel-aware depth band.  The resulting depthFloor / depthCeiling
  // are used to gate every Bloom assignment in the cps[] array.
  //
  const rigorProfile = resolveRigorProfile({
    studentLevel: architectUAR.studentLevel,
    assessmentType: architectUAR.assessmentType,
    timeMinutes: architectUAR.timeMinutes,
    derivedStructuralConstraints: {
      raiseBloomCeiling: derivedStructuralConstraints.raiseBloomCeiling,
      capBloomAt: derivedStructuralConstraints.capBloomAt,
    },
  });

  console.info(
    `[Architect] Rigor profile: ${rigorProfile.depthFloor} → ${rigorProfile.depthCeiling}`,
    `| trace: ${rigorProfile.trace.join(" | ")}`
  );

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

  // Use largest-remainder (Hamilton) method — counts sum exactly to questionCount,
  // no Math.round drift, no silent pad/trim.
  const lockedBloomCounts = allocateBloomCounts(baseDistribution, questionCount);
  const cps: CognitiveProcess[] = [];
  for (const cp of cpOrder) {
    for (let i = 0; i < lockedBloomCounts[cp]; i++) cps.push(cp);
  }
  // No while-pad or length-trim — allocateBloomCounts guarantees exact count.

  // Depth band enforcement via rigorProfile.
  // Replace any cps[] entry that exceeds depthCeiling with depthCeiling,
  // and any that falls below depthFloor with depthFloor.
  // This replaces the previous ad-hoc < 25-min heuristic.
  const BLOOM_ORDER_ALL = ["remember", "understand", "apply", "analyze", "evaluate"] as const;
  const rpFloorIdx   = BLOOM_ORDER_ALL.indexOf(rigorProfile.depthFloor  as typeof BLOOM_ORDER_ALL[number]);
  const rpCeilingIdx = BLOOM_ORDER_ALL.indexOf(rigorProfile.depthCeiling as typeof BLOOM_ORDER_ALL[number]);

  for (let i = 0; i < cps.length; i++) {
    const cpIdx = BLOOM_ORDER_ALL.indexOf(cps[i] as typeof BLOOM_ORDER_ALL[number]);
    if (cpIdx > rpCeilingIdx) cps[i] = rigorProfile.depthCeiling as CognitiveProcess;
    if (cpIdx < rpFloorIdx)   cps[i] = rigorProfile.depthFloor   as CognitiveProcess;
  }

  //
  // 2b. Apply derived structural constraints from the constraint engine
  //
  // bloomBoost: shift distribution fractions toward targeted Bloom levels.
  if (derivedStructuralConstraints.bloomBoost) {
    const boost = derivedStructuralConstraints.bloomBoost;
    for (const cp of cpOrder) {
      const delta = boost[cp] ?? 0;
      if (delta === 0) continue;
      const extra = Math.round(delta * questionCount);
      if (extra > 0) {
        for (let k = 0; k < extra; k++) cps.push(cp);
      } else {
        // Remove |extra| entries of the lowest-priority target
        let removed = 0;
        for (let k = cps.length - 1; k >= 0 && removed < Math.abs(extra); k--) {
          if (cps[k] === cp) {
            cps.splice(k, 1);
            removed++;
          }
        }
      }
    }
  }

  // Inject extra analyze/apply slots requested by "more rigorous" translation
  if (derivedStructuralConstraints.addAnalyzeSlots) {
    for (let k = 0; k < derivedStructuralConstraints.addAnalyzeSlots; k++) {
      cps.push("analyze");
    }
  }
  if (derivedStructuralConstraints.addApplySlots) {
    for (let k = 0; k < derivedStructuralConstraints.addApplySlots; k++) {
      cps.push("apply");
    }
  }

  // capBloomAt: secondary hard ceiling (already baked into rigorProfile, but
  // apply again here in case bloomBoost injections pushed cps above the cap)
  const effectiveCap = derivedStructuralConstraints.capBloomAt ?? rigorProfile.depthCeiling;
  {
    const capIdx = BLOOM_ORDER_ALL.indexOf(effectiveCap as typeof BLOOM_ORDER_ALL[number]);
    for (let i = 0; i < cps.length; i++) {
      const idx = BLOOM_ORDER_ALL.indexOf(cps[i] as typeof BLOOM_ORDER_ALL[number]);
      if (idx > capIdx) cps[i] = effectiveCap as CognitiveProcess;
    }
  }

  // Trim back to questionCount (additions may have pushed us over)
  if (cps.length > questionCount) cps.length = questionCount;

  // depthFloor / depthCeiling come from rigorProfile (authoritative)
  const depthFloor: CognitiveProcess   = rigorProfile.depthFloor   as CognitiveProcess;
  let   depthCeiling: CognitiveProcess = rigorProfile.depthCeiling as CognitiveProcess;

  //
  // 3. Build extensible slots
  //

  // Adjust available question types based on grading-efficiency constraints.
  let effectiveTeacherTypes = [...architectUAR.questionTypes];

  if (derivedStructuralConstraints.preferMultipleChoice) {
    // Ensure multipleChoice is first (dominant) type; bump weight by prepending it twice
    effectiveTeacherTypes = [
      "multipleChoice",
      "multipleChoice",
      ...effectiveTeacherTypes.filter(t => t !== "multipleChoice"),
    ];
  }

  if (derivedStructuralConstraints.reduceConstructedResponse) {
    effectiveTeacherTypes = effectiveTeacherTypes.filter(t => t !== "constructedResponse");
    if (effectiveTeacherTypes.length === 0) effectiveTeacherTypes = ["multipleChoice"];
  }

  if (derivedStructuralConstraints.reduceShortAnswer) {
    effectiveTeacherTypes = effectiveTeacherTypes.filter(t => t !== "shortAnswer");
    if (effectiveTeacherTypes.length === 0) effectiveTeacherTypes = ["multipleChoice"];
  }

  const teacherTypes = effectiveTeacherTypes;

  // Slot count assertion — must equal questionCount before any time adjustment
  if (cps.length !== questionCount) {
    throw new Error(
      `[Architect] Slot count mismatch after cps[] build. Expected ${questionCount} got ${cps.length}`
    );
  }

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

  const architectPrompt = buildArchitectPrompt(
    architectUAR,
    deterministicPlan,
    resolvedConstraints,
    derivedStructuralConstraints
  );

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
  // per-slot weighted estimates.  Then enforce the teacher's time window
  // as a hard constraint via adjustPlanForTime.
  //

  const rawRealisticTotalSeconds = (finalPlan.slots ?? slots).reduce(
    (sum: number, slot: any) => sum + estimateSlotSeconds(slot.questionType, slot.cognitiveDemand),
    0
  );
  const rawRealisticTotalMinutes = Math.round(rawRealisticTotalSeconds / 60);

  // ── Hard time enforcement ────────────────────────────────────────────────────
  // If the estimate already fits, `adjustPlanForTime` returns immediately.
  const timeAdjResult = adjustPlanForTime(
    finalPlan.slots ?? slots,
    rawRealisticTotalMinutes,
    architectUAR.timeMinutes,
    depthFloor,
    depthCeiling,
    estimateSlotSeconds
  );

  // Propagate all mutations back into finalPlan
  const adjustedSlots          = timeAdjResult.slots;
  const realisticTotalSeconds  = timeAdjResult.realisticTotalSeconds;
  const realisticTotalMinutes  = timeAdjResult.realisticTotalMinutes;
  const adjustedDepthCeiling   = timeAdjResult.effectiveDepthCeiling;

  if (timeAdjResult.adjustments.length > 0) {
    console.info(
      `[Architect] Time enforcement triggered (initial ~${rawRealisticTotalMinutes} min, ` +
      `limit ${architectUAR.timeMinutes} min +${TIME_TOLERANCE_MINUTES} tolerance):`
    );
    for (const adj of timeAdjResult.adjustments) {
      console.info(`  └ ${adj}`);
    }
  }

  // Rebuild cognitive distribution from adjusted slots
  const adjustedCognitiveDist: BlueprintPlanV3_2["cognitiveDistribution"] = {
    remember: 0, understand: 0, apply: 0, analyze: 0, evaluate: 0,
  };
  for (const slot of adjustedSlots) {
    const cp = (slot.cognitiveDemand ?? "understand") as CognitiveProcess;
    if (cp in adjustedCognitiveDist) {
      adjustedCognitiveDist[cp] += 1 / adjustedSlots.length;
    }
  }

  // Post-adjustment slot count assertion — must have at least 1 slot and
  // must not exceed the originally requested questionCount.
  const adjustedQuestionCount = adjustedSlots.length;
  if (adjustedQuestionCount < 1) {
    throw new Error(
      `[Architect] Post-time-adjustment produced 0 slots for a ${architectUAR.timeMinutes}-min window.`
    );
  }
  if (adjustedQuestionCount > questionCount) {
    throw new Error(
      `[Architect] Post-time-adjustment slot count ${adjustedQuestionCount} exceeds ` +
      `original questionCount ${questionCount} — adjustPlanForTime must only reduce.`
    );
  }

  // Update the plan in-place with time-adjusted values
  (finalPlan as any).slots              = adjustedSlots;
  (finalPlan as any).questionCount      = adjustedQuestionCount;
  (finalPlan as any).depthCeiling       = adjustedDepthCeiling;
  (finalPlan as any).cognitiveDistribution = adjustedCognitiveDist;

  //
  // 11. Constraints + writerPrompt + Blueprint
  //

  // Emit a warning if any constraints were dropped during conflict resolution
  const droppedConstraints = resolvedConstraints.filter(c => c.resolved === false);
  for (const dropped of droppedConstraints) {
    warnings.push(
      `Constraint dropped: "${dropped.sourceText}" (${dropped.type}, priority ${dropped.priority}) — ` +
      (dropped.resolutionNote ?? "overridden by higher-priority constraint")
    );
  }

  // Surface time-adjustment actions as informational warnings so the teacher
  // can see exactly what was changed to fit their time window.
  for (const adj of timeAdjResult.adjustments) {
    warnings.push(`Time adjustment: ${adj}`);
  }

  // If Phase 3 dropped questions the teacher requested, add a clear note.
  if (!timeAdjResult.withinBudget) {
    warnings.push(
      `Time warning: even after all adjustments, the assessment estimates ` +
      `~${realisticTotalMinutes} min for a ${architectUAR.timeMinutes}-min window. ` +
      `Consider reducing question count manually.`
    );
  }

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
      avoidTrickQuestions:
        !resolvedConstraints.some(
          c => c.resolved !== false && /trick question/i.test(c.sourceText)
        ),
      avoidSensitiveContent:
        resolvedConstraints.some(
          c => c.resolved !== false && c.type === "safety"
        ) || true,
      respectTimeLimit:
        resolvedConstraints.some(
          c => c.resolved !== false && c.type === "time"
        ) || true,
    },
    classifiedConstraints,
    resolvedConstraints,
    derivedStructuralConstraints,
    warnings,
  };
}
