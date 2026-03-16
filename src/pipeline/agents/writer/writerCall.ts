import { loadTemplate } from "./templates/registry";
import { ensureMetadata, type WriterSlot } from "./types";
import { buildWriterPrompt } from "./writerPrompt";

export async function writerCall(slot: WriterSlot, model: any) {
  let prompt: string;
  let metadata: Record<string, unknown> = {};

  if (slot.generationMethod === "template") {
    const template = loadTemplate(slot);
    prompt = template.prompt;
    metadata = template.metadata ?? {};
  } else {
    prompt = buildWriterPrompt(slot);
  }

  const llmResponse = await model.generate(prompt);

  return {
    slotId: slot.slotId,
    questionType: slot.questionType,
    prompt,
    answer: llmResponse?.answer ?? "",
    options: llmResponse?.options ?? null,
    rationale: llmResponse?.rationale ?? null,
    metadata: ensureMetadata({ metadata }, slot),
  };
}
