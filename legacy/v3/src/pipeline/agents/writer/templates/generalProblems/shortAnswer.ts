import type { TemplateOutput, WriterTemplateSlot } from "../types";

export function generateShortAnswer(slot: WriterTemplateSlot): TemplateOutput {
  const domain = String(slot.domain ?? "general").toLowerCase();
  const taskType = String(slot.metadata?.taskType ?? "explain");
  const topic = String(slot.topic ?? "the topic");
  const micro = String(slot.sharedContext ?? "a focused detail");

  return {
    prompt: `Write a ${domain} short-answer question using the reasoning move ${taskType}, requiring students to explain ${micro} in the context of ${topic}.`,
    answer: null,
    metadata: {
      generationMethod: "template",
      templateId: "sa-" + domain,
      questionType: "short_answer"
    }
  };
}
