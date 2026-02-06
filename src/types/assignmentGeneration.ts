/**
 * Phase 3: Assignment Generation from Teacher Materials
 * 
 * Handles intent extraction from uploaded lesson plans/notes/slides
 * and generates optimized assignments based on instructional intent
 */

import { BloomLevel } from '../agents/analysis/types';
import { Asteroid } from './simulation';

// ============================================================================
// PHASE 3: GOAL + SOURCE FRAMEWORK
// ============================================================================

/**
 * Phase 3 User Intent: What does the teacher want to do?
 */
export type Phase3Goal = 'create' | 'analyze' | 'refine';

/**
 * Phase 3 Resource Availability: Do they have source materials?
 */
export type Phase3Source = 'hasNotes' | 'noNotes';

/**
 * Phase 3 Input when hasNotes (user provides lesson plans, notes, slides, raw problems)
 */
export interface Phase3InputWithNotes {
  source: 'hasNotes';
  uploadedFile?: {
    fileName: string;
    contentType: 'pdf' | 'docx' | 'text';
    extractedText: string;
  };
  gradeLevel: string;
  subject: string;
  /** Optional: explicit learning objectives from teacher */
  learningObjectives?: string[];
}

/**
 * Phase 3 Input when noNotes (user provides topic, grade, goals, problem count)
 */
export interface Phase3InputWithoutNotes {
  source: 'noNotes';
  topic: string;
  gradeLevel: string;
  subject: string;
  bloomGoals?: Partial<Record<BloomLevel, number>>;
  problemCount?: number;
  learningObjectives?: string[];
}

/**
 * Unified Phase 3 session context combining goal + source
 */
export interface Phase3Context {
  goal: Phase3Goal;
  source: Phase3Source;
  input: Phase3InputWithNotes | Phase3InputWithoutNotes;
  
  /** Extracted intent tags (generated after input) */
  intentTags?: AssignmentIntentTags;
  
  /** For create/refine: existing assignment being worked with */
  existingAssignment?: {
    content: string;
    asteroids?: Asteroid[];
  };

  /** Session metadata */
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Phase 3 Behavior Specification: defines what system should do based on goal + source
 */
export interface Phase3BehaviorSpec {
  goal: Phase3Goal;
  source: Phase3Source;
  
  /** Should system extract intent from materials? */
  extractIntent: boolean;
  
  /** Should system generate new problems? */
  generateProblems: boolean;
  
  /** Should system evaluate existing assignment? */
  analyzeAssignment: boolean;
  
  /** Should system compute novelty vs source? */
  scoreNovelty: boolean;
  
  /** Should system compute prior knowledge coverage? */
  scorePriorKnowledge: boolean;
  
  /** Prompt template path or ID */
  systemPromptKey: string;
  
  /** Next pipeline step after processing */
  nextStep: string;
  
