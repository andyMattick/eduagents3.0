// src/pipeline/types/Blueprint.ts

import type { QuestionType } from "./UAR";

/**
 * Word-count bounds and sub-question count for passageBased slots.
 */
export interface PassageBasedConstraints {
  /** Approximate passage length bucket */
  passageLength: "short" | "medium" | "long"; // ~100–150 words, 150–250 words, 250–350 words
  /** Number of sub-questions the Writer must generate (2–4 recommended) */
  questionCount: number;
}

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

  /**
   * Multi-select: Writer picks ONE type per slot.
   * When present, any type in this array is accepted by the Gatekeeper.
   * Takes precedence over `questionType` for validation.
   */
  questionTypes?: QuestionType[];

  /**
   * Arithmetic fluency only: constrains which operation the expression uses.
   * "any" means the Writer may choose freely.
   */
  operation?: "add" | "subtract" | "multiply" | "divide" | "any";

  /**
   * Arithmetic fluency + general: operand range constraint.
   * Gatekeeper enforces that all numeric operands stay within [min, max].
   */
  range?: { min: number; max: number };

  /**
   * Passage-based question support.
   * When true, the Writer must generate a reading passage alongside questions.
   */
  requiresPassage?: boolean;

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
  constraints?: {
    /** Passage-based length + sub-question count */
    passageBased?: PassageBasedConstraints;
    taskTypes?: string[]; // e.g. from TASK_TYPES
    [key: string]: any;
  };

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
