/**
 * lib/blueprint/buildBlueprint.ts — Blueprint Engine
 *
 * Converts semantic analysis into a deterministic generation plan.
 * The blueprint controls WHAT the LLM generates — topic, skills,
 * concepts, question structure, misconceptions — so the LLM
 * executes rather than decides.
 *
 * Design rules:
 *   - Deterministic where possible (no LLM in this layer)
 *   - Degrades gracefully (always returns valid Blueprint)
 *   - Structure is system-controlled, not LLM-decided
 */

import type { QuerySemantics, DocumentSemantics } from "../semantic/parseQuery";

// ── Types ───────────────────────────────────────────────────────────────────

export type QuestionType = "multiple_choice" | "short_answer" | "true_false" | "open_ended";
export type BloomSkill = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

export interface QuestionSlot {
  type: QuestionType;
  skill: BloomSkill;
  concept: string;
}

export interface Blueprint {
  topic: string;
  skills: BloomSkill[];
  concepts: string[];
  questionPlan: QuestionSlot[];
  misconceptions: string[];
}

// ── Skill mapping ───────────────────────────────────────────────────────────

const INTENT_TO_SKILLS: Record<string, BloomSkill[]> = {
  question: ["remember", "understand"],
  generate: ["understand", "apply"],
  compare: ["analyze", "evaluate"],
  explain: ["understand", "analyze"],
};

const TYPE_FOR_SKILL: Record<BloomSkill, QuestionType> = {
  remember: "multiple_choice",
  understand: "short_answer",
  apply: "short_answer",
  analyze: "open_ended",
  evaluate: "open_ended",
  create: "open_ended",
};

// ── Builder ─────────────────────────────────────────────────────────────────

export interface BuildBlueprintInput {
  semantics: QuerySemantics;
  documentSemantics?: DocumentSemantics;
  intent: string;
}

/**
 * Build a deterministic generation blueprint from semantic analysis.
 * No LLM calls — pure logic. Always returns a valid Blueprint.
 */
export function buildBlueprint({
  semantics,
  documentSemantics,
  intent,
}: BuildBlueprintInput): Blueprint {
  // Topic: prefer document-level topic, fall back to first concept or intent
  const topic =
    documentSemantics?.topic ||
    semantics.concepts[0] ||
    extractTopicFromIntent(intent);

  // Skills: derive from intent type
  const skills = INTENT_TO_SKILLS[semantics.intent] ?? ["understand"];

  // Concepts: merge query concepts + document concepts, deduplicate
  const queryConcepts = semantics.concepts.slice(0, 5);
  const docConcepts = (documentSemantics?.concepts ?? []).slice(0, 5);
  const concepts = dedup([...queryConcepts, ...docConcepts]).slice(0, 6);

  // If no concepts found, extract from intent as fallback
  if (concepts.length === 0) {
    const fallback = extractTopicFromIntent(intent);
    if (fallback) concepts.push(fallback);
  }

  // Question plan: one slot per concept, cycling through skills
  const questionPlan = concepts.map((concept, i): QuestionSlot => {
    const skill = skills[i % skills.length];
    return {
      type: TYPE_FOR_SKILL[skill],
      skill,
      concept,
    };
  });

  // Misconceptions: from document semantics
  const misconceptions = documentSemantics?.misconceptions ?? [];

  return {
    topic,
    skills,
    concepts,
    questionPlan,
    misconceptions,
  };
}

// ── Prompt builder ──────────────────────────────────────────────────────────

/**
 * Build the final LLM prompt from a blueprint + context chunks.
 * Structured so the LLM executes the plan, not invents one.
 */
export function buildBlueprintPrompt(
  blueprint: Blueprint,
  contextChunks: string[],
  userPrompt: string
): string {
  const blueprintBlock = JSON.stringify(blueprint, null, 2);

  const contextBlock =
    contextChunks.length > 0
      ? contextChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")
      : "(no document context available)";

  return `You are an expert educational assessment generator.

--- BLUEPRINT ---
${blueprintBlock}

--- CONTEXT ---
${contextBlock}

--- INSTRUCTIONS ---
Follow the blueprint EXACTLY.
- Generate one question for each item in questionPlan.
- Use ONLY concepts listed in the blueprint.
- Use the context to ground your questions in real content.
- If misconceptions are listed, include at least one distractor based on them.
- Do NOT invent concepts outside the blueprint.
- If you cannot generate a question for a concept from the context, say so explicitly.
- Match the question type (multiple_choice, short_answer, true_false, open_ended) precisely.

--- TASK ---
${userPrompt}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractTopicFromIntent(intent: string): string {
  // Pull the most meaningful noun phrase from the prompt
  // Strip common prefixes
  const cleaned = intent
    .replace(/^(generate|create|make|build|write|explain|compare)\s+/i, "")
    .replace(/^(questions?|assessment|quiz|test)\s+(about|on|for)\s+/i, "")
    .trim();

  // Take first 5 words max
  const words = cleaned.split(/\s+/).slice(0, 5);
  return words.join(" ").toLowerCase() || "general";
}

function dedup(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const lower = item.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}