  /** Description for UI */
  description: string;
}

/**
 * Behavior Matrix: defines system actions for all goal + source combinations
 */
export const PHASE3_BEHAVIOR_MATRIX: Record<Phase3Goal, Record<Phase3Source, Phase3BehaviorSpec>> = {
  create: {
    hasNotes: {
      goal: 'create',
      source: 'hasNotes',
      extractIntent: true,
      generateProblems: true,
      analyzeAssignment: false,
      scoreNovelty: true,
      scorePriorKnowledge: true,
      systemPromptKey: 'generate_from_notes',
      nextStep: 'REVIEW_GENERATED',
      description: 'Extract intent from notes → generate assignment → score novelty & prior knowledge vs source',
    },
    noNotes: {
      goal: 'create',
      source: 'noNotes',
      extractIntent: false,
      generateProblems: true,
      analyzeAssignment: false,
      scoreNovelty: false,
      scorePriorKnowledge: false,
      systemPromptKey: 'generate_from_topic',
      nextStep: 'REVIEW_GENERATED',
      description: 'Prompt for topic, grade, Bloom goals → generate from scratch → use default novelty/prior assumptions',
    },
  },
  analyze: {
    hasNotes: {
      goal: 'analyze',
      source: 'hasNotes',
      extractIntent: true,
      generateProblems: false,
      analyzeAssignment: true,
      scoreNovelty: true,
      scorePriorKnowledge: true,
      systemPromptKey: 'analyze_with_source',
      nextStep: 'ANALYSIS_RESULTS',
      description: 'Parse uploaded assignment → compare to source → run analyzeWithAI() → output Bloom, pacing, novelty, prior knowledge',
    },
    noNotes: {
      goal: 'analyze',
      source: 'noNotes',
      extractIntent: false,
      generateProblems: false,
      analyzeAssignment: true,
      scoreNovelty: false,
      scorePriorKnowledge: false,
      systemPromptKey: 'analyze_no_source',
      nextStep: 'ANALYSIS_RESULTS',
      description: 'Prompt user to paste/describe assignment → run analyzeWithAI() → output Bloom and pacing only',
    },
  },
  refine: {
    hasNotes: {
      goal: 'refine',
      source: 'hasNotes',
      extractIntent: true,
      generateProblems: true,
      analyzeAssignment: true,
      scoreNovelty: true,
      scorePriorKnowledge: true,
      systemPromptKey: 'refine_with_source',
      nextStep: 'REFINED_ASSIGNMENT',
      description: 'Parse assignment + source → identify gaps/redundancy → regenerate with improved spacing, scaffolding, Bloom balance',
    },
    noNotes: {
      goal: 'refine',
      source: 'noNotes',
      extractIntent: false,
      generateProblems: true,
      analyzeAssignment: true,
      scoreNovelty: false,
      scorePriorKnowledge: false,
      systemPromptKey: 'refine_no_source',
      nextStep: 'REFINED_ASSIGNMENT',
      description: 'Prompt for refinement goals (e.g., "add Apply-level problems") → regenerate assignment accordingly',
    },
  },
};

// ============================================================================
// EXISTING TYPES (kept for backward compatibility)
// ============================================================================

export type AssignmentType = 'quiz' | 'warm-up' | 'exit-ticket' | 'practice-set' | 'project';

export type ProblemType = 
  | 'multiple-choice'
  | 'short-answer'
  | 'free-response'
  | 'essay'
  | 'procedural'
  | 'conceptual'
  | 'creative'
  | 'interpretive';

export type CognitiveLoadTarget = 'low' | 'medium' | 'high' | 'bell-curve';

export type NoveltyPreference = 'low' | 'medium' | 'high';

/**
 * AssignmentIntentTags: Output of intent extraction from uploaded teacher materials
 * Describes the pedagogical intent and design constraints for assignment generation
 */
export interface AssignmentIntentTags {
  /** Main topic or unit being covered */
  topic: string;

  /** Inferred Bloom level distribution from materials */
  inferredBloomDistribution: Partial<Record<BloomLevel, number>>;

  /** Suggested problem types based on materials */
  preferredProblemTypes: ProblemType[];

  /** Cognitive load progression strategy */
  cognitiveLoadTarget: CognitiveLoadTarget;

  /** How much variety/novelty to include in problems */
  noveltyPreference: NoveltyPreference;

  /** Should generated problems include tips, hints, scaffolding? */
  includeTips: boolean;

  /** Estimated completion time in minutes */
  estimatedTime: number;

  /** Key concepts found in materials */
  keyConcepts: string[];

  /** Extracted learning objectives */
  learningObjectives: string[];

  /** Inferred instructional tone */
  instructionalTone: 'exploratory' | 'evaluative' | 'scaffolded' | 'challenge';

