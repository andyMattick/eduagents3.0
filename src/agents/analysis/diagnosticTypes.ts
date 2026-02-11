/**
 * Assessment Analysis Engine - Core Type Definitions (REFACTORED)
 * 
 * UNIVERSAL, SUBJECT-AGNOSTIC SCHEMA
 * 
 * This system defines:
 * - Universal problem object schema (works for any subject)
 * - Subject profiles (external configuration)
 * - Cognitive metadata (always present, never subject-specific)
 * - Content taxonomy (subject-specific, configurable via profiles)
 * - Frequency and diagnostic analysis
 * 
 * PRINCIPLE: Separate cognitive structure from content taxonomy
 * 
 * NOT subject-specific. NOT hardcoded topics/types.
 * Designed for vector representation and ML.
 */

// ============================================================================
// FUNDAMENTAL TYPES (Universal)
// ============================================================================

export type BloomLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
export type ProceduralComplexity = 1 | 2 | 3 | 4 | 5;
export type ProblemNumberingStyle = '1.' | 'a.' | 'roman' | 'parenthetical' | 'inferred';

// ============================================================================
// SUBJECT PROFILE CONFIGURATION (External, not hardcoded)
// ============================================================================

/**
 * Subject profile loaded from JSON config
 * Defines what's allowed in each subject
 * Examples: statistics.json, english.json, python.json
 */
export interface SubjectProfile {
  subject: string;                    // e.g., "AP_Statistics", "US_History", "Python_CS"
  displayName: string;
  version: string;
  
  // Topic taxonomy - THE ONLY PLACE topics should be defined
  topics?: string[];
  
  // Problem type taxonomy - THE ONLY PLACE types should be defined
  problemTypes?: string[];
  
  // Optional constraints
  bloomsCeiling?: BloomLevel;
  
  // Redundancy thresholds (subject-specific rules)
  redundancyConfig?: {
    topicFrequencyThresholdPercent?: number;
    problemTypeRepeatThreshold?: number;
    allowedBloomLevels?: BloomLevel[];
  };
  
  // Expected distributions (for validation)
  expectedDistributions?: {
    blooms?: Record<BloomLevel, number>;
    complexity?: Record<ProceduralComplexity, number>;
  };
}

// ============================================================================
// UNIVERSAL PROBLEM SCHEMA (Core)
// ============================================================================

/**
 * CORE OBJECT: Universal problem representation
 * 
 * Works for ANY subject. All fields are standardized.
 * Subject-specific content goes in classification.topics (from subject profile).
 * 
 * Design principle: This object is ATOMIZED.
 * Each problem/subpart is independently queryable.
 * All cognitive dimensions are stored numerically for vector conversion.
 */
export interface UniversalProblem {
  // IDENTITY
  problemId: string;                  // e.g., "P1", "S2-P3-a" (unique within document)
  documentId: string;                 // Parent assessment
  subject: string;                    // Subject code
  sectionId: string;
  parentProblemId?: string;           // If subpart
  
  // CONTENT
  content: string;                    // Raw problem text
  
  // COGNITIVE METADATA (Always present, subject-agnostic)
  cognitive: CognitiveMetadata;
  
  // CLASSIFICATION (Subject-specific, pulled from subject profile)
  classification: ClassificationMetadata;
  
  // STRUCTURE & METADATA
  structure: {
    isSubpart: boolean;
    numberingStyle: ProblemNumberingStyle;
    multiPartCount: number;
    sourceLineStart: number;
    sourceLineEnd: number;
  };
  
  // ANALYSIS METADATA
  analysis: {
    confidenceScore: number;          // 0-1 overall confidence
    processedAt: string;              // ISO timestamp
  };
}

/**
 * Cognitive metadata - NEVER changes per subject
 * All dimensions present, all numeric/ordinal for vector conversion
 */
