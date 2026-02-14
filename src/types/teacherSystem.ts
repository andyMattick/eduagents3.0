/**
 * Teacher System Types
 * Comprehensive data models for:
 * - Teacher accounts and authentication
 * - Assignment storage and versioning
 * - API usage tracking with tier support
 * - Question bank management
 * - Subscription and token tiers
 */

import {
  UniversalProblem,
  Astronaut,
  StudentProblemInput,
  StudentProblemOutput,
  StudentAssignmentSimulation,
  AssignmentSimulationBatch,
} from './universalPayloads';

// ============================================================================
// SUBSCRIPTION & API USAGE TIERS
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise' | 'custom';

export interface SubscriptionTierConfig {
  tier: SubscriptionTier;
  displayName: string;
  monthlyApiLimit: number;
  maxAssignments: number;
  maxQuestionsPerAssignment: number;
  questionBankEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  prioritySupport: boolean;
  priceMonthly: number;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  free: {
    tier: 'free',
    displayName: 'Free',
    monthlyApiLimit: 50,
    maxAssignments: 5,
    maxQuestionsPerAssignment: 10,
    questionBankEnabled: true,
    advancedAnalyticsEnabled: false,
    prioritySupport: false,
    priceMonthly: 0,
  },
  pro: {
    tier: 'pro',
    displayName: 'Pro',
    monthlyApiLimit: 500,
    maxAssignments: 50,
    maxQuestionsPerAssignment: 100,
    questionBankEnabled: true,
    advancedAnalyticsEnabled: true,
    prioritySupport: false,
    priceMonthly: 29,
  },
  enterprise: {
    tier: 'enterprise',
    displayName: 'Enterprise',
    monthlyApiLimit: 5000,
    maxAssignments: 500,
    maxQuestionsPerAssignment: 1000,
    questionBankEnabled: true,
    advancedAnalyticsEnabled: true,
    prioritySupport: true,
    priceMonthly: 99,
  },
  custom: {
    tier: 'custom',
    displayName: 'Custom',
    monthlyApiLimit: 10000,
    maxAssignments: 10000,
    maxQuestionsPerAssignment: 10000,
    questionBankEnabled: true,
    advancedAnalyticsEnabled: true,
    prioritySupport: true,
    priceMonthly: 0, // Determined per customer
  },
};

// ============================================================================
// TEACHER ACCOUNT
// ============================================================================

export interface ApiUsage {
  totalCalls: number; // Cumulative total for month
  callsRemaining: number; // How many calls available
  callsUsedToday: number;
  resetDate: string; // ISO date when monthly limit resets
  lastResetDate: string; // ISO date of previous reset
}

