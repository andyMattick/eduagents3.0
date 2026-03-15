/**
 * pluginRegistry.ts — Central registry for all problem-generation plugins.
 *
 * Plugins self-register via registerPlugin(). The ProblemGeneratorRouter
 * resolves slots to plugins by looking up template_id, diagram_type,
 * image_reference_id, or falling back to "llm_default".
 *
 * Auto-load: import the problemPlugins/ barrel to trigger registration.
 */

// internal registry
import type { ProblemPlugin } from "../interfaces/problemPlugin";
import { allSystemProblemTypes } from "../../../schema/templates/problemTypes";
import { GeneralProblemPlugins } from "../../../schema/templates/problemTypes/GeneralProblems";
import { wrapSchemaTemplate } from "../wrapSchemaTemplate";


// ─── Registry Store ────────────────────────────────────────────────────────

const _plugins = new Map<string, ProblemPlugin>();

// ─── Public API ────────────────────────────────────────────────────────────

function registerSchemaTemplates() {
  for (const template of allSystemProblemTypes) {
    registerPlugin(wrapSchemaTemplate(template));
  }
}

function registerGeneralProblemPlugins() {
  for (const plugin of GeneralProblemPlugins) {
    registerPlugin(plugin);
  }
}

registerSchemaTemplates();
registerGeneralProblemPlugins();


/**
 * Register a plugin. Duplicate IDs overwrite silently (hot-reload friendly).
 */
export function registerPlugin(plugin: ProblemPlugin): void {
  _plugins.set(plugin.id, plugin);
  console.info(`[PluginRegistry] Registered: ${plugin.id} (${plugin.generationType})`);
}

/**
 * Retrieve a plugin by its exact ID.
 * Returns undefined when no plugin matches.
 */
export function getPlugin(pluginId: string | undefined): ProblemPlugin | undefined {
  if (!pluginId) return undefined;
  return _plugins.get(pluginId);
}

export function getPlugins(): ProblemPlugin[] {
  return Array.from(_plugins.values());
}

import { algebraic_fluency_template } from "./problemPlugins/templates/algebraic_fluency_template";
import { arithmetic_fluency_template } from "./problemPlugins/templates/arithmetic_fluency_template";
import { FractionsPlugin } from "./problemPlugins/templates/fractions";
import { LinearEquationPlugin } from "./problemPlugins/templates/linearEquation";
registerPlugin(arithmetic_fluency_template);
registerPlugin(FractionsPlugin);
registerPlugin(LinearEquationPlugin);
registerPlugin(algebraic_fluency_template);

/**
 * Return all registered plugins that list the given topic in supportedTopics.
 * Plugins with an empty supportedTopics array are considered universal and always match.
 */
export function getPluginsForTopic(topic: string): ProblemPlugin[] {
  const lower = topic.toLowerCase();
  return [..._plugins.values()].filter(
    (p) =>
      p.supportedTopics.length === 0 ||
      p.supportedTopics.some((t) => t.toLowerCase() === lower)
  );
}

/**
 * Return all registered plugin IDs (for debugging / admin dashboard).
 */
export function listPlugins(): string[] {
  return [..._plugins.keys()];
}

/**
 * Clear all plugins (used in tests).
 */
export function clearPlugins(): void {
  _plugins.clear();
}

/**
 * Total count of registered plugins.
 */
export function pluginCount(): number {
  return _plugins.size;
}

export function loadPlugins(): void {
//place holder for future plugin loading logic, e.g. from a remote source or with dynamic imports

}
