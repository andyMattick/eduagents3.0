import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { DeriveTemplateRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { TemplateAnalysis } from "./types";
import {
  inferItemType,
  inferCognitiveIntent,
  inferDifficulty,
  normalizeSharedContext,
  mapStructureToConfig,
  autoLabelFromExamples,
} from "@/pipeline/agents/templateDeriver/infer";

export function buildDerivedTemplate(
  request: DeriveTemplateRequest,
  analysis: TemplateAnalysis
): DerivedTemplate {
  const itemType = inferItemType(request.itemType, analysis);
  const cognitiveIntent = inferCognitiveIntent(request.cognitiveIntent, analysis);
  const difficulty = inferDifficulty(request.difficulty, analysis);

  const sharedContext = normalizeSharedContext(analysis.sharedContext);
  const configurableFields = mapStructureToConfig(analysis.structure);

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: autoLabelFromExamples(request.examples),
    subject: request.subject ?? analysis.subject ?? "ELA",
    itemType,
    cognitiveIntent,
    difficulty,
    sharedContext,
    configurableFields,
    examples: request.examples,
    inferred: {
      itemType: !request.itemType,
      cognitiveIntent: !request.cognitiveIntent,
      difficulty: !request.difficulty,
      sharedContext: true
    },
    previewItems: []
  };
}