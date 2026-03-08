import { GenericPattern } from "./patterns";

export interface GenericTemplate {
  id: string;
  templateType: "procedural" | "conceptual" | "structural";
  taskType: string | null;
  surfaceForm: string;
  representations: string[];
  answerFormat: string;
  constraints?: Record<string, any>;
  pattern: GenericPattern;
}

export interface ProceduralTemplate extends GenericTemplate {
  structure: string;
  operands: string[];
  unknownPositions: string[];
  ranges: Record<string, [number, number]>;
  answerLogic: string;
  difficultyModel: {
    easy: Record<string, any>;
    medium: Record<string, any>;
    hard: Record<string, any>;
  };
}

export interface ConceptualPlugin extends GenericTemplate {
  cognitiveDemand: string;
  surfaceArea: string;
}
