import type { TemplateOutput, WriterTemplateSlot } from "../types";

export function generateMultiSelect(slot: WriterTemplateSlot): TemplateOutput {
  const domain = String(slot.domain ?? "general").toLowerCase();
  const taskType = String(slot.metadata?.taskType ?? "analyze");
  const topic = String(slot.topic ?? "the topic");
  const micro = String(slot.sharedContext ?? "a focused detail");

  return {
    prompt: `Write a ${domain} multi-select question with multiple correct answers about ${micro} in ${topic}, aligned to the reasoning move ${taskType}.`,
    answer: null,
    options: null,
    metadata: {
      generationMethod: "template",
      templateId: "ms-" + domain,
      questionType: "multi_select"
    }
  };
}
