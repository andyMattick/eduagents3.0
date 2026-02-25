import type { BlueprintPlanV3_2 } from "@/pipeline/contracts/BlueprintPlanV3_2";
import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { GeneratedItem } from "./types";
import { buildWriterPrompt } from "./writerPrompt";
import { callGemini } from "@/pipeline/llm/gemini";

export async function runWriter({
  blueprint,
  uar,
  scribePrescriptions,
  agentId: _agentId,
  compensation: _compensation
}: {
  blueprint: BlueprintPlanV3_2;
  uar: UnifiedAssessmentRequest;
  scribePrescriptions: {
    weaknesses: string[];
    requiredBehaviors: string[];
    forbiddenBehaviors: string[];
  };
  agentId: string;
  compensation: any;
}): Promise<GeneratedItem[]> {
  const items: GeneratedItem[] = [];

  for (const slot of blueprint.slots) {

    // ⭐ Build WriterContext
    const context = {
      domain: uar.course ?? "unknown",
      topic: uar.topic ?? "unknown",
      grade: uar.gradeLevels?.[0] ?? "unknown",
      unitName: uar.unitName ?? "",
      lessonName: uar.lessonName ?? "",
      additionalDetails: uar.additionalDetails ?? null,
      focusAreas: (uar as any).focusAreas ?? null,
      misconceptions: (uar as any).misconceptions ?? null,
      avoidList: (uar as any).avoidList ?? null,
      scopeWidth: blueprint.scopeWidth,
      previousSlotsSummary: blueprint.slots
        .filter(s => s.id !== slot.id)
        .map(s => ({
          id: s.id,
          questionType: s.questionType as string,
          cognitiveDemand: s.cognitiveDemand ?? "understand",
          difficulty: s.difficulty ?? "medium",
          topicAngle: undefined
        }))
    };


    // ⭐ Build the new Writer v3.6 prompt
    const prompt = buildWriterPrompt(
      blueprint,
      slot,
      context,
      scribePrescriptions
    );

    // ⭐ Call the real LLM directly
    const raw = await callGemini({
      model: "gemini-2.5-flash",
      prompt,
      temperature: 0.2,
      maxOutputTokens: 4096,
    });

    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: GeneratedItem;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new Error(
        `Writer returned invalid JSON for slot ${slot.id}: ${cleaned}`
      );
    }

    // Enforce slot binding
    parsed.slotId = slot.id;
    parsed.questionType = slot.questionType;

    items.push(parsed);
  }

  return items;
}
