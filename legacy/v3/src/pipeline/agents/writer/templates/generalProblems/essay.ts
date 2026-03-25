import type { TemplateOutput, WriterTemplateSlot } from "../types";

export function generateEssay(slot: WriterTemplateSlot): TemplateOutput {
  const domain = String(slot.domain ?? "general").toLowerCase();
  const taskType = String(slot.metadata?.taskType ?? "analyze");
  const topic = String(slot.topic ?? "the topic");
  const micro = String(slot.sharedContext ?? "a focused detail");

  return {
    prompt: `Write an essay prompt requiring students to analyze ${micro} within ${topic}, using the reasoning move: ${taskType}.`,
    answer: null,
    metadata: {
      generationMethod: "template",
      templateId: "essay-" + domain,
      questionType: "essay"
    }
  };
}
