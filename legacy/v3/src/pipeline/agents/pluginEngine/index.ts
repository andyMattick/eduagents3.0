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

// ── Template Registration (system, teacher, full-exam) ────────────────────
export {
  registerAllSystemTemplates,
  registerTeacherTemplates,
  registerFullExamTemplate,
} from "./registerSystemTemplates";

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
  TemplateGeneratedProblem,
} from "./interfaces/problemPlugin";

// ── Services ─────────────────────────────────────────────────────────────
export {
  registerPlugin,
  getPlugin,
  getPlugins,
  getPluginsForTopic,
  listPlugins,
  clearPlugins,
  pluginCount,
  loadPlugins,
} from "./services/pluginRegistry";
export { problemGeneratorRouter } from "./services/problemGeneratorRouter";

// Backward-compatible aliases used by older call sites.
export { problemGeneratorRouter as generateProblem } from "./services/problemGeneratorRouter";
export async function generateAllProblems(
  slots: import("./interfaces/problemPlugin").ProblemSlot[],
  context: import("./interfaces/problemPlugin").GenerationContext
) {
  const { problemGeneratorRouter } = await import("./services/problemGeneratorRouter");
  return Promise.all(slots.map((slot) => problemGeneratorRouter(slot, context)));
}

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
