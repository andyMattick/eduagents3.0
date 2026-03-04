/**
 * document/index.ts — Barrel export for the Document Intelligence Layer.
 */
export { runSummarizer, type DocumentSummary } from "./summarizer";
export { runComparator, type ComparatorInput, type ComparatorOutput } from "./comparator";
export { runAnalyzer, type AnalyzerInput, type AnalyzerOutput } from "./analyzer";
