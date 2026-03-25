import type { PatternSlot, Relationship, Rule } from "./patterns";

export interface GenericTemplate {
  id: string;
  sourceItemId: string;
  templateType: "structural" | "procedural" | "conceptual" | string;
  taskType: string | null;
  surfaceForm: string;
  representations: string[];
  answerFormat: string;
  pattern: {
    slots: PatternSlot[];
    relationships: Relationship[];
    rules: Rule[];
  };
}

export interface ProceduralTemplate extends GenericTemplate {
  templateType: "procedural";
  structure: string;
  operands: string[];
  unknownPositions: string[];
  ranges: Record<string, [number, number]>;
  answerLogic: string;
  difficultyModel: {
    easy: Record<string, unknown>;
    medium: Record<string, unknown>;
    hard: Record<string, unknown>;
  };
}

export interface ConceptualPlugin extends GenericTemplate {
  templateType: "conceptual";
  cognitiveDemand: string;
  surfaceArea: string;
}
