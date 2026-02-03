/**
 * Student Completion & Drop-Off Simulation
 * 
 * Simulates how different learner profiles perform under time constraints and cognitive load.
 * Returns completion percentage, estimated grades, drop-off points, and skipped questions.
 */

import { LearnerProfile, AssignmentPart } from '../../types/pipeline';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StudentCompletionSimulation {
  studentProfile: string;
  completedPercent: number;
  estimatedGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  checkedOutAt: string | null;
  skippedQuestions: string[];
  completedQuestions: string[];
  timeSpentMinutes: number;
  confidenceScore: number;
  accuracyEstimate: number;
  notes: string;
  performanceFactors: PerformanceFactors;
}

export interface PerformanceFactors {
  processingSpeed: number;        // 0-1, affects time per question
  attentionSpan: number;          // 0-1, how long before checking out
  cognitiveLoad: number;          // 0-1, difficulty vs capability
  bloomChallenge: number;         // 0-1, how hard is this Bloom distribution?
  completionRisk: 'low' | 'medium' | 'high';
}

export interface CompletionPattern {
  questionsCompleted: number;
  questionsSkipped: number;
  questionsBlank: number;
  earliestSkip: number | null;
  checkoutPoint: number | null;
  averageTimePerQuestion: number;
}

export interface ClassCompletionSummary {
  averageCompletionPercent: number;
  medianCompletionPercent: number;
  averageEstimatedGrade: string;
  completionDistribution: {
    excellent: number;      // 90-100%
    good: number;          // 70-89%
    partial: number;       // 50-69%
    poor: number;          // <50%
  };
  mostSkippedQuestions: Array<{
    question: string;
    skippedByPercent: number;
  }>;
  mostCommonCheckoutPoint: string | null;
  checkoutPointDistribution: Record<string, number>;
  atRiskProfiles: Array<{
    profile: string;
    averageCompletion: number;
    riskLevel: 'high' | 'medium' | 'low';
  }>;
  commonDropOffReasons: string[];
}

// ============================================================================
// PROFILE CHARACTERISTICS - DEFINES HOW EACH PROFILE PERFORMS
// ============================================================================

export const COMPLETION_PROFILE_CHARACTERISTICS: Record<string, {
  processingSpeedMultiplier: number;
  attentionSpanMinutes: number;
  accuracyMultiplier: number;
  bloomLevelTolerance: number;
  checkoutProbability: number;
  typicalSkipPattern: 'none' | 'high-bloom' | 'late-questions' | 'random';
}> = {
  'struggling-readers': {
    processingSpeedMultiplier: 1.4,      // Takes 40% longer
    attentionSpanMinutes: 15,            // May check out after 15 min
    accuracyMultiplier: 0.75,            // ~75% accuracy on completed
    bloomLevelTolerance: 3,              // Struggles with L3+
    checkoutProbability: 0.35,           // 35% likely to check out
    typicalSkipPattern: 'high-bloom'     // Skips complex questions
  },
  'ell': {
    processingSpeedMultiplier: 1.35,
    attentionSpanMinutes: 20,
    accuracyMultiplier: 0.80,
    bloomLevelTolerance: 3,
    checkoutProbability: 0.30,
    typicalSkipPattern: 'high-bloom'
  },
  'gifted': {
    processingSpeedMultiplier: 0.7,      // 30% faster
    attentionSpanMinutes: 60,            // Extended focus
    accuracyMultiplier: 0.95,            // High accuracy
    bloomLevelTolerance: 6,              // Handles all levels
    checkoutProbability: 0.05,           // Rarely checks out
    typicalSkipPattern: 'none'
  },
  'adhd': {
    processingSpeedMultiplier: 0.9,      // Slightly faster but impulsive
    attentionSpanMinutes: 12,            // Very short attention span
    accuracyMultiplier: 0.70,            // Lower accuracy due to rushing
    bloomLevelTolerance: 3,
    checkoutProbability: 0.50,           // High checkout probability
    typicalSkipPattern: 'late-questions' // Skips later questions
  },
  'visual-learners': {
    processingSpeedMultiplier: 0.9,
    attentionSpanMinutes: 25,
    accuracyMultiplier: 0.85,
    bloomLevelTolerance: 4,
    checkoutProbability: 0.15,
    typicalSkipPattern: 'none'
  },
  'kinesthetic': {
    processingSpeedMultiplier: 1.1,      // 10% slower with text
    attentionSpanMinutes: 18,
    accuracyMultiplier: 0.78,
    bloomLevelTolerance: 3,
    checkoutProbability: 0.25,
    typicalSkipPattern: 'late-questions'
  }
};

