// src/pipeline/types/Blueprint.ts

import type { QuestionType } from "./UAR";

/**
 * A single slot in the blueprint.
 * Each slot describes exactly ONE question the Writer must generate.
 * 
 * This is the core of your extensibility architecture:
 * - New question types
 * - New media types
 * - New guardrails
 * - New cognitive rules
 * - New difficulty models
 * 
 * ...all become slot attributes, NOT pipeline changes.
 */
export interface BlueprintSlot {
  id: string;

  // Required: the type of question to generate
  questionType: QuestionType;

  // Optional: cognitive demand
  cognitiveDemand?: 
    | "remember"
    | "understand"
    | "apply"
    | "analyze"
    | "evaluate"
    | "create"
    | (string & {}); // extensible

  // Optional: difficulty level
  difficulty?: "easy" | "medium" | "hard" | (string & {});

  // Optional: pacing (how fast/slow the question should feel)
  pacing?: "normal" | "slow" | "fast" | (string & {});

  // Optional: whether this question requires an image
  requiresImage?: boolean;

  // Optional: media attached to the slot
  media?: {
    type: "image" | (string & {});
    url?: string;
    alt?: string;
    [key: string]: any; // extensible
  };

  // Optional: any additional constraints or metadata
  constraints?: Record<string, any>;

  // EXTENSION POINT:
  // This allows you to add new slot attributes without breaking anything.
  [key: string]: any;
}

/**
 * The full blueprint plan.
 * Architect produces this.
 * Writer consumes this.
 * Gatekeeper validates against this.
 */
export interface BlueprintPlanV3_2 {
  version: "3.2";

  domain: string;
  grade: string;
  assessmentType: string;

  // Total number of questions
  questionCount: number;

  // The slot plan (the heart of the blueprint)
  slots: BlueprintSlot[];

  // Optional metadata about the blueprint
  metadata?: {
    generatedAt?: string;
    architectModel?: string;
    [key: string]: any; // extensible
  };

  // EXTENSION POINT:
  // Add new blueprint-level features without breaking anything.
  [key: string]: any;
}
