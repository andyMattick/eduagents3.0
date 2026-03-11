/**
 * llmDefaultPlugin.ts — LLM fallback plugin for the Plugin-Based Instruction Engine.
 *
 * Used when no template, diagram, or image plugin matches the slot.
 * Delegates to the existing Writer LLM infrastructure via callGemini.
 *
 * Cross-phase invariant: LLM is one plugin, not the system.
 */

import type {
  ProblemPlugin,
  ProblemSlot,
  GenerationContext,
  GeneratedProblem,
  TemplateGeneratedProblem,
} from "../../interfaces/problemPlugin";
import { registerPlugin } from "../pluginRegistry";
import { callGemini } from "@/pipeline/llm/gemini";

export const LLMDefaultPlugin: ProblemPlugin = {
  id: "llm_default",
  generationType: "llm",
  supportedTopics: [], // universal — handles any topic

  async generate(slot: ProblemSlot, context: GenerationContext): Promise<TemplateGeneratedProblem> {
    const prompt = buildLLMPrompt(slot, context);

    const response = await callGemini({
      model: "gemini-2.0-flash",
      prompt,
      temperature: 0.4,
    });

    try {
      const parsed = JSON.parse(response);
      return {
        slot_id: slot.slot_id,
        prompt: parsed.prompt ?? parsed.question ?? "",
        answer: parsed.answer ?? "",
        //concepts: parsed.concepts ?? [],
        //skills: parsed.skills ?? [],
        //standards: parsed.standards ?? [],
        metadata: {
          generation_method: "llm",
          plugin_id: "llm_default",
          difficulty: slot.difficulty,
          raw_response: response.substring(0, 500),
        },
      };
    } catch {
      // If LLM response is not valid JSON, wrap as best-effort
      return {
        slot_id: slot.slot_id,
        prompt: response.trim(),
        answer: "",
        //concepts: [],
        //skills: [],
       // standards: [],
        metadata: {
          generation_method: "llm",
          plugin_id: "llm_default",
          parse_error: true,
          slot_id: slot.slot_id,
        },
      };
    }
  },
};

function buildLLMPrompt(slot: ProblemSlot, context: GenerationContext): string {
  return `You are generating a single assessment problem.

Context:
- Grade: ${context.gradeLevels?.join(", ") ?? "unspecified"}
- Course: ${context.course ?? "unspecified"}
- Topic: ${slot.topic}
${slot.subtopic ? `- Subtopic: ${slot.subtopic}` : ""}
- Difficulty: ${slot.difficulty}
- Problem type: ${slot.problem_type}
${slot.question_format ? `- Format: ${slot.question_format}` : ""}
${slot.cognitive_demand ? `- Cognitive demand: ${slot.cognitive_demand}` : ""}
${context.additionalDetails ? `- Teacher notes: ${context.additionalDetails}` : ""}
${context.documentSummary ? `- Key concepts from source: ${context.documentSummary.concepts.join(", ")}` : ""}

Return strict JSON:
{
  "prompt": "the question text",
  "answer": "the correct answer",
  "concepts": ["concept1", "concept2"],
  "skills": ["skill1"],
  "standards": ["standard1"]
}

Generate exactly one problem. Do not include commentary.`;
}

// Auto-register
registerPlugin(LLMDefaultPlugin);
