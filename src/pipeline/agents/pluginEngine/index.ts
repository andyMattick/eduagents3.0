/**
 * pluginEngine/index.ts — Master barrel export for the Plugin-Based Instruction Engine.
 *
 * Import this to bootstrap the entire plugin system:
 *   - Registers all plugins (templates, diagrams, LLM)
 *   - Exports the Router, Registry, Gatekeeper extensions, Writer bridge, Builder, SCRIBE scoring
 *   - Exports the Concept Graph
 *
 * Pipeline flow:
 *   Architect → InputJudge → GeneratorRouter → Plugins → Writer → Gatekeeper → Builder → SCRIBE → ConceptGraph
 */

// ── Bootstrap: Import triggers plugin auto-registration ──────────────────
import "./services/problemPlugins";

// ── Interfaces ───────────────────────────────────────────────────────────
export type {
  ProblemSlot,
  DiagramType,
  GeneratedDiagram,
  GeneratedProblem,
  GenerationContext,
  ValidationResult,
  GenerationType,
  ProblemPlugin,
} from "./interfaces";

// ── Services ─────────────────────────────────────────────────────────────
export {
  registerPlugin,
  getPlugin,
  getPluginsForTopic,
  listPlugins,
  clearPlugins,
  pluginCount,
  generateProblem,
  generateAllProblems,
  generateDiagram,
  scoreProblem,
  scoreAllProblems,
  analyzeImage,
  analyzeImageBatch,
} from "./services";
export type { PluginScoreEntry, ImageSchema, AnalyzeImageInput } from "./services";

// ── Writer Bridge ────────────────────────────────────────────────────────
export { wrapPluginOutput, wrapAllPluginOutputs } from "./writer/writerBridge";
export type { WriterWrapOptions } from "./writer/writerBridge";

// ── Gatekeeper ───────────────────────────────────────────────────────────
export {
  validatePluginOutput,
  validateAllPluginOutputs,
} from "./gatekeeper/pluginGatekeeper";
export type { PluginViolation, PluginGatekeeperResult } from "./gatekeeper/pluginGatekeeper";

// ── Builder ──────────────────────────────────────────────────────────────
export { enrichItemWithPluginData, enrichAllItems } from "./builder/pluginBuilder";
export type { BuiltAssessmentItem } from "./builder/pluginBuilder";

// ── Concept Graph ────────────────────────────────────────────────────────
export {
  ConceptGraph,
  getConceptGraph,
  resetConceptGraph,
} from "./conceptGraph";
export type {
  Concept,
  Skill,
  Standard,
  ConceptRelationship,
  ProblemConceptTags,
  ConceptGraphSnapshot,
} from "./conceptGraph";
