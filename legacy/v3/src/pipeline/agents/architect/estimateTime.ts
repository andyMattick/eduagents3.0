import type { BlueprintSlot } from "@/types/Blueprint";

export function estimateGenerationTime(slots: BlueprintSlot[], domain: string): number {
  const subjectPenalty = {
    ela: 0.4,
    history: 0.5,
    socialstudies: 0.4,
    civics: 0.4,
    government: 0.4,
    science: 0.3,
    math: 0.1,
    stem: 0.2,
    general: 0.2,
  }[domain.toLowerCase()] ?? 0.2;

  const cognitiveWeights: Record<string, number> = {
    remember: 0.3,
    understand: 0.5,
    apply: 0.7,
    analyze: 1.0,
    evaluate: 1.2,
    create: 1.2,
  };

  const typeWeights: Record<string, number> = {
    mcq: 1.0,
    multipleChoice: 1.0,
    short_answer: 0.8,
    multi_select: 1.1,
    essay: 1.4,
    passageBased: 2.0,
    content: 0.6,
  };

  const fallbackRisk = (slot: BlueprintSlot): number => {
    if ((slot as { templateId?: string | null }).templateId) return 0.2;
    const normalizedType = normalizeQuestionType(slot.questionType);
    if (normalizedType === "passageBased") return 0.8;
    if (normalizedType === "essay") return 0.7;
    if (normalizedType === "multi_select") return 0.5;
    return 0.6;
  };

  const topicSurface = (slot: BlueprintSlot): number => {
    const shapedSlot = slot as BlueprintSlot & {
      sharedContext?: string | null;
      topic?: string | null;
      topicAngle?: string | null;
    };

    if (shapedSlot.sharedContext) return 0.2; // microTopic
    if (shapedSlot.topic || shapedSlot.topicAngle) return 0.5; // narrowedTopic / slot angle
    return 1.0;                             // broad topic
  };

  let total = 0;

  for (const slot of slots) {
    const cog = cognitiveWeights[slot.cognitiveDemand ?? "understand"] ?? 0.5;
    const qType = typeWeights[normalizeQuestionType(slot.questionType)] ?? 1.0;
    const surface = topicSurface(slot);
    const risk = fallbackRisk(slot);

    const slotTime =
      4 * (surface + subjectPenalty + cog * qType) * (1 + risk);

    total += slotTime;
  }

  const parallelFactor = 5;
  const parallelPenalty = 1.1;

  return Math.round((total / parallelFactor) * parallelPenalty);
}

function normalizeQuestionType(questionType: string): string {
  if (questionType === "multipleChoice") return "multipleChoice";
  if (questionType === "mcq") return "mcq";
  if (questionType === "shortAnswer") return "short_answer";
  if (questionType === "multiSelect") return "multi_select";
  return questionType;
}
