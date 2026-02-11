import React, { useState } from 'react';
import { GeneratedAssignment } from '../../hooks/useUserFlow';
import { StudentFeedback } from '../../types/pipeline';
import { useRewrite } from '../../hooks/useRewrite';
import './RewriteComparisonStep.css';

interface RewriteComparisonStepProps {
  originalAssignment: GeneratedAssignment;
  rewrittenAssignment: GeneratedAssignment;
  originalFeedback: StudentFeedback[];
  rewrittenFeedback?: StudentFeedback[];
  onRetest: () => void;
  onRewrite: () => void;
  onSave: () => void;
  isLoading?: boolean;
}

interface Metric {
  name: string;
  original: number;
  rewritten: number;
  unit: string;
  improvement: number;
}

export function RewriteComparisonStep({
  originalAssignment,
  rewrittenAssignment,
  originalFeedback,
  rewrittenFeedback,
  onRetest,
  onRewrite,
  onSave,
  isLoading = false,
}: RewriteComparisonStepProps) {
  const [viewMode, setViewMode] = useState<'metrics' | 'side-by-side' | 'details'>('metrics');
  const [showRewritePrompt, setShowRewritePrompt] = useState(false);
  const { performRewrite, isRewriting, rewriteError } = useRewrite();

  // Handle "Rewrite Again" - calls AI to generate another improved version
  const handleRewriteAgain = async () => {
    if (!originalAssignment) return;

    setShowRewritePrompt(false);
    const result = await performRewrite(rewrittenAssignment, rewrittenFeedback || originalFeedback);

    if (result) {
      // Trigger parent to run simulation on the new version
      // In a real scenario, this would update state and trigger re-simulation
      onRewrite();
    }
  };

  // Calculate key metrics
  const calculateMetrics = (): Metric[] => {
    const origProblems = originalAssignment.sections.flatMap(s => s.problems);
    const origWords = origProblems.reduce((sum, p) => sum + (p.problemText?.split(/\s+/).length || 0), 0);
    const origComplexity = origProblems.reduce((sum, p) => sum + (p.rawComplexity || 0.5), 0) / origProblems.length;
    const origNovelty = origProblems.reduce((sum, p) => sum + (p.rawNovelty || 0.5), 0) / origProblems.length;

    const rewriteProblems = rewrittenAssignment.sections.flatMap(s => s.problems);
    const rewriteWords = rewriteProblems.reduce((sum, p) => sum + (p.problemText?.split(/\s+/).length || 0), 0);
    const rewriteComplexity = rewriteProblems.reduce((sum, p) => sum + (p.rawComplexity || 0.5), 0) / rewriteProblems.length;
    const rewriteNovelty = rewriteProblems.reduce((sum, p) => sum + (p.rawNovelty || 0.5), 0) / rewriteProblems.length;

    return [
      {
        name: 'Total Questions',
        original: origProblems.length,
        rewritten: rewriteProblems.length,
        unit: 'problems',
        improvement: ((rewriteProblems.length - origProblems.length) / origProblems.length) * 100,
      },
      {
        name: 'Total Words',
        original: origWords,
        rewritten: rewriteWords,
        unit: 'words',
        improvement: ((rewriteWords - origWords) / origWords) * 100,
      },
      {
        name: 'Avg Complexity',
        original: origComplexity,
        rewritten: rewriteComplexity,
        unit: '0-1 scale',
        improvement: ((rewriteComplexity - origComplexity) / origComplexity) * 100,
      },
      {
        name: 'Avg Novelty',
        original: origNovelty,
        rewritten: rewriteNovelty,
        unit: '0-1 scale',
        improvement: ((rewriteNovelty - origNovelty) / origNovelty) * 100,
      },
      {
        name: 'Est. Duration',
        original: originalAssignment.estimatedTime || 60,
        rewritten: rewrittenAssignment.estimatedTime || 60,
        unit: 'minutes',
        improvement: ((rewrittenAssignment.estimatedTime || 60 - (originalAssignment.estimatedTime || 60)) / (originalAssignment.estimatedTime || 60)) * 100,
      },
    ];
  };

  const metrics = calculateMetrics();

  const getImprovementColor = (improvement: number) => {
    if (improvement > 5) return '#28a745'; // Green - improved
    if (improvement < -5) return '#dc3545'; // Red - worse
    return '#ffc107'; // Yellow - minimal change
  };

  const getImprovementLabel = (improvement: number) => {
    if (improvement > 5) return '📈 Better';
    if (improvement < -5) return '📉 Worse';
    return '➡️ Similar';
  };

  return (
    <div className="rewrite-comparison-step">
      <div className="comparison-header">
        <h1>✨ Rewrite Comparison</h1>
        <p>Review improvements and decide your next step</p>
      </div>

      {/* View Mode Toggle */}
      <div className="view-mode-toggle">
        <button
          className={`mode-button ${viewMode === 'metrics' ? 'active' : ''}`}
          onClick={() => setViewMode('metrics')}
        >
          📊 Metrics Comparison
        </button>
        <button
          className={`mode-button ${viewMode === 'side-by-side' ? 'active' : ''}`}
          onClick={() => setViewMode('side-by-side')}
        >
          ↔️ Side by Side
        </button>
        <button
          className={`mode-button ${viewMode === 'details' ? 'active' : ''}`}
          onClick={() => setViewMode('details')}
        >
          🔍 Details
        </button>
      </div>

      {/* Metrics View */}
      {viewMode === 'metrics' && (
        <div className="metrics-comparison">
          <h3>Key Metrics Comparison</h3>
          <div className="metrics-grid">
            {metrics.map((metric, idx) => (
              <div key={idx} className="metric-card">
                <h4>{metric.name}</h4>
                <div className="metric-values">
                  <div className="value original">
                    <span className="label">Original:</span>
                    <span className="number">
                      {typeof metric.original === 'number' && metric.original < 1
                        ? metric.original.toFixed(2)
                        : Math.round(metric.original)}
                    </span>
                    <span className="unit">{metric.unit}</span>
                  </div>
                  <div className="arrow">→</div>
                  <div className="value rewritten">
                    <span className="label">Rewritten:</span>
                    <span className="number">
                      {typeof metric.rewritten === 'number' && metric.rewritten < 1
                        ? metric.rewritten.toFixed(2)
                        : Math.round(metric.rewritten)}
                    </span>
                    <span className="unit">{metric.unit}</span>
                  </div>
                </div>
                <div
                  className="improvement-badge"
                  style={{ backgroundColor: getImprovementColor(metric.improvement) }}
                >
                  <span>{getImprovementLabel(metric.improvement)}</span>
                  <span>{Math.abs(metric.improvement).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side by Side View */}
      {viewMode === 'side-by-side' && (
        <div className="side-by-side-comparison">
          <div className="comparison-container">
            <div className="assignment-column">
              <h3>📋 Original Assignment</h3>
              <div className="assignment-summary">
                <h4>{originalAssignment.title}</h4>
                <p><strong>Type:</strong> {originalAssignment.assignmentType}</p>
                <p><strong>Sections:</strong> {originalAssignment.sections.length}</p>
                <p>
                  <strong>Questions:</strong>{' '}
                  {originalAssignment.sections.reduce((sum, s) => sum + s.problems.length, 0)}
                </p>
                <p><strong>Est. Time:</strong> {originalAssignment.estimatedTime} min</p>
                <div className="problems-preview">
                  <strong>First 3 Problems:</strong>
                  {originalAssignment.sections[0]?.problems.slice(0, 3).map((p, i) => (
                    <div key={i} className="problem-preview-item">
                      Q{i + 1}: {p.problemText?.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="vs-divider">VS</div>

            <div className="assignment-column">
              <h3>✨ Rewritten Assignment</h3>
              <div className="assignment-summary">
                <h4>{rewrittenAssignment.title}</h4>
                <p><strong>Type:</strong> {rewrittenAssignment.assignmentType}</p>
                <p><strong>Sections:</strong> {rewrittenAssignment.sections.length}</p>
                <p>
                  <strong>Questions:</strong>{' '}
                  {rewrittenAssignment.sections.reduce((sum, s) => sum + s.problems.length, 0)}
                </p>
                <p><strong>Est. Time:</strong> {rewrittenAssignment.estimatedTime} min</p>
                <div className="problems-preview">
                  <strong>First 3 Problems:</strong>
                  {rewrittenAssignment.sections[0]?.problems.slice(0, 3).map((p, i) => (
                    <div key={i} className="problem-preview-item">
                      Q{i + 1}: {p.problemText?.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details View */}
      {viewMode === 'details' && (
        <div className="details-comparison">
          <div className="detail-section">
            <h3>Bloom's Distribution Comparison</h3>
            <div className="bloom-comparison">
              <div className="bloom-column">
                <h4>Original</h4>
                <div className="bloom-items">
                  {Object.entries(originalAssignment.bloomDistribution || {}).map(([level, count]) => (
                    <div key={level} className="bloom-item">
                      <span>{level}:</span>
                      <span className="count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bloom-column">
                <h4>Rewritten</h4>
                <div className="bloom-items">
                  {Object.entries(rewrittenAssignment.bloomDistribution || {}).map(([level, count]) => (
                    <div key={level} className="bloom-item">
                      <span>{level}:</span>
                      <span className="count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {rewrittenFeedback && (
            <div className="detail-section">
              <h3>Updated Student Feedback</h3>
              <div className="feedback-summary">
                <p>🎯 Retest completed with new assignment version</p>
                <div className="feedback-stats">
                  <div className="stat">
                    <span className="label">Total Feedback Items:</span>
                    <span className="value">{rewrittenFeedback.length}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Strengths:</span>
                    <span className="value">
                      {rewrittenFeedback.filter(f => f.feedbackType === 'strength').length}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Weaknesses:</span>
                    <span className="value">
                      {rewrittenFeedback.filter(f => f.feedbackType === 'weakness').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="comparison-actions">
        <div className="action-group">
          <button
            onClick={onRetest}
            disabled={isLoading}
            className="btn-secondary"
          >
            🔄 Retest This Version
          </button>
          <p className="action-description">Run simulation again to see updated feedback</p>
        </div>

        <div className="action-group">
          <button
            onClick={handleRewriteAgain}
            disabled={isLoading || isRewriting}
            className="btn-secondary"
          >
            {isRewriting ? '🔄 Rewriting...' : '✏️ Rewrite Again'}
          </button>
          <p className="action-description">Create another improved version based on feedback</p>
          {rewriteError && (
            <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Error: {rewriteError}
            </p>
          )}
        </div>

        <div className="action-group">
          <button
            onClick={onSave}
            disabled={isLoading}
            className="btn-primary"
          >
            💾 Save This Version
          </button>
          <p className="action-description">Accept this version and save to dashboard</p>
        </div>
      </div>

      {isLoading || isRewriting && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>{isRewriting ? 'AI is improving your assignment...' : 'Processing...'}</p>
        </div>
      )}
    </div>
  );
}
