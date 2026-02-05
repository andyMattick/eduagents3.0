/**
 * Phase 3: Assignment Generation from Teacher Materials
 * 
 * Handles intent extraction from uploaded lesson plans/notes/slides
 * and generates optimized assignments based on instructional intent
 */

import { BloomLevel } from '../agents/analysis/types';
import { Asteroid } from './simulation';

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
