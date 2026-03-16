// @ts-nocheck
/**
 * pluginBuilder.ts — Builder extensions for plugin-generated problems.
 *
 * Master Spec §14: Builder must assemble final JSON, embed SVG diagrams,
 * embed image references, preserve plugin metadata.
 */

import type { GeneratedItem } from "pipeline/agents/writer/types";
import type { GeneratedDiagram } from "../interfaces/problemPlugin";
import { getPrompt, getAnswer, getOptions, getPassage } from "pipeline/utils/itemNormalizer";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BuiltAssessmentItem {
  id: string;
  slotId: string;
  questionType: string;
  prompt: string;
  answer?: string;
  options?: string[];
  passage?: string;
  /** Embedded SVG diagram (if any) */
  diagram?: {
    id: string;
    diagramType: string;
    svg: string;
  };
  /** Image reference (if any) */
  imageReferenceId?: string;
  /** Plugin metadata preserved through the pipeline */
  pluginMetadata?: {
    pluginId: string;
    generationMethod: string;
    concepts: string[];
    skills: string[];
    standards: string[];
    templateId?: string;
    diagramType?: string;
    confidenceScore?: number;
  };
  /** Standard item metadata */
  metadata?: Record<string, any>;
}

// ─── Builder Logic ─────────────────────────────────────────────────────────

/**
 * enrichItemWithPluginData — embeds diagram SVG, image references,
 * and plugin metadata into a built assessment item.
 *
 * Called during the Builder assembly phase.
 */
export function enrichItemWithPluginData(
  item: GeneratedItem,
  index: number
): BuiltAssessmentItem {
  const meta = item.metadata ?? {};
  const diagram: GeneratedDiagram | null = meta.diagram ?? null;

  const built: BuiltAssessmentItem = {
    id: `item_${index + 1}`,
    slotId: item.slotId,
    questionType: item.questionType,
    prompt: getPrompt(item),
    answer: getAnswer(item),
    options: getOptions(item),
    passage: getPassage(item),
    metadata: { ...meta },
  };

  // Embed SVG diagram
  if (diagram) {
    built.diagram = {
      id: diagram.id,
      diagramType: diagram.diagramType,
      svg: diagram.svg,
    };
  }

  // Embed image reference
  if (meta.imageReferenceId) {
    built.imageReferenceId = meta.imageReferenceId;
  }

  // Preserve plugin metadata for SCRIBE + analytics
  if (meta.pluginId || meta.generationMethod) {
    built.pluginMetadata = {
      pluginId: meta.pluginId ?? "unknown",
      generationMethod: meta.generationMethod ?? "unknown",
      concepts: meta.concepts ?? [],
      skills: meta.skills ?? [],
      standards: meta.standards ?? [],
      templateId: meta.template_id ?? undefined,
      diagramType: meta.diagram_type ?? diagram?.diagramType ?? undefined,
      confidenceScore: meta.confidence_score ?? undefined,
    };
  }

  return built;
}

/**
 * enrichAllItems — batch enrich all items in an assessment.
 */
export function enrichAllItems(items: GeneratedItem[]): BuiltAssessmentItem[] {
  return items.map((item, i) => enrichItemWithPluginData(item, i));
}
