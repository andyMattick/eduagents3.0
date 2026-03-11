/**
 * services/index.ts — Barrel export for plugin engine services.
 */
export { registerPlugin, getPlugin, getPluginsForTopic, listPlugins, clearPlugins, pluginCount } from "./pluginRegistry";
export { generateProblem, generateAllProblems } from "./problemGeneratorRouter";
export { generateDiagram } from "./diagramGenerator";
export { scoreProblem, scoreAllProblems, type PluginScoreEntry } from "./pluginScoring";
export { analyzeImage, analyzeImageBatch, type ImageSchema, type AnalyzeImageInput } from "./imageAnalyzer";
