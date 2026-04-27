/**
 * WriterItemMetadata — The governed contract for Writer → Gatekeeper → Builder → Scribe.
 *
 * All downstream agents read THIS shape from GeneratedItem.metadata.
 * No re-derivation. No blueprint joins. Just the metadata.
 *
 * This ensures deterministic, auditable, type-safe flow through the pipeline.
 */

export interface WriterItemMetadata {
  // === ROUTING + PROVENANCE ===
  /**
   * How this item was generated: template plugin, diagram plugin, image plugin, or LLM fallback.
   */
  generationMethod: "template" | "diagram" | "image" | "llm";

  /**
   * If generationMethod === "template", which template was used.
   * Null if other generation method.
   */
  templateId: string | null;

  /**
   * If generationMethod === "diagram", which diagram type was used.
   * Null if other generation method.
   */
  diagramType: string | null;

  /**
   * If generationMethod === "image", which image was analyzed.
   * Null if other generation method.
   */
  imageReferenceId: string | null;

  // === COGNITIVE + DIFFICULTY ===
  /**
   * The difficulty band this item occupies.
   */
  difficulty: "easy" | "medium" | "hard";

  /**
   * The cognitive demand level (Bloom taxonomy or custom).
   * Examples: "recall", "understand", "apply", "analyze", "evaluate", "create".
   */
  cognitiveDemand: string | null;

  // === STYLE + STRUCTURE ===
  /**
   * The topic angle or perspective for this question.
   * Examples: "scenario-based", "definition-based", "application-based".
   */
  topicAngle: string | null;

  /**
   * Expected time (in seconds) a student should spend on this item.
   */
  pacingSeconds: number | null;

  // === BLUEPRINT ALIGNMENT ===
  /**
   * The slot ID from Architect V3 that this item satisfies.
   */
  slotId: string;

  /**
   * The question type (MCQ, ShortAnswer, PassageBased, etc.).
   */
  questionType: string;

  // === OPTIONAL STRUCTURE (for Builder grouping + Scribe learning) ===
  /**
   * If this item belongs to a named section (MC section, passage section, etc.).
   */
  sectionId?: string | null;

  /**
   * If this item is part of a shared passage.
   */
  passageId?: string | null;
}

/**
 * Helper: ensure an item has complete metadata.
 */
export function ensureMetadata(item: any): WriterItemMetadata {
  return {
    generationMethod: item.metadata?.generationMethod ?? "llm",
    templateId: item.metadata?.templateId ?? null,
    diagramType: item.metadata?.diagramType ?? null,
    imageReferenceId: item.metadata?.imageReferenceId ?? null,
    difficulty: item.metadata?.difficulty ?? "medium",
    cognitiveDemand: item.metadata?.cognitiveDemand ?? null,
    topicAngle: item.metadata?.topicAngle ?? null,
    pacingSeconds: item.metadata?.pacingSeconds ?? null,
    slotId: item.metadata?.slotId ?? item.slotId,
    questionType: item.metadata?.questionType ?? item.questionType,
    sectionId: item.metadata?.sectionId ?? null,
    passageId: item.metadata?.passageId ?? null,
  };
}
