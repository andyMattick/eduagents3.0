/**
 * Assignment Feedback Types
 * Teacher feedback on assignment performance for writer improvement
 */

export interface AssignmentFeedbackSubmission {
  assignmentId: string;
  teacherId: string;
  
  // Overall performance
  overallRating: 1 | 2 | 3 | 4 | 5; // 1=poor, 5=excellent
  completionRate: number; // 0-100% of students who completed
  
  // Problem-specific feedback
  problemFeedback: ProblemPerformanceFeedback[];
  
  // What worked well
  strengthsObserved: string[]; // e.g., ["Good difficulty progression", "Clear instructions"]
  
  // What needs improvement
  problemsObserved: string[]; // e.g., ["Question 3 was unclear", "Too long overall"]
  
  // Free-form notes for the writer
  notesForWriter: string;
  
  // Metadata
  submittedAt: string; // ISO timestamp
  studentCount: number; // How many students in the class
  timeToCompleteMinutes?: number; // Actual time taken
}

export interface ProblemPerformanceFeedback {
  problemId: string; // e.g., "q1", "q3"
  problemText: string; // Store the text for context
  
  // How students performed
  percentCorrect?: number; // 0-100
  percentAttempted?: number; // Some may skip
  averageTimeSeconds?: number;
  
  // Teacher observations
  rating: 1 | 2 | 3 | 4 | 5;
  difficulty: 'too-easy' | 'just-right' | 'too-hard';
  clarity: 'unclear' | 'somewhat-clear' | 'very-clear';
  
  // Feedback
  observation?: string; // e.g., "Students found this confusing"
  suggestion?: string; // e.g., "Rephrase with simpler vocabulary"
}

/**
 * Aggregated feedback for writer (internal, not shown to teacher)
 */
export interface WriterIntelligence {
  assignmentId: string;
  problemId: string;
  
  // From teacher feedback
  teacherOptimalDifficulty: number; // 0-1, based on ratings
  teacherOptimalClarity: number; // 0-1
  
  // From simulations
  averageStudentSuccessRate: number;
  studentCohortsThatStruggled: string[]; // e.g., ["ADHD learners", "Low confidence"]
  
  // Recommendations for next generation
  suggestions: {
    action: 'simplify' | 'clarify' | 'raise-difficulty' | 'reorder' | 'replace';
    reason: string;
  }[];
}