// ============================================================================
// CORE SIMULATION LOGIC
// ============================================================================

/**
 * Simulate a single student's completion of the assignment
 */
export function simulateStudentCompletion(
  studentProfile: string,
  assignmentParts: AssignmentPart[],
  totalTimeAvailableMinutes: number,
  assignmentDifficulty: 'easy' | 'intermediate' | 'hard',
  bloomDistribution?: Record<number, number>
): StudentCompletionSimulation {
  
  const profileChars = COMPLETION_PROFILE_CHARACTERISTICS[studentProfile] || 
                       COMPLETION_PROFILE_CHARACTERISTICS['visual-learners'];

  // Step 1: Calculate time per question based on profile
  let currentTimeUsed = 0;
  let completedQuestions: string[] = [];
  let skippedQuestions: string[] = [];
  let checkedOutAt: string | null = null;
  let earliestSkipIndex: number | null = null;

  // Step 2: Simulate going through each question
  for (let i = 0; i < assignmentParts.length; i++) {
    const part = assignmentParts[i];
    const questionId = part.id || `Q${i + 1}`;

    // Time for this question based on profile
    const baseTime = part.estimatedTimeMinutes || 2;
    const adjustedTime = baseTime * profileChars.processingSpeedMultiplier;

    // Check if student has enough time left
    const timeAfterThisQuestion = currentTimeUsed + adjustedTime;

    // Check if student has "checked out" mentally
    if (currentTimeUsed > profileChars.attentionSpanMinutes && 
        Math.random() < profileChars.checkoutProbability) {
      checkedOutAt = questionId;
      // Skip remaining questions with increasing probability
      skippedQuestions.push(questionId);
      if (earliestSkipIndex === null) earliestSkipIndex = i;
      continue;
    }

    // Decide if student will skip this question
    const shouldSkip = decideToskipQuestion(
      i,
      assignmentParts.length,
      part.bloomLevel || 2,
      profileChars.bloomLevelTolerance,
      assignmentDifficulty,
      profileChars.typicalSkipPattern
    );

    if (shouldSkip) {
      skippedQuestions.push(questionId);
      if (earliestSkipIndex === null) earliestSkipIndex = i;
      // Student skips but time still passes as they read/attempt
      currentTimeUsed += adjustedTime * 0.3; // 30% of time trying
    } else {
      // Student completes this question
      completedQuestions.push(questionId);
      currentTimeUsed += adjustedTime;

      // Check if over time limit
      if (timeAfterThisQuestion > totalTimeAvailableMinutes && 
          !checkedOutAt) {
        checkedOutAt = questionId;
        // Skip remaining
        for (let j = i + 1; j < assignmentParts.length; j++) {
          const remaining = assignmentParts[j];
          skippedQuestions.push(remaining.id || `Q${j + 1}`);
        }
        break;
      }
    }
  }

  // Step 3: Calculate performance metrics
  const completedPercent = (completedQuestions.length / assignmentParts.length) * 100;
  const estimatedGrade = calculateEstimatedGrade(
    completedPercent,
    profileChars.accuracyMultiplier,
    assignmentDifficulty
  );

  // Step 4: Calculate cognitive load
  const cognitiveLoad = calculateCognitiveLoad(
    assignmentDifficulty,
    bloomDistribution || {},
    profileChars.bloomLevelTolerance
  );

  // Step 5: Generate performance factors
  const performanceFactors: PerformanceFactors = {
    processingSpeed: 1 / profileChars.processingSpeedMultiplier,
    attentionSpan: Math.min(currentTimeUsed / profileChars.attentionSpanMinutes, 1),
    cognitiveLoad: cognitiveLoad,
    bloomChallenge: calculateBloomChallenge(bloomDistribution || {}),
    completionRisk: calculateCompletionRisk(completedPercent, checkedOutAt !== null)
  };

  // Step 6: Generate notes
  const notes = generateCompletionNotes(
    studentProfile,
    completedPercent,
    checkedOutAt,
    skippedQuestions.length,
    currentTimeUsed,
    totalTimeAvailableMinutes,
    performanceFactors
  );

  return {
    studentProfile,
    completedPercent: Math.round(completedPercent),
    estimatedGrade,
    checkedOutAt,
    skippedQuestions,
    completedQuestions,
    timeSpentMinutes: Math.round(currentTimeUsed * 10) / 10,
    confidenceScore: calculateConfidenceScore(completedPercent, checkedOutAt),
    accuracyEstimate: Math.round(profileChars.accuracyMultiplier * 100),
    notes,
    performanceFactors
  };
}

