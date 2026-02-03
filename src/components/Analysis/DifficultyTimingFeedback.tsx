import React, { useMemo } from 'react';
import './DifficultyTimingFeedback.css';
import { StudentFeedback } from '../../types/pipeline';

interface DifficultyTimingFeedbackProps {
  studentFeedback: StudentFeedback[];
  completionTimeEstimate?: {
    meanMinutes: number;
    confidenceInterval95: [number, number];
    perQuestion?: Array<{
      index: number;
      bloomLevel: number;
      estimatedMinutes: number;
      atRiskProfiles: string[];
    }>;
  };
  difficulty?: string;
}

export function DifficultyTimingFeedback({
  studentFeedback,
  completionTimeEstimate,
  difficulty = 'intermediate',
}: DifficultyTimingFeedbackProps) {
  const difficultyColor = {
    easy: '#4caf50',
    intermediate: '#ff9800',
    hard: '#f44336',
  }[difficulty] || '#ff9800';

  const difficultyLabel = {
    easy: 'Easy',
    intermediate: 'Intermediate',
    hard: 'Hard',
  }[difficulty] || 'Intermediate';

  // Identify at-risk profiles from feedback
  const atRiskProfiles = useMemo(() => {
    const profiles = new Set<string>();
    for (const feedback of studentFeedback) {
      if (feedback.atRiskProfile && feedback.atRiskFactors) {
        feedback.atRiskFactors.forEach(f => profiles.add(f));
      }
    }
    return Array.from(profiles);
  }, [studentFeedback]);

  // Calculate average difficulty from feedback
  const avgDifficultyScore = useMemo(() => {
    if (studentFeedback.length === 0) return 0;
    const difficulties = studentFeedback.filter(f => f.difficultySummary).length;
    return ((difficulties / studentFeedback.length) * 100).toFixed(0);
  }, [studentFeedback]);

  return (
    <div className="difficulty-timing-feedback">
      <div className="feedback-section">
        {/* Difficulty Section */}
        <div className="difficulty-card">
          <h3>📊 Assignment Difficulty</h3>
          <div className="difficulty-badge" style={{ backgroundColor: difficultyColor }}>
            {difficultyLabel}
          </div>
          <div className="difficulty-details">
            <p className="difficulty-percent">{avgDifficultyScore}% of students found it challenging</p>
            <p className="difficulty-explanation">
              This assignment requires {difficulty === 'hard' ? 'advanced' : difficulty === 'easy' ? 'foundational' : 'moderate'} cognitive skills.
            </p>
          </div>
        </div>

        {/* Timing Section */}
        {completionTimeEstimate && (
          <div className="timing-card">
            <h3>⏱️ Time Estimates</h3>
            <div className="time-estimate">
              <div className="mean-time">
                <span className="label">Mean Time:</span>
                <span className="value">{completionTimeEstimate.meanMinutes.toFixed(1)} minutes</span>
              </div>
              <div className="confidence-interval">
                <span className="label">95% Confidence:</span>
                <span className="value">
                  {completionTimeEstimate.confidenceInterval95[0].toFixed(1)} - {completionTimeEstimate.confidenceInterval95[1].toFixed(1)} minutes
                </span>
              </div>
            </div>

            {/* Per-Question Breakdown */}
            {completionTimeEstimate.perQuestion && completionTimeEstimate.perQuestion.length > 0 && (
              <div className="per-question-breakdown">
                <h4>Per-Question Estimates</h4>
                <div className="questions-list">
                  {completionTimeEstimate.perQuestion.map((q, idx) => (
                    <div key={idx} className="question-item">
                      <div className="question-header">
                        <span className="question-num">Q{q.index + 1}</span>
                        <span className="bloom-level">Bloom {q.bloomLevel}</span>
                        <span className="time-estimate">{q.estimatedMinutes.toFixed(1)} min</span>
                      </div>
                      <div className="confidence-range">
                        {q.atRiskProfiles.length > 0 && (
                          <span className="at-risk-badge">⚠️ At-Risk: {q.atRiskProfiles.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* At-Risk Profiles Section */}
      {atRiskProfiles.length > 0 && (
        <div className="at-risk-section">
          <h3>⚠️ At-Risk Learner Profiles</h3>
          <div className="profiles-grid">
            {atRiskProfiles.map(profile => (
              <div key={profile} className="profile-badge">
                {profile}
              </div>
            ))}
          </div>
          <p className="at-risk-message">
            These learner profiles may struggle with the complexity or pacing of this assignment.
            Consider providing additional scaffolding or time extensions.
          </p>
        </div>
      )}

      {/* Feedback Summary */}
      <div className="feedback-summary">
        <h3>📝 Persona Feedback Summary</h3>
        <div className="personas-list">
          {studentFeedback.slice(0, 3).map((feedback, idx) => (
            <div key={idx} className="persona-item">
              <div className="persona-name">{feedback.studentPersona}</div>
              <div className="persona-time">
                {feedback.timeEstimate && (
                  <span>⏱️ {feedback.timeEstimate.meanMinutes.toFixed(1)} min ±{
                    (feedback.timeEstimate.confidenceInterval95[1] - feedback.timeEstimate.meanMinutes).toFixed(1)
                  }</span>
                )}
              </div>
              {feedback.atRiskProfile && (
                <div className="persona-risk">⚠️ May struggle with this assignment</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
