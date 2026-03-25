/**
 * document/index.ts — Barrel export for the Document Intelligence Layer.
 * summarizer and comparator have been consolidated; stubs preserve the export
 * contract for any remaining references.
 */
export type DocumentSummary = Record<string, unknown>;
export type ComparatorInput = Record<string, unknown>;
export type ComparatorOutput = Record<string, unknown>;
export type AnalyzerInput = Record<string, unknown>;
export type AnalyzerOutput = Record<string, unknown>;
export const runSummarizer = async (_input: unknown): Promise<DocumentSummary> => ({});
export const runComparator = async (_input: ComparatorInput): Promise<ComparatorOutput> => ({});
export const runAnalyzer = async (_input: AnalyzerInput): Promise<AnalyzerOutput> => ({});
