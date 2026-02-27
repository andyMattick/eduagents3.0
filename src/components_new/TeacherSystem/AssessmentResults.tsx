import React, { useState, useEffect } from 'react';
import { AssessmentStats, AssignmentSummary } from '../../types/teacherSystem';
import './AssessmentResults.css';

interface AssessmentResultsProps {
  assignment: AssignmentSummary;
  stats: AssessmentStats;
  onRewriteAssessment: () => Promise<void>;
  onTrainWriter: () => Promise<void>;
  isLoading?: boolean;
}

export const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  assignment,
  stats,
  onRewriteAssessment,
  onTrainWriter,
  isLoading = false,
}) => {
  const [expandedProblemId, setExpandedProblemId] = useState<string | null>(null);
  const [rewriteInProgress, setRewriteInProgress] = useState(false);
  const [trainInProgress, setTrainInProgress] = useState(false);
  const [trainCompleted, setTrainCompleted] = useState(false);

  const handleRewrite = async () => {
    try {
      setRewriteInProgress(true);
      await onRewriteAssessment();
    } finally {
      setRewriteInProgress(false);
    }
  };

  const handleTrain = async () => {
    try {
      setTrainInProgress(true);
      await onTrainWriter();
      setTrainCompleted(true);
    } finally {
      setTrainInProgress(false);
    }
  };

  return (
    <div className="assessment-results">
      {/* Header */}
      <div className="results-header">
        <h2>Assessment Results: {assignment.title}</h2>
        <p className="results-subtitle">Real stats from {stats.totalSubmissions} student submissions</p>
      </div>

      {/* Summary Stats Grid */}
      <div className="stats-grid">
        {/* Score Stats */}
        <div className="stat-card">
          <h3>📊 Score Range</h3>
          <div className="stat-value">
            <span className="range">{stats.scoreRange.min}-{stats.scoreRange.max}%</span>
            <span className="sublabel">Range</span>
          </div>
          <div className="stat-details">
            <div className="detail-row">
              <span className="label">Average:</span>
              <span className="value">{stats.scoreRange.average.toFixed(1)}%</span>
            </div>
            <div className="detail-row">
              <span className="label">Median:</span>
              <span className="value">{stats.scoreRange.median.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Time Stats */}
        <div className="stat-card">
          <h3>⏱️ Time Range</h3>
          <div className="stat-value">
            <span className="range">{stats.timeRange.minMinutes}-{stats.timeRange.maxMinutes} min</span>
            <span className="sublabel">Range</span>
          </div>
          <div className="stat-details">
            <div className="detail-row">
              <span className="label">Average:</span>
              <span className="value">{stats.timeRange.averageMinutes.toFixed(1)} min</span>
            </div>
            <div className="detail-row">
              <span className="label">Median:</span>
              <span className="value">{stats.timeRange.medianMinutes.toFixed(1)} min</span>
            </div>
          </div>
        </div>

        {/* Submissions */}
        <div className="stat-card">
          <h3>👥 Submissions</h3>
          <div className="stat-value">
            <span className="range">{stats.totalSubmissions}</span>
            <span className="sublabel">Students</span>
          </div>
          <div className="stat-details">
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className="value">Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bloom Performance */}
      <section className="bloom-performance">
        <h3>🎯 Performance by Bloom Level</h3>
        <div className="bloom-bars">
          {Object.entries(stats.bloomPerformance).map(([bloom, perf]) => (
            <div key={bloom} className="bloom-bar-item">
              <div className="bloom-label">
                <span className="bloom-name">{bloom}</span>
                <span className="problem-count">({perf.problemCount})</span>
              </div>
              <div className="bloom-bar-container">
                <div
                  className="bloom-bar-fill"
                  style={{ width: `${perf.averageCorrectPercentage}%` }}
                />
                <span className="bloom-percentage">
                  {perf.averageCorrectPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Per-Problem Analysis */}
      <section className="problem-analysis">
        <h3>❓ Problem-by-Problem Analysis</h3>
        <div className="problems-list">
          {stats.problemStats.map((problem, idx) => (
            <div
              key={problem.problemId}
              className={`problem-card ${expandedProblemId === problem.problemId ? 'expanded' : ''}`}
            >
              <div
                className="problem-header"
                onClick={() =>
                  setExpandedProblemId(
                    expandedProblemId === problem.problemId ? null : problem.problemId
                  )
                }
              >
                <div className="problem-title">
                  <span className="problem-number">Q{idx + 1}</span>
                  <span className="problem-text">{problem.problemText.substring(0, 60)}...</span>
                </div>
                <div className="problem-score">
                  <span className={`score-badge ${problem.correctPercentage >= 70 ? 'good' : problem.correctPercentage >= 50 ? 'okay' : 'poor'}`}>
                    {problem.correctPercentage.toFixed(0)}%
                  </span>
                  <span className="toggle-icon">
                    {expandedProblemId === problem.problemId ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedProblemId === problem.problemId && (
                <div className="problem-details">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Correct:</span>
                      <span className="value">{problem.correctCount}/{problem.totalAttempts}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Avg Time:</span>
                      <span className="value">{problem.averageTimeSeconds}s</span>
                    </div>
                  </div>

                  {problem.commonMistakeTypes.length > 0 && (
                    <div className="mistakes-section">
                      <h4>Common Mistakes</h4>
                      <div className="mistake-types">
                        {problem.commonMistakeTypes.map(mistake => (
                          <div key={mistake.type} className="mistake-item">
                            <span className="mistake-type">{mistake.type}:</span>
                            <span className="mistake-count">{mistake.count} students</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {problem.missedByStudents.length > 0 && (
                    <div className="missed-students">
                      <h4>Missed by:</h4>
                      <p className="student-list">{problem.missedByStudents.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      {stats.recommendations.suggestedActions.length > 0 && (
        <section className="recommendations">
          <h3>💡 AI Recommendations</h3>
          <div className="recommendation-items">
            {stats.recommendations.problemsNeedingRework.length > 0 && (
              <div className="rec-item">
                <span className="rec-icon">⚠️</span>
                <div>
                  <strong>Problems Needing Rework:</strong>
                  <p>{stats.recommendations.problemsNeedingRework.length} problems had low success rates</p>
                </div>
              </div>
            )}
            {stats.recommendations.bloomLevelsNeedingRebalance.length > 0 && (
              <div className="rec-item">
                <span className="rec-icon">⚖️</span>
                <div>
                  <strong>Rebalance Bloom Levels:</strong>
                  <p>Consider adjusting {stats.recommendations.bloomLevelsNeedingRebalance.join(', ')}</p>
                </div>
              </div>
            )}
            {stats.recommendations.suggestedActions.map((action, idx) => (
              <div key={idx} className="rec-item">
                <span className="rec-icon">✨</span>
                <div>{action}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <section className="results-actions">
        <h3>Next Steps</h3>
        <div className="action-buttons">
          {!trainCompleted ? (
            <>
              <button
                onClick={handleTrain}
                disabled={trainInProgress || isLoading}
                className="btn-action btn-train"
              >
                {trainInProgress ? '📚 Training Writer...' : '📚 Train Writer'}
              </button>
              <p className="action-description">Uses these results to improve the AI writing model</p>
            </>
          ) : (
            <>
              <div className="trained-badge">
                <span className="badge-checkmark">✓</span>
                <span className="badge-text">Writer trained on this assessment</span>
              </div>
              <p className="action-description">The AI model has been updated with data from this assessment</p>
            </>
          )}

          <button
            onClick={handleRewrite}
            disabled={rewriteInProgress || isLoading}
            className="btn-action btn-rewrite"
          >
            {rewriteInProgress ? '✏️ Rewriting...' : '✏️ Rewrite Assessment'}
          </button>
          <p className="action-description">Creates an improved version based on student performance</p>
        </div>
      </section>
    </div>
  );
};

export default AssessmentResults;
