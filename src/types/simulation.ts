/**
 * Core types for the Asteroid/Astronaut simulation system
 * 
 * Asteroids = tagged problems with pedagogical metadata
 * Astronauts = student profiles with learning traits and accessibility needs
 * StudentProblemInput = modeling a single student's interaction with a problem
 */

import { BloomLevel } from '../agents/analysis/types';

/**
 * Asteroid: A problem decomposed into discrete components with pedagogical metadata
 * Represents a single question or problem from the assignment
 */
export interface Asteroid {
  /** Unique identifier for this problem */
  ProblemId: string;

  /** Original problem text */
  ProblemText: string;

  /** Length in words or step count */
  ProblemLength: number;

  /** Whether this is a multipart question (multiple sub-questions) */
  MultiPart: boolean;

  /** Bloom's taxonomy level: what cognitive level is required? */
  BloomLevel: BloomLevel;

  /** 0.0-1.0: sentence complexity, word rarity, technical jargon density */
  LinguisticComplexity: number;

  /** 0.0-1.0: cosine similarity to previous problems in the assignment */
  SimilarityToPrevious: number;

  /** 0.0-1.0: novelty = 1 - similarity (how unique is this problem?) */
  NoveltyScore: number;

  /** Position in the assignment (1-indexed) */
  SequenceIndex?: number;

  /** Type of response expected */
  TestType?: 'multiple_choice' | 'short_answer' | 'free_response' | 'essay' | 'calculation';

  /** Subject area (e.g., "math", "reading", "science") */
  Subject?: string;

  /** Estimated time to solve in seconds */
  EstimatedTimeSeconds?: number;
}

/**
 * Astronaut: A student profile with learning traits, accessibility needs, and performance characteristics
 */
export interface Astronaut {
  /** Unique student identifier */
  StudentId: string;

  /** Descriptive name/persona (e.g., "Focused Learner", "Visual Learner") */
  PersonaName: string;

  /** Accessibility overlays (learning disabilities, health conditions) */
  Overlays: string[]; // e.g., ["adhd", "dyslexic", "fatigue_sensitive"]

  /** Narrative learning characteristics */
  NarrativeTags: string[]; // e.g., ["focused", "curious", "visual-learner", "collaborative"]

  /** Quantified profile traits (0.0-1.0 scale) */
  ProfileTraits: {
    /** 0.0-1.0: ability to decode and comprehend written text */
    ReadingLevel: number;

    /** 0.0-1.0: fluency with mathematical operations and reasoning */
    MathFluency: number;

    /** 0.0-1.0: ability to sustain focus over time */
    AttentionSpan: number;

    /** 0.0-1.0: self-assurance in academic tasks */
    Confidence: number;
  };

  /** Grade level (e.g., "6-8", "9-12") for context */
  GradeLevel?: string;

  /** Whether this is a predefined accessibility profile */
  IsAccessibilityProfile?: boolean;
}

/**
 * StudentProblemInput: Models a single student's interaction with a single problem
 * Generated for every (Student, Problem) pair in a simulation
 */
export interface StudentProblemInput {
  /** Reference to the student (Astronaut) */
  StudentId: string;

  /** Reference to the problem (Asteroid) */
  ProblemId: string;

  /** Type of response being evaluated */
  TestType: 'multiple_choice' | 'short_answer' | 'free_response' | 'essay' | 'calculation';

  /** Problem characteristics (from Asteroid) */
  ProblemLength: number;
  MultiPart: boolean;
  BloomLevel: string;
  LinguisticComplexity: number;
  SimilarityToPrevious: number;
  NoveltyScore: number;

  /** Student characteristics (from Astronaut) */
  NarrativeTags: string[];
  Overlays: string[];

  /** Interaction simulation metrics */

  /** 0.0-1.0: likelihood student will perceive themselves as successful on this problem */
  PerceivedSuccess: number;

  /** Whether the student answered correctly (null if not yet answered) */
  ActualCorrect?: boolean;

  /** Estimated time student will spend on this problem (seconds) */
  TimeOnTask: number;

  /** >1.0 = student feels rushed, <1.0 = student feels relaxed */
  TimePressureIndex: number;

  /** 0.0-1.0: cumulative mental fatigue from prior problems */
  FatigueIndex: number;

  /** Count of confusion signals triggered (high novelty, Bloom mismatch, complexity) */
  ConfusionSignals: number;

  /** 0.0-1.0: likelihood student remains engaged with this problem */
  EngagementScore: number;
}

/**
 * StudentProblemOutput: Results from simulating a student-problem interaction
 */
export interface StudentProblemOutput {
  studentId: string;
  problemId: string;

  /** Simulation results */
  timeToCompleteSeconds: number;
  percentageSuccessful: number;
  confusionLevel: 'low' | 'medium' | 'high';
  engagementLevel: 'low' | 'medium' | 'high';

  /** Feedback for this specific interaction */
  feedback: string;
  suggestions?: string[];

  /** Bloom-level specific insights */
  bloomMismatch?: {
    studentCapability: BloomLevel;
    problemDemands: BloomLevel;
    mismatchSeverity: 'none' | 'mild' | 'severe';
  };
}

/**
 * StudentAssignmentSimulation: Aggregated results for one student across the entire assignment
 */
export interface StudentAssignmentSimulation {
  studentId: string;
  personaName: string;

  /** Overall performance estimate */
  totalTimeMinutes: number;
  estimatedScore: number; // 0-100
  estimatedGrade: 'A' | 'B' | 'C' | 'D' | 'F' | 'Incomplete';

  /** Per-problem results */
  problemResults: StudentProblemOutput[];

  /** Engagement trajectory */
  engagement: {
    initial: number;
    atMidpoint: number;
    final: number;
    trend: 'improving' | 'declining' | 'stable';
  };

  /** Fatigue trajectory */
  fatigue: {
    initial: number;
    peak: number;
    final: number;
  };

  /** Which problems caused confusion */
  confusionPoints: string[]; // problem IDs

  /** At-risk indicators */
  atRisk: boolean;
  riskFactors?: string[];

  /** Where the student checked out (if at all) */
  checkedOutAt?: string; // problem ID
}

/**
 * AssignmentSimulationResults: Complete simulation results for all students on an assignment
 */
export interface AssignmentSimulationResults {
  assignmentId: string;
  timestamp: string;

  /** All problems in the assignment */
  asteroids: Asteroid[];

  /** All student profiles tested */
  astronauts: Astronaut[];

  /** Per-student results */
  studentResults: StudentAssignmentSimulation[];

  /** Aggregated analytics */
  aggregatedAnalytics: {
    averageTimeMinutes: number;
    averageScore: number;
    completionRate: number; // % of students expected to finish
    bloomCoverage: Record<BloomLevel, number>; // % coverage per level
    commonConfusionPoints: string[]; // Most problematic problem IDs
    atRiskStudentCount: number;
  };
}