export interface CognitiveMetadata {
  bloomsLevel: BloomLevel;
  bloomsConfidence: number;           // 0-1
  bloomsReasoning: string;
  bloomsContextDependent: boolean;    // Is verb meaning context-dependent?
  
  complexityLevel: ProceduralComplexity;  // 1-5
  
  estimatedTimeMinutes: number;
  timeBreakdown: {
    readingMinutes: number;
    comprehensionMinutes: number;
    computationMinutes: number;
    reasoningMinutes: number;
    writingMinutes: number;
  };
  
  linguisticComplexity: number;       // 0-1 (Flesch-Kincaid normalized)
  reasoningStepsRequired: number;
  proceduralWeight: number;           // 0-1 (procedural vs conceptual)
}

/**
 * Classification metadata - Subject-specific, pulls from subject profile
 */
export interface ClassificationMetadata {
  problemType: string | null;         // From subject profile problemTypes[]
  topics: string[];                   // From subject profile topics[]
  requiresCalculator: boolean;
  requiresInterpretation: boolean;
}

// ============================================================================
// DOCUMENT STRUCTURE LAYER
// ============================================================================

export interface DocumentLocation {
  line: number;
  problemId: string;
  subpartId?: string;
}

export interface SubPart {
  subpartId: string;
  text: string;
  numbering: string;
  parentProblemId: string;
}

export interface Problem {
  problemId: string;
  sectionId: string;
  text: string;
  numbering: string;
  numberStyle: ProblemNumberingStyle;
  startLine: number;
  endLine: number;
  subparts: SubPart[];
  isMultiPart: boolean;
}

export interface Section {
  sectionId: string;
  title?: string;
  problems: Problem[];
  startLine: number;
  endLine: number;
  headerType?: 'bold' | 'all-caps' | 'size-increase' | 'underline' | 'inferred';
}

export interface ParsedDocument {
  sections: Section[];
  totalProblems: number;
  totalSubparts: number;
  numberingStyles: ProblemNumberingStyle[];
  detectionMetadata: {
    usesFormatting: boolean;
    usesNumbering: boolean;
    usesSpacing: boolean;
    confidence: number;
  };
}

// ============================================================================
// FREQUENCY & ANALYSIS LAYER
// ============================================================================

export interface TopicFrequency {
  topic: string;                      // Topic from subject profile
  count: number;
  percentage: number;
  locations: DocumentLocation[];
  bloomLevels: BloomLevel[];
}

export interface BloomFrequency {
  level: BloomLevel;
  count: number;
  percentage: number;
  locations: DocumentLocation[];
}

export interface ComplexityFrequency {
  level: ProceduralComplexity;
  count: number;
  percentage: number;
}

export interface ProblemTypeFrequency {
  type: string;
  count: number;
  percentage: number;
  locations: DocumentLocation[];
}

export interface RedundancyFlag {
  type: 'high-topic-frequency' | 'repeated-type' | 'bloom-gap' | 'bloom-skipped';
  severity: 'warning' | 'critical';
  description: string;
  locations: DocumentLocation[];
  recommendation: string;
}

export interface FrequencyAnalysis {
  topics: TopicFrequency[];
  bloomDistribution: BloomFrequency[];
  complexityDistribution: ComplexityFrequency[];
  problemTypeDistribution: ProblemTypeFrequency[];
  redundancyFlags: RedundancyFlag[];
  redundancyIndex: number;            // 0-10
}

// ============================================================================
// DIAGNOSTIC OUTPUT LAYER
// ============================================================================

export interface SectionDiagnostics {
  sectionId: string;
  title?: string;
  problemCount: number;
  
  scores: {
    alignmentConsistency: number;    // 1-10
    redundancyControl: number;
    cognitiveBalance: number;
    timeRealism: number;
    skillDiversity: number;
  };
  
  analysis: {
    bloomDistribution: BloomFrequency[];
    topicCoverage: string[];
    estimatedTotalTime: number;
    averageComplexity: ProceduralComplexity;
    problemTypes: string[];
  };
  
