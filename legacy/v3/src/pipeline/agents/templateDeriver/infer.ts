import { ItemType, CognitiveIntent, Difficulty, SharedContext } from "pipeline/contracts/Blueprint";
import { TemplateAnalysis } from "./types";

export function inferItemType(reqItemType: ItemType | undefined, analysis: TemplateAnalysis): ItemType {
  return reqItemType ?? analysis.itemType;
}

export function inferCognitiveIntent(reqIntent: CognitiveIntent | undefined, analysis: TemplateAnalysis): CognitiveIntent {
  return reqIntent ?? analysis.cognitiveIntent;
}

export function inferDifficulty(reqDifficulty: Difficulty | undefined, analysis: TemplateAnalysis): Difficulty {
  return reqDifficulty ?? analysis.difficulty;
}

export function normalizeSharedContext(raw: SharedContext): SharedContext {
  if (!raw) return "none";
  const text = String(raw).toLowerCase();

  if (text.includes("passage") || text.includes("text") || text.includes("reading")) return "passage";
  if (text.includes("code") || text.includes("program") || text.includes("loop")) return "code";
  if (text.includes("scenario") || text.includes("situation") || text.includes("context")) return "scenario";

  return "none";
}

export function mapStructureToConfig(structure: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!structure) return {};

  const requiresEvidence = Boolean(structure.requiresEvidence ?? structure.hasEvidence);
  const requiresInference = Boolean(structure.requiresInference ?? structure.inference);
  const hasPassage = Boolean(structure.hasPassage);
  const hasCode = Boolean(structure.hasCode);
  const hasScenario = Boolean(structure.hasScenario);

  return {
    requiresEvidence,
    requiresInference,
    stimulusType: hasPassage ? "passage" : hasCode ? "code" : hasScenario ? "scenario" : "none",
    responseType: (structure.responseType as string | undefined) ?? "short_answer",
    questionPattern: (structure.questionPattern as string | undefined) ?? "analysis",
  };
}

export function autoLabelFromExamples(examples: string[]): string {
  const first = examples[0] ?? "Custom Template";
  const trimmed = first.split("\n")[0].slice(0, 60).trim();
  return trimmed || "Custom Template";
}
