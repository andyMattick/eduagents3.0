/**
 * problemPlugins/index.ts — Master barrel for all plugins.
 *
 * Importing this module triggers auto-registration of every plugin
 * into the PluginRegistry. Import once early in the pipeline bootstrap.
 */

// Template plugins (deterministic, no LLM)
import "./templates";

// Diagram plugins (deterministic, SVG generation)
import "./diagrams";

// LLM fallback plugin
import "./llmDefaultPlugin";
