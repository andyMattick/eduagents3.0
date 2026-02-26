import type { GeneratedItem } from "@/pipeline/agents/writer/types";
import type { FinalAssessment, FinalAssessmentItem } from "./FinalAssessment";

type BuilderInput =
  | GeneratedItem[]
  | { items: GeneratedItem[]; blueprint?: any };

function normalise(input: BuilderInput): { items: GeneratedItem[]; blueprint?: any } {
  if (Array.isArray(input)) return { items: input };
  return input;
}

function generateId(): string {
  return `assessment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runBuilder(input: BuilderInput): Promise<FinalAssessment> {
  const { items, blueprint } = normalise(input);

  const plan = blueprint?.plan ?? blueprint ?? null;

  const finalItems: FinalAssessmentItem[] = items.map((item, i) => {
    // Find matching slot for enriched metadata
    const slot = plan?.slots?.find((s: any) => s.id === item.slotId);

    return {
      questionNumber: i + 1,
      slotId: item.slotId,
      questionType: item.questionType,
      prompt: item.prompt,
      options: item.options,
      answer: item.answer,
      cognitiveDemand: slot?.cognitiveDemand ?? item.metadata?.cognitiveDemand,
      difficulty: slot?.difficulty ?? item.metadata?.difficulty,
      metadata: item.metadata,
    };
  });

  // Answer key: slotId → answer
  const answerKey: Record<string, string> = {};
  for (const item of finalItems) {
    if (item.answer !== undefined) {
      answerKey[item.slotId] = item.answer;
    }
  }

  // Cognitive distribution tally
  const cognitiveDistribution: Record<string, number> = {};
  for (const item of finalItems) {
    const level = item.cognitiveDemand ?? "unknown";
    cognitiveDistribution[level] = (cognitiveDistribution[level] ?? 0) + 1;
  }

  return {
    id: generateId(),
    generatedAt: new Date().toISOString(),
    items: finalItems,
    totalItems: finalItems.length,
    answerKey,
    cognitiveDistribution,
    metadata: {
      difficultyProfile: plan?.difficultyProfile,
      orderingStrategy: plan?.orderingStrategy,
      totalEstimatedTimeSeconds: plan?.totalEstimatedTimeSeconds,
      pacingSecondsPerItem: plan?.pacingSecondsPerItem,
    },
  };
}
