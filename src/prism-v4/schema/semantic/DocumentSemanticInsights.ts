import type { Problem } from "../domain";

export interface DocumentSemanticConceptDetail {
  concept: string;
  aliases?: string[];
  freqProblems: number;
  freqPages: number;
  freqDocuments: number;
  semanticDensity: number;
  multipartPresence: number;
  crossDocumentRecurrence: number;
  score: number;
  isNoise: boolean;
}

export interface DocumentSemanticInsights {
  documentId: string;
  title?: string;
  subject?: string;
  gradeLevel?: number;

  rawText: string;

  sections: {
    sectionId: string;
    title?: string;
    text: string;
    concepts?: Record<string, number>;
    standards?: Record<string, number>;
    difficulty?: number;
    linguisticLoad?: number;
  }[];

  problems: Problem[];

  documentConcepts?: Record<string, number>;
  documentConceptDetails?: DocumentSemanticConceptDetail[];
  documentStandards?: Record<string, number>;
  overallContentComplexity?: number;
  overallLinguisticLoad?: number;

  conceptGraph?: {
    nodes: { id: string; label: string; weight?: number }[];
    edges: { from: string; to: string; weight?: number }[];
  };

  semantics?: {
    topic?: string;
    concepts?: string[];
    relationships?: string[];
    misconceptions?: string[];
  };

  confidence?: {
    extractionQuality?: number;
    taggingQuality?: number;
  };

  flags?: {
    unreadable?: boolean;
    lowQualityScan?: boolean;
    missingPages?: boolean;
  };
}
