import type { ProblemPlugin, ProblemSlot, GenerationContext } from "./interfaces/problemPlugin";
import type { SystemTemplate } from "../../schema/templates/problemTypes/templateCarrier";

function normalizeQuestionType(slot: ProblemSlot, template: SystemTemplate): string {
  const slotQuestionType = (slot as ProblemSlot & { questionType?: string }).questionType;
  const rawType = String(slotQuestionType ?? slot.problem_type ?? template.itemType ?? "shortAnswer");
  const normalized = rawType.trim().toLowerCase();

  if (normalized === "multiplechoice" || normalized === "multiple_choice" || normalized === "mcq") {
    return "multipleChoice";
  }

  if (normalized === "constructedresponse" || normalized === "constructed_response") {
    return "constructedResponse";
  }

  if (normalized === "shortanswer" || normalized === "short_answer" || normalized === "explanation") {
    return "shortAnswer";
  }

  if (normalized === "passagebased" || normalized === "passage_based") {
    return "passageBased";
  }

  if (normalized === "arithmeticfluency" || normalized === "arithmetic_fluency") {
    return "arithmeticFluency";
  }

  return rawType;
}

function buildPrompt(template: SystemTemplate, context: GenerationContext): string {
  const subject = template.subject || context.course || "the course topic";
  const topic = context.topic || subject;
  const focus = Object.entries(template.configurableFields ?? {})
    .flatMap(([, value]) => Array.isArray(value) ? value.slice(0, 1) : [value])
    .filter((value): value is string | number | boolean => value !== undefined && value !== null)
    .map((value) => String(value).trim())
    .find(Boolean);

  const contextText = template.sharedContext && template.sharedContext !== "none"
    ? `using ${template.sharedContext.replace(/_/g, " ")}`
    : "with clear supporting details";
  const focusText = focus ? ` Focus on ${focus.replace(/_/g, " ")}.` : "";

  return `In ${subject}, ask students to ${template.cognitiveIntent} ${topic} ${contextText}.${focusText}`.replace(/\s+/g, " ").trim();
}

function buildAnswer(template: SystemTemplate): string {
  return `A strong response should ${template.cognitiveIntent} and use accurate ${template.subject.toLowerCase()} evidence.`;
}

export function wrapSchemaTemplate(template: SystemTemplate): ProblemPlugin {
  return {
    id: template.id,
    generationType: "template",
    supportedTopics: [template.subject.toLowerCase(), template.label.toLowerCase()],
    async generate(slot: ProblemSlot, context: GenerationContext) {
      const previewItem = template.previewItems.find(
        (item): item is { prompt: string; answer: string } =>
          typeof (item as { prompt?: unknown }).prompt === "string" &&
          typeof (item as { answer?: unknown }).answer === "string"
      );
      const prompt = previewItem?.prompt ?? buildPrompt(template, context);
      const answer = previewItem?.answer ?? buildAnswer(template);

      return {
        slot_id: slot.slot_id,
        slotId: slot.slot_id,
        questionType: normalizeQuestionType(slot, template),
        prompt,
        answer,
        metadata: {
          generationMethod: "template",
          templateId: template.id,
          diagramType: null,
          imageReferenceId: null,
          difficulty: slot.difficulty ?? "medium",
          cognitiveDemand: (slot as ProblemSlot & { cognitiveDemand?: string }).cognitiveDemand ?? slot.cognitive_demand ?? template.cognitiveIntent,
          topicAngle: (slot as ProblemSlot & { topicAngle?: string }).topicAngle ?? null,
          pacingSeconds: slot.pacing_seconds ?? null,
          slotId: slot.slot_id,
          questionType: normalizeQuestionType(slot, template),
          sectionId: null,
          passageId: null,
        },
      };
    },
  };
}