// @ts-nocheck
/**
 * pluginScoring.ts — SCRIBE scoring extensions for plugin-generated problems.
 *
 * Master Spec §13: SCRIBE must score template, diagram, image, and LLM problems.
 * Must log: generation_method, plugin_id, diagram_type, template_id, confidence_score.
 */

import type { GeneratedProblem, ProblemSlot } from "../interfaces/problemPlugin";

// ─── Score Entry ───────────────────────────────────────────────────────────

export interface PluginScoreEntry {
  slot_id: string;
  generation_method: string;
  plugin_id: string;
  diagram_type: string | null;
  template_id: string | null;
  confidence_score: number;
  quality_factors: {
    hasPrompt: boolean;
    hasAnswer: boolean;
    hasConcepts: boolean;
    hasSkills: boolean;
    hasStandards: boolean;
    hasDiagram: boolean;
    topicMatch: boolean;
    difficultyMatch: boolean;
  };
}

// ─── Scoring Logic ─────────────────────────────────────────────────────────

/**
 * scoreProblem — deterministic quality score for a plugin-generated problem.
 *
 * Scoring rubric (0.0–1.0):
 *   +0.20  has prompt
 *   +0.20  has answer
 *   +0.15  has concepts[]
 *   +0.10  has skills[]
 *   +0.10  has standards[]
 *   +0.10  topic matches slot
 *   +0.10  difficulty matches slot
 *   +0.05  has diagram (when slot expects one)
 */
export function scoreProblem(
  problem: GeneratedProblem & { _pluginId?: string },
  slot: ProblemSlot
): PluginScoreEntry {
  let score = 0;
  const hasPrompt = !!problem.prompt && problem.prompt.length > 0;
  const hasAnswer = problem.answer !== undefined && problem.answer !== null && String(problem.answer).length > 0;
  const hasConcepts = (problem.concepts?.length ?? 0) > 0;
  const hasSkills = (problem.skills?.length ?? 0) > 0;
  const hasStandards = (problem.standards?.length ?? 0) > 0;
  const hasDiagram = !!problem.diagram;

  const topicMatch =
    !slot.topic ||
    problem.prompt.toLowerCase().includes(slot.topic.toLowerCase()) ||
    (problem.concepts ?? []).some((c: string) => c.toLowerCase().includes(slot.topic.toLowerCase()));

  const difficultyMatch =
    !slot.difficulty || problem.metadata?.difficulty === slot.difficulty;

  if (hasPrompt) score += 0.20;
  if (hasAnswer) score += 0.20;
  if (hasConcepts) score += 0.15;
  if (hasSkills) score += 0.10;
  if (hasStandards) score += 0.10;
  if (topicMatch) score += 0.10;
  if (difficultyMatch) score += 0.10;
  if (hasDiagram && slot.problem_source === "diagram") score += 0.05;
  // Non-diagram slots still get the 0.05 if they have all other fields
  if (slot.problem_source !== "diagram") score += 0.05;

  return {
    slot_id: slot.slot_id,
    generation_method: problem.metadata?.generation_method ?? "unknown",
    plugin_id: problem._pluginId ?? problem.metadata?.plugin_id ?? "unknown",
    diagram_type: problem.diagram?.diagramType ?? slot.diagram_type ?? null,
    template_id: problem.metadata?.template_id ?? slot.template_id ?? null,
    confidence_score: Math.round(score * 100) / 100,
    quality_factors: {
      hasPrompt,
      hasAnswer,
      hasConcepts,
      hasSkills,
      hasStandards,
      hasDiagram,
      topicMatch,
      difficultyMatch,
    },
  };
}

/**
 * scoreAllProblems — score an entire batch of plugin-generated problems.
 */
export function scoreAllProblems(
  problems: (GeneratedProblem & { _pluginId?: string; slot_id: string })[],
  slots: ProblemSlot[]
): PluginScoreEntry[] {
  const slotMap = new Map(slots.map((s) => [s.slot_id, s]));
  return problems.map((p) => {
    const slot = slotMap.get(p.slot_id);
    if (!slot) {
      return {
        slot_id: p.slot_id,
        generation_method: "unknown",
        plugin_id: "unknown",
        diagram_type: null,
        template_id: null,
        confidence_score: 0,
        quality_factors: {
          hasPrompt: false, hasAnswer: false, hasConcepts: false,
          hasSkills: false, hasStandards: false, hasDiagram: false,
          topicMatch: false, difficultyMatch: false,
        },
      };
    }
    return scoreProblem(p, slot);
  });
}
