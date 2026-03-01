/**
 * WriterRunSummary
 *
 * Snapshot of a single Writer pipeline run, built from the Gatekeeper report,
 * Writer telemetry, blueprint plan, and UAR.  Passed to updateWriterAgentDossier
 * after every run so the health record is updated incrementally.
 */
export type WriterRunSummary = {
  /** e.g. "writer:Math", "writer:pre-calculus" */
  agentId: string;
  /** e.g. "Math", "pre-calculus" — the course/domain portion */
  domain: string;
  /** Specific topic or lesson */
  topic: string;
  /** 0–10 from the Philosopher quality score, normalised to 0–100 for storage */
  qualityScore: number;
  /** Total gatekeeper violations from this run */
  gatekeeperViolations: number;
  /** Number of items sent to the Rewriter */
  rewriteCount: number;
  /** Total question slots in the blueprint */
  questionCount: number;
  /** Question types used (e.g. ["multipleChoice", "shortAnswer"]) */
  questionTypes: string[];
  /** Cognitive distribution from the blueprint plan */
  cognitiveDistribution: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
  };
  /** Blueprint-level difficulty profile */
  difficultyProfile: "belowLevel" | "onLevel" | "aboveLevel" | string;
  /** True when no topic/domain-mismatch violations were raised */
  alignedToTopic: boolean;
  /** True when no structural violations were raised */
  structuralOk: boolean;
  /** Flags for specific known error classes */
  errorFlags: {
    spacingMerge: boolean;
    notationBreak: boolean;
    drift: boolean;
    hallucination: boolean;
    difficultyMismatch: boolean;
    structureViolation: boolean;
  };
};
