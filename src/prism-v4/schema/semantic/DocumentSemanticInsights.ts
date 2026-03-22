import type { Problem } from "../domain";

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
  documentStandards?: Record<string, number>;
  overallDifficulty?: number;
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
