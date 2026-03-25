/**
 * telemetry.ts
 *
 * Types and accumulator for Writer adaptive-chunking telemetry.
 * Logged per pipeline run; surfaced in the trace but never shown to teachers.
 */

export interface WriterTelemetry {
  /** Chunk sizes used across all batches, in order */
  chunkSizes: number[];
  /** Number of times a chunk was flagged as truncated */
  truncationEvents: number;
  /** Total number of Gatekeeper violations encountered across all items */
  gatekeeperViolations: number;
  /** Number of items that were sent to the Rewriter */
  rewriteCount: number;
  /** Final count of accepted problems */
  finalProblemCount: number;
}

export function createTelemetry(): WriterTelemetry {
  return {
    chunkSizes: [],
    truncationEvents: 0,
    gatekeeperViolations: 0,
    rewriteCount: 0,
    finalProblemCount: 0,
  };
}
