// pipeline/pluginEngine/registerSystemTemplates.ts
import { registerPlugin } from "./services/pluginRegistry";
import { wrapSchemaTemplate } from "./wrapSchemaTemplate";
import { allSystemProblemTypes } from "../../schema/templates/problemTypes";
import type { SystemTemplate } from "../../schema/templates/problemTypes/templateCarrier";

/**
 * Re-registers all built-in system templates.
 * Note: pluginRegistry.ts already calls this eagerly at module load.
 * Call this explicitly if you need to force a refresh.
 */
export function registerAllSystemTemplates(): void {
  for (const template of allSystemProblemTypes) {
    registerPlugin(wrapSchemaTemplate(template));
  }
}

/**
 * Registers teacher-created templates from Supabase as first-class plugins.
 * Call this after loading teacher templates, e.g. on auth or teacher profile load.
 */
export function registerTeacherTemplates(teacherTemplates: SystemTemplate[]): void {
  for (const template of teacherTemplates) {
    registerPlugin(wrapSchemaTemplate(template));
  }
}

/**
 * Registers a single full-exam template (uploaded by teacher) as a reusable plugin.
 * Parse the uploaded exam into a SystemTemplate shape before calling this.
 */
export function registerFullExamTemplate(template: SystemTemplate): void {
  registerPlugin(wrapSchemaTemplate(template));
}