export interface TeacherProfile {
  id: string; // Unique identifier (UUID)
  email: string;
  name: string;
  schoolName?: string;
  department?: string;
  profilePhotoUrl?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface TeacherAccount {
  id: string; // Unique identifier (UUID)
  profile: TeacherProfile;
  email: string;
  hashedPassword?: string; // Optional if using OAuth
  subscription: {
    tier: SubscriptionTier;
    startDate: string; // ISO string
    renewalDate: string; // ISO string (monthly)
    isActive: boolean;
    paymentMethodId?: string; // Stripe payment method ID
  };
  apiUsage: ApiUsage;
  assignmentCount: number;
  questionBankCount: number;
  lastLogin?: string;
  isVerified: boolean;
  isAdmin?: boolean; // Admin flag for unlimited assignments
  metadata?: Record<string, any>;
}

// ============================================================================
// ASSIGNMENT STORAGE
// ============================================================================

export type AssignmentStatus = 'draft' | 'finalized' | 'archived';

export interface AssignmentProblem {
  id: string;
  text: string;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  type: string; // 'multipleChoice', 'shortAnswer', 'essay', etc.
  options?: string[]; // For multiple choice
  correctAnswer?: string;
  points?: number;
  sectionId?: string;
  estimatedTimeMinutes?: number;
  tags?: string[];
  metadata?: {
    complexityLevel?: number; // 1-5 scale (mathematical/cognitive complexity)
    linguisticComplexity?: number; // 0.0-1.0
    noveltyScore?: number; // 0.0-1.0
    multiPart?: boolean;
  };
}

// ============================================================================
// UNIVERSAL PROBLEM VERSIONING - New payload format support
// ============================================================================

export interface ProblemVersion {
  problemId: string;
  version: string; // e.g., "1.0"
  problem: UniversalProblem;
  createdAt: string;
  createdBy: string; // 'analyzer', 'rewriter', 'teacher'
  changeDescription?: string;
}

export interface AssignmentProblemVersioned {
  problemId: string;
  currentVersion: string;
  versions: ProblemVersion[];
  immutableFields: {
    problemId: string;
    cognitive: string; // JSON string of cognitive metadata (locked)
    classification: string; // JSON string of classification metadata (locked)
  };
  mutableFields: {
    content: string;
  };
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  problems: AssignmentProblem[];
  order: number;
  // New: Support for UniversalProblems
  universalProblems?: UniversalProblem[];
}

export interface AssignmentSummary {
  id: string;
  teacherId: string;
  title: string;
  subject: string;
  gradeLevel: string;
  assignmentType: string;
  status: AssignmentStatus;
  problemCount: number;
  estimatedTimeMinutes: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string (lastEdited)
  sourceFileName?: string;
  version: number;
  isTemplate: boolean; // Can be used as template for future assignments
  tags: string[];
}

export interface AssignmentDetail extends AssignmentSummary {
  specifications: {
    title: string;
    instructions: string;
    subject: string;
    gradeLevel: string;
    assignmentType: string;
    assessmentType: string;
    estimatedTime: number;
    difficulty: string;
  };
  sections: Section[];
  metadata: {
    bloomDistribution?: Record<string, number>;
    sourceFile?: string;
    sourceFileUrl?: string;
  };
  content?: any; // Full GeneratedAssignment for retrieval with all metadata
  studentSimulations?: StudentResponse[];
  rubricCriteria?: Array<{
    id: string;
    name: string;
    points: number;
    description: string;
  }>;
}

export interface StudentResponse {
  studentId: string;
  studentPersona: string;
  timeToCompleteMinutes: number;
  understoodConcepts: string[];
  struggledWith: string[];
  overallEngagement: number; // 0-1
  atRiskProfile: boolean;
}

// ============================================================================
// QUESTION BANK
// ============================================================================

export interface QuestionBankEntry {
  id: string;
  teacherId: string;
  problem: AssignmentProblem;
  assignmentId?: string; // Null if standalone question
  sectionId?: string;
  tags: string[]; // Custom tags beyond Bloom level
  bloomLevel: string;
  subject: string;
  grade: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number; // How many times added to assignments
  isFavorite: boolean;
  notes?: string; // Teacher's personal notes
  similarQuestionIds?: string[]; // Related questions in bank
}

export interface QuestionBankFilter {
  bloomLevels?: string[];
  tags?: string[];
  subjects?: string[];
  grades?: string[];
  types?: string[];
  searchText?: string;
  isFavorite?: boolean;
  createdAfter?: string; // ISO date
  createdBefore?: string; // ISO date
}

// ============================================================================
// ASTRONAUT MANAGEMENT - Student profiles for simulation
// ============================================================================

export interface TeacherAstronautLibrary {
  teacherId: string;
  astronauts: Astronaut[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedAstronautProfile {
  id: string;
  teacherId: string;
  astronaut: Astronaut;
  isTemplate: boolean; // Can be used as template for other teachers
  createdAt: string;
  updatedAt: string;
  usageCount: number; // How many times used in simulations
}

export interface AstronautFilter {
  overlays?: string[]; // Filter by accessibility overlay
  narrativeTags?: string[];
  gradeLevel?: string;
  isAccessibilityProfile?: boolean;
  searchText?: string;
}

// ============================================================================
// SIMULATION RESULTS - Batch simulation outputs
// ============================================================================

export interface AssignmentSimulationResult {
  id: string;
  assignmentId: string;
  teacherId: string;
  simulationBatch: AssignmentSimulationBatch;
  createdAt: string;
  notes?: string;
}

export interface SimulationHistory {
  assignmentId: string;
  simulations: AssignmentSimulationResult[];
}

// ============================================================================
// ASSIGNMENT VERSIONING
// ============================================================================

export interface AssignmentVersion {
  id: string;
  assignmentId: string;
  version: number;
  createdAt: string;
  createdBy: string; // "AI" or "teacher"
  changeType: 'initial' | 'regenerated' | 'rewrite' | 'manual_edit';
  changeDescription?: string;
  content: AssignmentDetail;
  metrics?: {
    averageTimeMinutes: number;
    averageEngagementScore: number;
    estimatedCompletionRate: number;
  };
}

export interface AssignmentVersionComparison {
  versionA: AssignmentVersion;
  versionB: AssignmentVersion;
  differences: {
    problemsAdded: AssignmentProblem[];
    problemsRemoved: AssignmentProblem[];
    problemsModified: Array<{
      original: AssignmentProblem;
      updated: AssignmentProblem;
    }>;
    bloomDistributionChange: {
      before: Record<string, number>;
      after: Record<string, number>;
    };
    estimatedTimeDifference: number; // minutes
  };
}

// ============================================================================
// API USAGE TRACKING
// ============================================================================

export interface ApiCallLog {
  id: string;
  teacherId: string;
  action: 'generate' | 'regenerate' | 'analyze' | 'rewrite' | 'preview';
  cost: number; // How many API calls this action consumed
  timestamp: string;
  assignmentId?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface MonthlyApiUsageReport {
  teacherId: string;
  month: string; // YYYY-MM format
  tier: SubscriptionTier;
  totalCallsAllowed: number;
  totalCallsUsed: number;
  callsByAction: Record<string, number>; // { generate: 25, regenerate: 10, etc. }
  percentageUsed: number; // 0-100
  estimatedCostUsd?: number;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface ApiLimitError {
  type: 'QUOTA_EXCEEDED';
  message: string;
  currentUsage: number;
  limit: number;
  resetDate: string;
  upgradeUrl?: string;
}

export interface AssignmentLimitError {
  type: 'ASSIGNMENT_LIMIT_EXCEEDED' | 'QUESTION_LIMIT_EXCEEDED';
  message: string;
  currentCount: number;
  limit: number;
  tier: SubscriptionTier;
}

// ============================================================================
// AUTHENTICATION & SESSIONS
// ============================================================================

export interface AuthSession {
  userId: string;
  email: string;
  sessionToken: string;
  expiresAt: string;
  refreshToken?: string;
  tier: SubscriptionTier;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
  schoolName?: string;
}

export interface PasswordResetRequest {
  email: string;
  newPassword: string;
  resetToken: string;
}

// ============================================================================
// FEATURE FLAGS & LIMITS ENFORCEMENT
// ============================================================================

export interface UserFeatureFlags {
  userId: string;
  tier: SubscriptionTier;
  canGenerate: boolean; // Based on API quota
  canRegenerate: boolean;
  canAnalyze: boolean;
  canUseQuestionBank: boolean;
  canAccessAdvancedAnalytics: boolean;
  canCloneAssignments: boolean;
  canExportToWordPdf: boolean;
  canAccessRubricGenerator: boolean;
}

export interface ResourceLimitStatus {
  tier: SubscriptionTier;
  assignmentLimit: {
    current: number;
    max: number;
    percentageUsed: number;
    canCreate: boolean;
  };
  apiCallLimit: {
    current: number;
    max: number;
    percentageUsed: number;
    canCall: boolean;
  };
  questionBankLimit?: {
    current: number;
    max: number | null; // Null = unlimited
    percentageUsed: number;
    canAdd: boolean;
  };
}

// ============================================================================
// ASSESSMENT SUBMISSIONS & POST-ANALYSIS
// ============================================================================

export interface AssessmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string; // ISO timestamp
  completionTimeMinutes: number;
  
  // Per-problem results
  problemResults: ProblemSubmissionResult[];
  
  // Overall score
  totalScore: number; // 0-100
  correctCount: number;
  totalProblems: number;
}

export interface ProblemSubmissionResult {
  problemId: string;
  problemText: string;
  timeSpentSeconds: number;
  isCorrect: boolean;
  studentResponse: string;
  mistakeType?: 'conceptual' | 'procedural' | 'careless' | 'no_attempt';
  feedback?: string;
}

export interface AssessmentStats {
  assignmentId: string;
  totalSubmissions: number;
  
  // Score metrics
  scoreRange: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  
  // Time metrics
  timeRange: {
    minMinutes: number;
    maxMinutes: number;
    averageMinutes: number;
    medianMinutes: number;
  };
  
  // Per-problem difficulty analysis
  problemStats: Array<{
    problemId: string;
    problemText: string;
    totalAttempts: number;
    correctCount: number;
    correctPercentage: number; // 0-100
    averageTimeSeconds: number;
    missedByStudents: string[]; // student IDs who missed it
    commonMistakeTypes: Array<{
      type: 'conceptual' | 'procedural' | 'careless' | 'no_attempt';
      count: number;
    }>;
  }>;
  
  // Bloom distribution effectiveness
  bloomPerformance: Record<string, {
    averageCorrectPercentage: number;
    problemCount: number;
  }>;
  
  // Recommendations
  recommendations: {
    problemsNeedingRework: string[]; // problem IDs
    bloomLevelsNeedingRebalance: string[];
    suggestedActions: string[]; // e.g., "simplify language", "add scaffolding"
  };
}

export interface AssessmentAnalysisJob {
  id: string;
  assignmentId: string;
  jobType: 'train-writer' | 'rewrite-assessment';
  stats: AssessmentStats;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  resultAssignmentId?: string; // ID of rewritten assignment if applicable
}
