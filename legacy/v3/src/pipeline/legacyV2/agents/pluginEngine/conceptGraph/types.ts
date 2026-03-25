/**
 * conceptGraph/types.ts — Data model for the Concept Graph layer.
 *
 * Every generated problem must include: concepts[], skills[], standards[].
 * SCRIBE stores these. The Concept Graph tracks relationships between them.
 */

// ─── Core Entities ─────────────────────────────────────────────────────────

export interface Concept {
  id: string;
  name: string;
  domain: string;
  /** Grade levels where this concept is typically introduced */
  gradeRange?: [number, number];
  /** Related standard IDs */
  standardIds?: string[];
}

export interface Skill {
  id: string;
  name: string;
  /** Bloom's taxonomy level this skill maps to */
  bloomLevel?: string;
  /** Concept IDs this skill requires */
  prerequisiteConcepts?: string[];
}

export interface Standard {
  id: string;
  code: string;
  description: string;
  domain: string;
  gradeLevel?: string;
}

// ─── Relationships ─────────────────────────────────────────────────────────

export type RelationshipType =
  | "prerequisite"
  | "corequisite"
  | "extends"
  | "related"
  | "assessed_by";

export interface ConceptRelationship {
  from: string;
  to: string;
  type: RelationshipType;
  strength: number; // 0.0–1.0
}

// ─── Problem Tags (output from every generated problem) ────────────────────

export interface ProblemConceptTags {
  /** Slot/problem ID */
  problemId: string;
  concepts: string[];
  skills: string[];
  standards: string[];
  /** Plugin that generated this problem */
  pluginId?: string;
  /** Generation method */
  generationMethod?: string;
}

// ─── Graph Snapshot (for analytics) ────────────────────────────────────────

export interface ConceptGraphSnapshot {
  concepts: Concept[];
  skills: Skill[];
  standards: Standard[];
  relationships: ConceptRelationship[];
  /** Per-problem tagging */
  problemTags: ProblemConceptTags[];
  /** Coverage metrics */
  coverage: {
    totalConcepts: number;
    assessedConcepts: number;
    coverageRatio: number;
    missingConcepts: string[];
  };
}