/**
 * Decide if student will skip a specific question
 */
function decideToskipQuestion(
  questionIndex: number,
  totalQuestions: number,
  bloomLevel: number,
  bloomTolerance: number,
  difficulty: 'easy' | 'intermediate' | 'hard',
  skipPattern: string
): boolean {
  // High Bloom levels after their tolerance → skip
  if (bloomLevel > bloomTolerance) {
    const exceedance = bloomLevel - bloomTolerance;
    const skipChance = Math.min(0.85, 0.3 + (exceedance * 0.15));
    if (Math.random() < skipChance) return true;
  }

  // Pattern-based skipping
  switch (skipPattern) {
    case 'high-bloom':
      // Already handled above
      break;
    case 'late-questions':
      // More likely to skip later questions
      const progressPercent = (questionIndex + 1) / totalQuestions;
      if (progressPercent > 0.6 && Math.random() < 0.3) return true;
      if (progressPercent > 0.8 && Math.random() < 0.6) return true;
      break;
    case 'random':
      if (Math.random() < 0.15) return true;
      break;
    case 'none':
    default:
      return false;
  }

  return false;
}

/**
 * Calculate estimated grade based on completion and accuracy
 */
function calculateEstimatedGrade(
  completedPercent: number,
  accuracyMultiplier: number,
  difficulty: 'easy' | 'intermediate' | 'hard'
): 'A' | 'B' | 'C' | 'D' | 'F' {
  
  // Adjust for difficulty - harder assignments get slight curve
  let difficultyBonus = 0;
  if (difficulty === 'hard') difficultyBonus = 5;
  if (difficulty === 'intermediate') difficultyBonus = 2;

  // Combined score = completion * accuracy + difficulty bonus
  const combinedScore = (completedPercent * accuracyMultiplier) + difficultyBonus;

  // Letter grades with curve
  if (combinedScore >= 90) return 'A';
  if (combinedScore >= 80) return 'B';
  if (combinedScore >= 70) return 'C';
  if (combinedScore >= 60) return 'D';
  return 'F';
}

/**
 * Calculate cognitive load (how hard is this assignment for this profile?)
 */
function calculateCognitiveLoad(
  difficulty: 'easy' | 'intermediate' | 'hard',
  bloomDistribution: Record<number, number>,
  bloomTolerance: number
): number {
  
  const difficultyScores: Record<string, number> = {
    'easy': 0.3,
    'intermediate': 0.6,
    'hard': 0.85
  };

  let cognitiveLoad = difficultyScores[difficulty];

  // Add Bloom level challenge
  let bloomLoad = 0;
  let totalBloom = 0;
  for (const [level, count] of Object.entries(bloomDistribution)) {
    const levelNum = parseInt(level);
    totalBloom += count;
    const bloomExceedance = Math.max(0, levelNum - bloomTolerance);
    bloomLoad += bloomExceedance * count * 0.1;
  }

  if (totalBloom > 0) {
    cognitiveLoad += bloomLoad / totalBloom * 0.3;
  }

  return Math.min(1, cognitiveLoad);
}

/**
 * Calculate Bloom level challenge (how hard is the Bloom distribution?)
 */
function calculateBloomChallenge(bloomDistribution: Record<number, number>): number {
  
  let weightedSum = 0;
  let totalCount = 0;

  for (const [level, count] of Object.entries(bloomDistribution)) {
    const levelNum = parseInt(level);
    // L1-2 = easy, L3-4 = medium, L5-6 = hard
    const levelDifficulty = (levelNum - 1) / 5; // 0 to 1 scale
    weightedSum += levelDifficulty * count;
    totalCount += count;
  }

  return totalCount > 0 ? weightedSum / totalCount : 0.5;
}

/**
 * Calculate completion risk level
 */
function calculateCompletionRisk(
  completedPercent: number,
  checkedOut: boolean
): 'low' | 'medium' | 'high' {
  
  if (checkedOut) return 'high';
  if (completedPercent < 50) return 'high';
  if (completedPercent < 70) return 'medium';
  return 'low';
}

