/**
 * Classroom Simulation Profiles
 * 
 * Defines ProblemProfile and StudentProfile schemas for simulating
 * classroom scenarios (e.g., "astronauts in space")
 */

// ============================================
// PROBLEM PROFILE
// ============================================

export type BloomLevelType = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
export type TestType = "multiple_choice" | "short_answer" | "free_response";

export interface ProblemProfile {
  ProblemId: string;
  TestType: TestType;
  ProblemLength: number;           // Word count or step count
  MultiPart: boolean;
  BloomLevel: BloomLevelType;
  LinguisticComplexity: number;    // 0.0–1.0
  SimilarityToPrevious: number;    // 0.0–1.0
  NoveltyScore: number;            // 0.0–1.0
  CreativityScore: number;         // 0.0–1.0 (open-endedness of thinking)
  ThemeCreativity: number;         // 0.0–1.0 (fun/whimsical theme)
  HasTips: boolean;                // true if problem includes formulas, hints, or guiding instructions
}

// ============================================
// STUDENT PROFILE
// ============================================

export type AccessibilityOverlay = 
  | "adhd" 
  | "dyslexic" 
  | "fatigue_sensitive" 
  | "gifted" 
  | "visual_impairment" 
  | "hearing_impairment" 
  | "anxiety";

export type NarrativeTag = 
  | "quiet" 
  | "resilient" 
  | "curious" 
  | "focused" 
  | "creative" 
  | "analytical" 
  | "collaborative" 
  | "independent";

export interface BloomComfortProfile {
  Remember: number;     // 0.0–1.0
  Understand: number;   // 0.0–1.0
  Apply: number;        // 0.0–1.0
  Analyze: number;      // 0.0–1.0
  Evaluate: number;     // 0.0–1.0
  Create: number;       // 0.0–1.0
}

export interface StudentTraits {
  ReadingLevel: number;       // 0.3–0.95
  MathFluency: number;        // 0.3–0.95
  CreativityAffinity: number; // 0.0–1.0
  ThemeAffinity: number;      // 0.0–1.0
}

export interface StudentProfile {
  StudentId: string;
  BloomComfortProfile: BloomComfortProfile;
  Traits: StudentTraits;
  Overlays: AccessibilityOverlay[];
  NarrativeTags: NarrativeTag[];
}

// ============================================
// CLASSROOM CONFIGURATION
// ============================================

export interface ClassroomSimulationPayload {
  problems: ProblemProfile[];
  students: StudentProfile[];
}

// Bloom distribution template for a standard class
export const STANDARD_BLOOM_DISTRIBUTION = {
  1: 2,  // Level 1 (Remember): 2 students
  2: 4,  // Level 2 (Understand): 4 students
  3: 6,  // Level 3 (Apply): 6 students
  4: 5,  // Level 4 (Analyze): 5 students
  5: 2,  // Level 5 (Evaluate): 2 students
  6: 1,  // Level 6 (Create): 1 student
};

export const BLOOM_LEVELS: BloomLevelType[] = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create"
];

export const ACCESSIBILITY_OVERLAYS: AccessibilityOverlay[] = [
  "adhd",
  "dyslexic",
  "fatigue_sensitive",
  "gifted",
  "visual_impairment",
  "hearing_impairment",
  "anxiety"
];

export const NARRATIVE_TAGS: NarrativeTag[] = [
  "quiet",
  "resilient",
  "curious",
  "focused",
  "creative",
  "analytical",
  "collaborative",
  "independent"
];
