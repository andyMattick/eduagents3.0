/**
 * Assignment Feedback Service
 * Stores teacher feedback on assignment performance
 * Used by writers to improve future generations
 */

import { supabase } from './supabaseClient';
import { 
  AssignmentFeedbackSubmission, 
  WriterIntelligence 
} from '../types/assignmentFeedback';

/**
 * Submit teacher feedback on assignment performance
 */
export async function submitAssignmentFeedback(
  feedback: AssignmentFeedbackSubmission
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('assignment_feedback')
      .insert({
        assignment_id: feedback.assignmentId,
        teacher_id: feedback.teacherId,
        overall_rating: feedback.overallRating,
        completion_rate: feedback.completionRate,
        student_count: feedback.studentCount,
        time_to_complete_minutes: feedback.timeToCompleteMinutes,
        strengths_observed: feedback.strengthsObserved,
        problems_observed: feedback.problemsObserved,
        notes_for_writer: feedback.notesForWriter,
        problem_feedback: feedback.problemFeedback,
      })
      .select('id');

    if (error) {
      console.error('❌ Failed to submit feedback:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Feedback submitted:', data?.[0]);
    return { success: true, id: data?.[0]?.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error submitting feedback:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Get writer intelligence for an assignment
 * (aggregated feedback without teacher attribution)
 */
export async function getWriterIntelligenceForAssignment(
  assignmentId: string
): Promise<WriterIntelligence[]> {
  try {
    const { data, error } = await supabase
      .from('assignment_feedback')
      .select('problem_feedback, overall_rating, completion_rate, notes_for_writer')
      .eq('assignment_id', assignmentId);

    if (error) {
      console.error('❌ Failed to fetch feedback:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Aggregate feedback by problem
    const problemIntelligence: Map<string, WriterIntelligence> = new Map();

    for (const feedback of data) {
      const problems = Array.isArray(feedback.problem_feedback) 
        ? feedback.problem_feedback 
        : [];

      for (const prob of problems) {
        const probId = (prob as any).problemId;
        if (!probId) continue;

        if (!problemIntelligence.has(probId)) {
          problemIntelligence.set(probId, {
            assignmentId,
            problemId: probId,
            teacherOptimalDifficulty: 0.5,
            teacherOptimalClarity: 0.8,
            averageStudentSuccessRate: 0,
            studentCohortsThatStruggled: [],
            suggestions: [],
          });
        }

        const intel = problemIntelligence.get(probId)!;
        const prob_data = prob as any;

        // Map difficulty to score
        if (prob_data.difficulty === 'too-easy') {
          intel.teacherOptimalDifficulty = Math.max(intel.teacherOptimalDifficulty, 0.3);
        } else if (prob_data.difficulty === 'too-hard') {
          intel.teacherOptimalDifficulty = Math.min(intel.teacherOptimalDifficulty, 0.7);
        }

        // Map clarity to score
        if (prob_data.clarity === 'unclear') {
          intel.teacherOptimalClarity = Math.min(intel.teacherOptimalClarity, 0.4);
        } else if (prob_data.clarity === 'very-clear') {
          intel.teacherOptimalClarity = Math.max(intel.teacherOptimalClarity, 0.9);
        }

        // Add suggestions if there's feedback
        if (prob_data.observation) {
          if (!intel.suggestions.some(s => s.reason.includes(prob_data.observation))) {
            intel.suggestions.push({
              action: intel.teacherOptimalClarity < 0.6 ? 'clarify' : 'raise-difficulty',
              reason: prob_data.observation,
            });
          }
        }
      }
    }

    return Array.from(problemIntelligence.values());
  } catch (error) {
    console.error('❌ Error fetching writer intelligence:', error);
    return [];
  }
}

/**
 * Get feedback history for a teacher's view
 */
export async function getMyAssignmentFeedback(
  teacherId: string,
  assignmentId?: string
) {
  try {
    let query = supabase
      .from('assignment_feedback')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch feedback history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error fetching feedback history:', error);
    return [];
  }
}

/**
 * Update existing feedback
 */
export async function updateAssignmentFeedback(
  feedbackId: string,
  updates: Partial<AssignmentFeedbackSubmission>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('assignment_feedback')
      .update({
        overall_rating: updates.overallRating,
        completion_rate: updates.completionRate,
        student_count: updates.studentCount,
        time_to_complete_minutes: updates.timeToCompleteMinutes,
        strengths_observed: updates.strengthsObserved,
        problems_observed: updates.problemsObserved,
        notes_for_writer: updates.notesForWriter,
        problem_feedback: updates.problemFeedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (error) {
      console.error('❌ Failed to update feedback:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Feedback updated:', feedbackId);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error updating feedback:', msg);
    return { success: false, error: msg };
  }
}