  /** Confidence score for intent extraction (0.0-1.0) */
  extractionConfidence: number;
}

/**
 * Assignment type specifications: Bloom emphasis, problem traits, length
 */
export const ASSIGNMENT_TYPE_SPECS: Record<AssignmentType, {
  bloomEmphasis: BloomLevel[];
  problemTraits: ProblemType[];
  minProblems: number;
  maxProblems: number;
  preferredTips: boolean;
  cognitiveLoadStrategy: CognitiveLoadTarget;
  noveltyStrategy: NoveltyPreference;
  description: string;
}> = {
  quiz: {
    bloomEmphasis: ['Apply', 'Analyze'],
    problemTraits: ['procedural', 'conceptual'],
    minProblems: 5,
    maxProblems: 10,
    preferredTips: false,
    cognitiveLoadStrategy: 'medium',
    noveltyStrategy: 'medium',
    description: 'Formal assessment with tight pacing and minimal hints',
  },
  'warm-up': {
    bloomEmphasis: ['Remember', 'Understand'],
    problemTraits: ['multiple-choice', 'short-answer'],
    minProblems: 2,
    maxProblems: 4,
    preferredTips: true,
    cognitiveLoadStrategy: 'low',
    noveltyStrategy: 'low',
    description: 'Confidence-building opener with scaffolding',
  },
  'exit-ticket': {
    bloomEmphasis: ['Understand', 'Apply'],
    problemTraits: ['short-answer', 'free-response'],
    minProblems: 1,
    maxProblems: 3,
    preferredTips: true,
    cognitiveLoadStrategy: 'low',
    noveltyStrategy: 'low',
    description: 'Reflective exit slip with hints; single-part focus',
  },
  'practice-set': {
    bloomEmphasis: ['Apply', 'Analyze', 'Evaluate'],
    problemTraits: ['procedural', 'conceptual', 'interpretive'],
    minProblems: 6,
    maxProblems: 12,
    preferredTips: true,
    cognitiveLoadStrategy: 'bell-curve',
    noveltyStrategy: 'medium',
    description: 'Iterative skill-building with varied complexity and novelty spacing',
  },
  project: {
    bloomEmphasis: ['Create', 'Evaluate'],
    problemTraits: ['creative', 'interpretive'],
    minProblems: 1,
    maxProblems: 2,
    preferredTips: false,
    cognitiveLoadStrategy: 'high',
    noveltyStrategy: 'high',
    description: 'Open-ended synthesis with minimal guidance',
  },
};

/**
 * AsteroidOptimizedAssignment: Full assignment optimized and ready for classroom use
 */
export interface AsteroidOptimizedAssignment {
  /** Assignment metadata */
  id: string;
  type: AssignmentType;
  title: string;
  topic: string;
  gradeLevel: string;
  subject: string;

  /** Generated problems */
  asteroids: Asteroid[];

  /** Intent that drove generation */
  intentTags: AssignmentIntentTags;

  /** Bloom level histogram */
  bloomHistogram: Record<BloomLevel, number>;

  /** Cognitive load curve by problem position */
  cognitiveLoadCurve: number[];

  /** Teacher-facing rationale for design choices */
  designRationale: string;

  /** Estimated total completion time */
  estimatedTimeMinutes: number;

  /** Section experience preview (optional) */
  sectionExperience?: {
    title: string;
    problemIndices: number[];
    estimatedTime: number;
    bloomFocus: BloomLevel[];
  }[];

  /** Metadata from source materials */
  sourceContext?: {
    fileName?: string;
    uploadDate?: string;
    contentType?: 'pdf' | 'docx' | 'text';
  };

  /** Timestamp of generation */
  generatedAt: string;
}

/**
 * Teacher upload session for generating assignments
 */
export interface AssignmentGenerationSession {
  id: string;
  sessionStart: string;
  uploadedFile?: {
    name: string;
    type: 'pdf' | 'docx' | 'text';
    size: number;
  };
  extractedText?: string;
  intentTags?: AssignmentIntentTags;
  generatedAssignment?: AsteroidOptimizedAssignment;
  status: 'uploading' | 'extracting' | 'generating' | 'complete' | 'error';
  currentStep?: string;
  errorMessage?: string;
}
