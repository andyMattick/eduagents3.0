import { useState } from 'react';
import { AssignmentFeedbackSubmission, ProblemPerformanceFeedback } from '../../types/assignmentFeedback';
import { GeneratedAssignment } from '../../hooks/useUserFlow';
import './AssignmentFeedbackModal.css';

interface AssignmentFeedbackModalProps {
  isOpen: boolean;
  assignment: GeneratedAssignment;
  teacherId: string;
  onClose: () => void;
  onSubmit: (feedback: AssignmentFeedbackSubmission) => Promise<void>;
}

/**
 * Modal for teachers to rate assignment performance
 * Collects per-problem feedback to improve future AI-generated assignments
 */
export function AssignmentFeedbackModal({
  isOpen,
  assignment,
  teacherId,
  onClose,
  onSubmit,
}: AssignmentFeedbackModalProps) {
  const [overallRating, setOverallRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [completionRate, setCompletionRate] = useState(80);
  const [studentCount, setStudentCount] = useState(25);
  const [timeToComplete, setTimeToComplete] = useState(assignment.estimatedTime);
  
  const [strengthsText, setStrengthsText] = useState('');
  const [problemsText, setProblemsText] = useState('');
  const [notesForWriter, setNotesForWriter] = useState('');
  
  const [problemFeedback, setProblemFeedback] = useState<ProblemPerformanceFeedback[]>(
    assignment.sections
      .flatMap(s => s.problems)
      .map(p => ({
        problemId: p.id || '',
        problemText: p.problemText || '',
        rating: 3,
        difficulty: 'just-right',
        clarity: 'very-clear',
      } as ProblemPerformanceFeedback))
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProblemFeedbackChange = (
    index: number,
    field: keyof ProblemPerformanceFeedback,
    value: any
  ) => {
    const updated = [...problemFeedback];
    (updated[index] as any)[field] = value;
    setProblemFeedback(updated);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const feedback: AssignmentFeedbackSubmission = {
        assignmentId: assignment.assignmentId || '',
        teacherId,
        overallRating,
        completionRate,
        problemFeedback,
        strengthsObserved: strengthsText
          .split('\n')
          .filter(s => s.trim())
          .slice(0, 5),
        problemsObserved: problemsText
          .split('\n')
          .filter(s => s.trim())
          .slice(0, 5),
        notesForWriter,
        submittedAt: new Date().toISOString(),
        studentCount,
        timeToCompleteMinutes: timeToComplete,
      };

      await onSubmit(feedback);
      
      // Show success message
      alert('✅ Feedback submitted! The writer will use this to improve future assignments.');
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setSubmitError(msg);
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2>📋 Rate This Assignment</h2>
          <p className="subtitle">Help the writer improve future assignments</p>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="feedback-modal-content">
          {/* Overall Rating */}
          <div className="form-section">
            <h3>Overall Performance</h3>
            
            <div className="form-group">
              <label>How well did this assignment work? ⭐</label>
              <div className="rating-buttons">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    className={`rating-btn ${overallRating === rating ? 'selected' : ''}`}
                    onClick={() => setOverallRating(rating as 1 | 2 | 3 | 4 | 5)}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <small>1 = Poor, 5 = Excellent</small>
            </div>

            <div className="form-group">
              <label>Student Completion Rate (%)</label>
              <div className="slider-group">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={completionRate}
                  onChange={(e) => setCompletionRate(parseInt(e.target.value))}
                  className="slider"
                />
                <span className="slider-value">{completionRate}%</span>
              </div>
            </div>

            <div className="form-group">
              <label>Number of Students</label>
              <input
                type="number"
                min="1"
                max="500"
                value={studentCount}
                onChange={(e) => setStudentCount(parseInt(e.target.value) || 1)}
                className="input-number"
              />
            </div>

            <div className="form-group">
              <label>Actual Time to Complete (minutes)</label>
              <input
                type="number"
                min="1"
                value={timeToComplete}
                onChange={(e) => setTimeToComplete(parseInt(e.target.value) || 30)}
                className="input-number"
              />
              <small>Estimated: {assignment.estimatedTime} min</small>
            </div>
          </div>

          {/* Per-Problem Feedback */}
          <div className="form-section">
            <h3>Individual Problem Feedback</h3>
            <div className="problems-grid">
              {problemFeedback.map((feedback, idx) => (
                <div key={idx} className="problem-feedback-card">
                  <div className="problem-header">
                    <label className="problem-id">{feedback.problemId}</label>
                    <div className="rating-mini">
                      {[1, 2, 3, 4, 5].map(r => (
                        <button
                          key={r}
                          className={`star ${feedback.rating === r ? 'selected' : ''}`}
                          onClick={() => handleProblemFeedbackChange(idx, 'rating', r as 1 | 2 | 3 | 4 | 5)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="problem-controls">
                    <select
                      value={feedback.difficulty}
                      onChange={(e) =>
                        handleProblemFeedbackChange(
                          idx,
                          'difficulty',
                          e.target.value as 'too-easy' | 'just-right' | 'too-hard'
                        )
                      }
                      className="select-small"
                    >
                      <option value="too-easy">Too Easy</option>
                      <option value="just-right">Just Right</option>
                      <option value="too-hard">Too Hard</option>
                    </select>

                    <select
                      value={feedback.clarity}
                      onChange={(e) =>
                        handleProblemFeedbackChange(
                          idx,
                          'clarity',
                          e.target.value as 'unclear' | 'somewhat-clear' | 'very-clear'
                        )
                      }
                      className="select-small"
                    >
                      <option value="unclear">Unclear</option>
                      <option value="somewhat-clear">Somewhat Clear</option>
                      <option value="very-clear">Very Clear</option>
                    </select>
                  </div>

                  <textarea
                    placeholder="e.g., 'Students found this confusing...'"
                    value={feedback.observation || ''}
                    onChange={(e) =>
                      handleProblemFeedbackChange(idx, 'observation', e.target.value)
                    }
                    className="textarea-small"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Problems */}
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>What Worked Well? ✅</label>
                <textarea
                  placeholder="One item per line. E.g.:'Good difficulty progression' 'Clear instructions'"
                  value={strengthsText}
                  onChange={(e) => setStrengthsText(e.target.value)}
                  className="textarea"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>What Needs Improvement? ⚠️</label>
                <textarea
                  placeholder="One item per line. E.g.: 'Question 3 was unclear' 'Too long overall'"
                  value={problemsText}
                  onChange={(e) => setProblemsText(e.target.value)}
                  className="textarea"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Notes for Writer */}
          <div className="form-section">
            <h3>Notes for the Writer 💌</h3>
            <textarea
              placeholder="Any specific guidance for improving future assignments from this assignment's performance data..."
              value={notesForWriter}
              onChange={(e) => setNotesForWriter(e.target.value)}
              className="textarea"
              rows={4}
            />
          </div>

          {submitError && <div className="error-message">❌ {submitError}</div>}
        </div>

        <div className="feedback-modal-footer">
          <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : '✅ Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
