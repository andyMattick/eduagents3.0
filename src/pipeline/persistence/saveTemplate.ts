import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { writeJSON } from "./storage";

/**
 * Save a teacher-created template as a fully-formed template object.
 *
 * derivedTemplate = output of deriveTemplate()
 * originalTemplate = the system/teacher template the user started from
 */
export async function saveTemplate(
  teacherId: string,
  derivedTemplate: DerivedTemplate,
  originalTemplate: any
): Promise<void> {

  // Build a complete template object using both derived + original fields
  const fullTemplate = {
    // Always present
    id: derivedTemplate.id,
    label: derivedTemplate.label ?? originalTemplate.label,

    // Subject always comes from the original template
    subject: originalTemplate.subject ?? "Other",

    // Core metadata (derived overrides original)
    itemType: derivedTemplate.itemType ?? originalTemplate.itemType,
    cognitiveIntent: derivedTemplate.cognitiveIntent ?? originalTemplate.cognitiveIntent,
    difficulty: derivedTemplate.difficulty ?? originalTemplate.difficulty,
    sharedContext: derivedTemplate.sharedContext ?? originalTemplate.sharedContext,

    // Configurable fields (system templates always have these)
    configurableFields: originalTemplate.configurableFields ?? {},

    // Preview items (system templates always have these)
    previewItems: originalTemplate.previewItems ?? [],

    // Examples (optional but used by preview + inference)
    examples: derivedTemplate.examples ?? originalTemplate.examples ?? [],

    // Inference flags
    inferred: derivedTemplate.inferred ?? {},

    // Multi-part templates (DerivedTemplate does NOT include this)
    templateParts: originalTemplate.templateParts ?? [],

    // Builder output (DerivedTemplate *does* include this)
    structure: (derivedTemplate as any).structure ?? originalTemplate.structure ?? {},
  };

  const path = `teacher/${teacherId}/${fullTemplate.id}`;
  await writeJSON(teacherId, path, fullTemplate);
}
