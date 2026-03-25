import type { TemplateOutput, WriterTemplateSlot } from "../types";

export function generateContent(slot: WriterTemplateSlot): TemplateOutput {
  const domain = String(slot.domain ?? "general").toLowerCase();
  const topic = String(slot.topic ?? "the topic");
  const micro = String(slot.sharedContext ?? "a focused detail");

  return {
    prompt: `Write an explanatory content block that teaches the concept shown in ${micro} within ${topic}.`,
    answer: null,
    metadata: {
      generationMethod: "template",
      templateId: "content-" + domain,
      questionType: "content"
    }
  };
}
