import type { Blueprint } from "./Blueprint";

/**
 * The object returned by runCreatePipeline / create().
 * Components should access sub-fields (finalAssessment, blueprint, trace, etc.)
 * directly from this type.
 */
export interface UnifiedAssessmentResponse {
  selected?: unknown;
  blueprint: Blueprint;
  finalAssessment?: unknown;
  writerDraft?: unknown;
  gatekeeperResult?: unknown;
  gatekeeperFinal?: unknown;
  philosopherWrite?: unknown;
  rewritten?: unknown;
  trace?: unknown;
  writerContract?: unknown;
  documentInsights?: unknown;
  scribe?: unknown;
  astro1?: null;
  spaceCampResult?: null;
  astro2?: null;
  // top-level fields returned on early-exit paths
  topic?: string;
  assessmentType?: string;
  difficultyPreference?: string;
  studentLevel?: string;
  extractedConcepts?: unknown;
  extractedVocabulary?: unknown;
  extractedDifficulty?: unknown;
  extractedAngles?: unknown;
}
