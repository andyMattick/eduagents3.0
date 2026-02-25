import { BlueprintPlanV3_2 } from "@/types/Blueprint";
import { GeneratedItem } from "./types";
import { buildWriterPrompt } from "./writerPrompt";
import { callGemini } from "@/pipeline/llm/gemini";

export async function runWriter({
  blueprint,
  agentId: _agentId,
  compensation: _compensation
}: {
  blueprint: BlueprintPlanV3_2;
  agentId: string;
  compensation: any;
}): Promise<GeneratedItem[]> {
  const items: GeneratedItem[] = [];

  for (const slot of blueprint.slots) {
    const prompt = buildWriterPrompt(blueprint, slot);

    // ⭐ Call the real LLM directly — no runAgent inside Writer
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
