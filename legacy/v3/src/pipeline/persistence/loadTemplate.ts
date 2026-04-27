import { readJSON, readAllJSON } from "./storage";

/**
 * Load all teacher-saved templates for a given teacher.
 */
export async function loadTemplatesForTeacher(teacherId: string): Promise<unknown[]> {
  return readAllJSON(teacherId, `teacher/${teacherId}/`);
}

/**
 * Load a teacher template and merge it with the original system template
 * so the final object always matches the full system template schema.
 */
export async function loadTemplate(teacherId: string, templateId: string) {
  // Load the saved teacher template (may be incomplete)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saved = await readJSON<any>(teacherId, `teacher/${teacherId}/${templateId}`);

  // Lazy import to avoid circular dependency (index.ts → loadTemplate.ts → index.ts)
  const { systemProblemTypes } = await import("../schema/templates/problemTypes");
;

  // Find the original system template (full metadata)
  const original = systemProblemTypes[templateId];

  if (!original) {
    throw new Error(`System template not found for id: ${templateId}`);
  }

  if (!saved) {
    throw new Error(`Saved teacher template not found for id: ${templateId}`);
  }

  // Merge saved + original into a complete template object
  const fullTemplate = {
    id: saved.id ?? original.id,
    label: saved.label ?? original.label,
    subject: saved.subject ?? original.subject ?? "Other",

    // Core metadata
    itemType: saved.itemType ?? original.itemType,
    cognitiveIntent: saved.cognitiveIntent ?? original.cognitiveIntent,
    difficulty: saved.difficulty ?? original.difficulty ?? "medium",
    sharedContext: saved.sharedContext ?? original.sharedContext,

    // Configurable fields
    configurableFields: saved.configurableFields ?? original.configurableFields ?? {},

    // Preview items
    previewItems: saved.previewItems ?? original.previewItems ?? [],

    // Examples
    examples: saved.examples ?? original.examples ?? [],

    // Inferred flags
    inferred: saved.inferred ?? {},

    // Multi-part templates (system templates don't have this; teacher saves may)
    templateParts: saved.templateParts ?? [],

    // Builder output (saved template always has this)
    structure: saved.structure ?? {},

    // Mark as teacher template
    isTeacherTemplate: true,
  };

  return fullTemplate;
}