  issues: Array<{
    issue: string;
    severity: 'info' | 'warning' | 'critical';
    justification: string;
  }>;
  
  overallScore: number;               // 1-10
  justification: string;
}

export interface DocumentDiagnostics {
  totalEstimatedTimeMinutes: number;
  highestBloomLevel: BloomLevel;
  
  proceduralVsConceptual: {
    proceduralPercentage: number;
    conceptualPercentage: number;
  };
  
  topicCoverage: {
    mostTestedTopic: string | null;
    mostTestedCount: number;
    leastTestedTopic: string | null;
    leastTestedCount: number;
    topicBalanceScore: number;        // 0-1
  };
  
  bloomAnalysis: {
    distribution: BloomFrequency[];
    coverage: number;                 // 0-1
    balance: number;                  // 0-1
  };
  
  complexityAnalysis: {
    distribution: ComplexityFrequency[];
    averageLevel: ProceduralComplexity;
    range: [ProceduralComplexity, ProceduralComplexity];
  };
  
  timeAnalysis: {
    totalMinutes: number;
    shortestProblem: number;
    longestProblem: number;
    averageProblem: number;
    realism: number;                  // 0-1
  };
  
  scorecard: {
    alignmentControl: number;         // 0-100
    bloomDiscipline: number;
    topicBalance: number;
    timeRealism: number;
    redundancyControl: number;
    coherence: number;
    overallScore: number;
  };
  
  findings: string[];
  recommendations: string[];
}

// ============================================================================
// COMPLETE ANALYSIS OUTPUT
// ============================================================================

export interface AssessmentAnalysis {
  // Metadata
  documentId: string;
  subject: string;
  subjectProfile: SubjectProfile;
  timestamp: string;
  
  // Structure
  documentStructure: ParsedDocument;
  
  // Universal problems (THE MAIN OUTPUT)
  problems: UniversalProblem[];
  
  // Frequency analysis
  frequencyAnalysis: FrequencyAnalysis;
  
  // Diagnostics
  sectionDiagnostics: SectionDiagnostics[];
  documentDiagnostics: DocumentDiagnostics;
  
  // Quality metadata
  confidence: number;                 // 0-1
}

// ============================================================================
// DATABASE SCHEMA (for storage)
// ============================================================================

/**
 * Designed for multidimensional querying
 * Each problem is atomized and independently queryable
 */
export interface ProblemStorageSchema {
  // Indexing
  problem_id: string;                 // PRIMARY KEY
  document_id: string;                // FOREIGN KEY
  subject: string;                    // INDEX
  section_id: string;
  
  // Content (searchable)
  content: string;
  
  // Cognitive dimensions (all indexed for filtering/analytics)
  blooms_level: BloomLevel;           // INDEX
  blooms_confidence: number;
  complexity_level: ProceduralComplexity;  // INDEX
  estimated_time_minutes: number;
  linguistic_complexity: number;
  procedural_weight: number;
  
  // Classification (indexed for subject-specific queries)
  problem_type: string | null;        // INDEX
  topics: string[];                   // ARRAY/JSON, indexed
  
  // Vector representation (for ML/similarity)
  vector: number[];                   // Multidimensional vector
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VECTOR REPRESENTATION (for ML/future work)
// ============================================================================

/**
 * Convert UniversalProblem to multidimensional vector
 * Ensures all problems comparable across subjects
 * 
 * Dimensions (in order):
 * [0] Blooms level (1-6)
 * [1] Complexity (1-5)
 * [2] Time (0-100 normalized)
 * [3] Linguistic complexity (0-1)
 * [4] Procedural weight (0-1)
 * [5-N] Topic one-hot encoding (depends on profile)
 * [N+1-M] Problem type one-hot encoding
 */
export interface VectorRepresentation {
  problemId: string;
  dimensions: number;
  vector: number[];
  topicIndices: Map<string, number>;        // For decoding
  typeIndices: Map<string, number>;
}