/**
 * Calculate confidence in the grade estimate
 */
function calculateConfidenceScore(
  completedPercent: number,
  checkedOut: boolean
): number {
  
  // Full completion = high confidence
  if (completedPercent === 100) return 0.95;
  
  // Checked out = low confidence
  if (checkedOut) return 0.6;
  
  // Partial completion: confidence decreases as completion % decreases
  return Math.max(0.5, completedPercent / 100 * 0.9);
}

/**
 * Generate detailed notes about student performance
 */
function generateCompletionNotes(
  profile: string,
  completedPercent: number,
  checkedOutAt: string | null,
  skippedCount: number,
  timeSpent: number,
  timeAvailable: number,
  factors: PerformanceFactors
): string {
  
  const notes: string[] = [];

  if (completedPercent === 100 && !checkedOutAt) {
    notes.push(`Student ${profile} completed the entire assignment with confidence.`);
  } else if (checkedOutAt) {
    notes.push(`Student ${profile} checked out at ${checkedOutAt}, completing only ${completedPercent}% of the work.`);
  } else {
    notes.push(`Student ${profile} completed ${completedPercent}% of the assignment but skipped ${skippedCount} questions.`);
  }

  // Time analysis
  if (timeSpent > timeAvailable * 0.95) {
    notes.push(`Ran out of time (used ${timeSpent}/${timeAvailable} minutes).`);
  } else if (timeSpent < timeAvailable * 0.3) {
    notes.push(`Completed quickly (used only ${timeSpent}/${timeAvailable} minutes).`);
  }

  // Cognitive load analysis
  if (factors.cognitiveLoad > 0.75) {
    notes.push(`Assignment is cognitively demanding for this learner profile.`);
  } else if (factors.cognitiveLoad < 0.3) {
    notes.push(`Assignment is well-aligned to this learner's capabilities.`);
  }

  // Risk analysis
  if (factors.completionRisk === 'high') {
    notes.push(`⚠️ HIGH RISK: Student may struggle with this assignment structure and difficulty.`);
  } else if (factors.completionRisk === 'medium') {
    notes.push(`⚡ MEDIUM RISK: Some scaffolding or extended time may help.`);
  }

  return notes.join(' ');
}

// ============================================================================
// CLASS-LEVEL ANALYSIS
// ============================================================================

/**
 * Simulate all students and generate class summary
 */
export function simulateClassCompletion(
  studentSimulations: StudentCompletionSimulation[]
): ClassCompletionSummary {
  
  // Calculate basic stats
  const completionPercents = studentSimulations.map(s => s.completedPercent);
  const averageCompletion = completionPercents.reduce((a, b) => a + b, 0) / completionPercents.length;
  const medianCompletion = completionPercents.sort((a, b) => a - b)[Math.floor(completionPercents.length / 2)];

  // Calculate grade distribution
  const gradeMap: Record<'A' | 'B' | 'C' | 'D' | 'F', number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  studentSimulations.forEach(s => {
    gradeMap[s.estimatedGrade]++;
  });
  const averageGrade = calculateAverageGrade(gradeMap, studentSimulations.length);

  // Distribution of completion levels
  const distribution = {
    excellent: studentSimulations.filter(s => s.completedPercent >= 90).length,
    good: studentSimulations.filter(s => s.completedPercent >= 70 && s.completedPercent < 90).length,
    partial: studentSimulations.filter(s => s.completedPercent >= 50 && s.completedPercent < 70).length,
    poor: studentSimulations.filter(s => s.completedPercent < 50).length
  };

  // Most skipped questions
  const skipCounts: Record<string, number> = {};
  studentSimulations.forEach(s => {
    s.skippedQuestions.forEach(q => {
      skipCounts[q] = (skipCounts[q] || 0) + 1;
    });
  });
  const mostSkipped = Object.entries(skipCounts)
    .map(([q, count]) => ({
      question: q,
      skippedByPercent: Math.round((count / studentSimulations.length) * 100)
    }))
    .sort((a, b) => b.skippedByPercent - a.skippedByPercent)
    .slice(0, 5);

  // Checkout point distribution
  const checkoutPoints: Record<string, number> = {};
  const checkoutReasons: string[] = [];
  studentSimulations.forEach(s => {
    if (s.checkedOutAt) {
      checkoutPoints[s.checkedOutAt] = (checkoutPoints[s.checkedOutAt] || 0) + 1;
      checkoutReasons.push(s.notes);
    }
  });

  const sortedCheckouts = Object.entries(checkoutPoints)
    .sort((a, b) => b[1] - a[1]);
  const mostCommonCheckout = sortedCheckouts.length > 0 ? sortedCheckouts[0][0] : null;

  // At-risk profiles
  const profileStats: Record<string, { completions: number[], count: number }> = {};
  studentSimulations.forEach(s => {
    if (!profileStats[s.studentProfile]) {
      profileStats[s.studentProfile] = { completions: [], count: 0 };
    }
    profileStats[s.studentProfile].completions.push(s.completedPercent);
    profileStats[s.studentProfile].count++;
  });

  const atRiskProfiles = Object.entries(profileStats)
    .map(([profile, data]) => {
      const avgCompletion = data.completions.reduce((a, b) => a + b, 0) / data.count;
      const riskLevel = avgCompletion < 50 ? 'high' : avgCompletion < 70 ? 'medium' : 'low';
      return { profile, averageCompletion: Math.round(avgCompletion), riskLevel };
    })
    .filter(p => p.riskLevel !== 'low')
    .sort((a, b) => a.averageCompletion - b.averageCompletion);

  return {
    averageCompletionPercent: Math.round(averageCompletion),
    medianCompletionPercent: Math.round(medianCompletion),
    averageEstimatedGrade: averageGrade,
    completionDistribution: distribution,
    mostSkippedQuestions: mostSkipped,
    mostCommonCheckoutPoint: mostCommonCheckout,
    checkoutPointDistribution: checkoutPoints,
    atRiskProfiles,
    commonDropOffReasons: extractCommonReasons(checkoutReasons)
  };
}

/**
 * Calculate average grade from grade distribution
 */
function calculateAverageGrade(
  gradeMap: Record<'A' | 'B' | 'C' | 'D' | 'F', number>,
  total: number
): string {
  const gradeValues: Record<'A' | 'B' | 'C' | 'D' | 'F', number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };
  const average = (
    (gradeMap.A * 5) +
    (gradeMap.B * 4) +
    (gradeMap.C * 3) +
    (gradeMap.D * 2) +
    (gradeMap.F * 1)
  ) / total;

  if (average >= 4.5) return 'A';
  if (average >= 3.5) return 'B';
  if (average >= 2.5) return 'C';
  if (average >= 1.5) return 'D';
  return 'F';
}

/**
 * Extract common drop-off reasons from notes
 */
function extractCommonReasons(notes: string[]): string[] {
  const reasons: Record<string, number> = {};
  const keywords = [
    'time',
    'cognitive load',
    'Bloom level',
    'attention',
    'skipped',
    'checked out',
    'demanding'
  ];

  notes.forEach(note => {
    keywords.forEach(keyword => {
      if (note.toLowerCase().includes(keyword)) {
        reasons[keyword] = (reasons[keyword] || 0) + 1;
      }
    });
  });

  return Object.entries(reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason]) => reason);
}

// ============================================================================
// UTILITY: EXPOSE TO WINDOW FOR DEBUGGING
// ============================================================================

let lastCompletionSimulation: StudentCompletionSimulation[] = [];
let lastClassSummary: ClassCompletionSummary | null = null;

export function storeCompletionSimulation(simulations: StudentCompletionSimulation[]): void {
  lastCompletionSimulation = simulations;
  lastClassSummary = simulateClassCompletion(simulations);
  console.log('📊 COMPLETION SIMULATION:', {
    students: simulations,
    classSummary: lastClassSummary
  });
}

export function getLastCompletionSimulation(): StudentCompletionSimulation[] {
  return lastCompletionSimulation;
}

export function getLastClassCompletionSummary(): ClassCompletionSummary | null {
  return lastClassSummary;
}

export function clearCompletionSimulation(): void {
  lastCompletionSimulation = [];
  lastClassSummary = null;
  console.log('🗑️ Completion simulation cleared');
}

export function exposeCompletionSimulationToWindow(): void {
  (window as any).getLastCompletionSimulation = getLastCompletionSimulation;
  (window as any).getLastClassCompletionSummary = getLastClassCompletionSummary;
  (window as any).clearCompletionSimulation = clearCompletionSimulation;
}
