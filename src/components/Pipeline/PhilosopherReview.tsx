/**
 * Philosopher Review Component
 *
 * Displays the Philosopher's analysis results including:
 * - Ranked feedback items with priority and actionability
 * - Visual analytics (heat maps, charts, risk matrices)
 *
 * Teachers can accept/reject before proceeding to rewrite
 */

import React, { useState } from 'react';
import { TeacherFeedbackOptions, FeedbackItem } from '../../types/pipeline';
import { PhilosophersVisualsPanel } from './PhilosophersVisualsPanel';
import styles from './PhilosopherReview.module.css';

interface PhilosopherReviewProps {
  analysis: TeacherFeedbackOptions;
  isLoading?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onReanalyze?: () => void;
}

export function PhilosopherReview({
  analysis,
  isLoading = false,
  onAccept,
  onReject,
  onReanalyze,
}: PhilosopherReviewProps) {
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feedback' | 'visualizations'>('feedback');

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Philosopher is analyzing your assignment...</p>
        </div>
      </div>
    );
  }

  if (!analysis || !analysis.rankedFeedback || analysis.rankedFeedback.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>No analysis available</h2>
          <p>The Philosopher did not return any feedback. Please try again.</p>
          <button onClick={onReanalyze} className={styles.buttonPrimary}>
            Re-analyze
          </button>
        </div>
      </div>
    );
  }

  const highPriorityCount = analysis.rankedFeedback.filter(
    (item) => item.priority === 'high'
  ).length;
  const mediumPriorityCount = analysis.rankedFeedback.filter(
    (item) => item.priority === 'medium'
  ).length;

  const toggleFeedbackExpansion = (id: string) => {
    setExpandedFeedbackId(expandedFeedbackId === id ? null : id);
  };

  const getFeedbackIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '•';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      clarity: '💡',
      engagement: '⚡',
      accessibility: '♿',
      difficulty: '📈',
      pacing: '⏱️',
      coverage: '🎯',
    };
    return icons[category] || '•';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Philosopher Review</h1>
        <p className={styles.subtitle}>
          The Philosopher has analyzed your assignment. Review the recommendations below.
        </p>
      </div>

      {/* Summary Stats */}
      <div className={styles.summaryStats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{analysis.rankedFeedback.length}</div>
          <div className={styles.statLabel}>Total Recommendations</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#FF6B6B' }}>
            {highPriorityCount}
          </div>
          <div className={styles.statLabel}>High Priority</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#FFD700' }}>
            {mediumPriorityCount}
          </div>
          <div className={styles.statLabel}>Medium Priority</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'feedback' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          📋 Ranked Feedback
        </button>
        {analysis.visualizations && Object.keys(analysis.visualizations).length > 0 && (
          <button
            className={`${styles.tab} ${activeTab === 'visualizations' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('visualizations')}
          >
            📊 Visual Analytics
          </button>
        )}
      </div>

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className={styles.feedbackSection}>
          <div className={styles.feedbackList}>
            {analysis.rankedFeedback.map((item, idx) => (
              <div key={item.id || idx} className={`${styles.feedbackItem} ${styles[`priority_${item.priority}`]}`}>
                <div
                  className={styles.feedbackHeader}
                  onClick={() => toggleFeedbackExpansion(item.id || idx.toString())}
                >
                  <div className={styles.feedbackTitle}>
                    <span className={styles.priorityIcon}>{getFeedbackIcon(item.priority)}</span>
                    <span className={styles.categoryIcon}>{getCategoryIcon(item.category)}</span>
                    <span className={styles.title}>{item.title}</span>
                  </div>
                  <div className={styles.expandIcon}>
                    {expandedFeedbackId === (item.id || idx.toString()) ? '▼' : '▶'}
                  </div>
                </div>

                {expandedFeedbackId === (item.id || idx.toString()) && (
                  <div className={styles.feedbackContent}>
                    <p className={styles.description}>{item.description}</p>

                    {item.affectedProblems && item.affectedProblems.length > 0 && (
                      <div className={styles.affectedProblems}>
                        <strong>Affected Problems:</strong>
                        <ul>
                          {item.affectedProblems.slice(0, 5).map((problemId, i) => (
                            <li key={i}>{problemId}</li>
                          ))}
                          {item.affectedProblems.length > 5 && (
                            <li>... and {item.affectedProblems.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className={styles.recommendation}>
                      <strong>Recommendation:</strong>
                      <p>{item.recommendation}</p>
                    </div>

                    {item.estimatedImpact && (
                      <div className={styles.impact}>
                        <strong>Estimated Impact:</strong>
                        <span className={styles[`impact_${item.estimatedImpact}`]}>
                          {item.estimatedImpact}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visualizations Tab */}
      {activeTab === 'visualizations' && (
        <div className={styles.visualizationSection}>
          {/* New Interactive Visualizations Panel */}
          <PhilosophersVisualsPanel
            feedback={analysis?.rankedFeedback}
            studentFeedback={analysis?.selectedFeedback}
          />

          {/* Legacy visualization section - if data exists */}
          {analysis.visualizations && Object.keys(analysis.visualizations).length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e9ecef' }}>
                Legacy Visualizations
              </h3>
              <div className={styles.chartGrid}>
            {analysis.visualizations.clusterHeatMap && (
              <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Cluster Heat Map</h3>
                <div className={styles.chartContent}>
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(analysis.visualizations.clusterHeatMap)}`}
                    alt="Cluster Heat Map"
                    className={styles.chartImage}
                  />
                </div>
                <p className={styles.chartDescription}>
                  Shows how students cluster by problem difficulty. Red = struggling, Green = succeeding.
                </p>
              </div>
            )}

            {analysis.visualizations.bloomComplexityScatter && (
              <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Bloom Level vs. Complexity</h3>
                <div className={styles.chartContent}>
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(analysis.visualizations.bloomComplexityScatter)}`}
                    alt="Bloom Complexity Scatter"
                    className={styles.chartImage}
                  />
                </div>
                <p className={styles.chartDescription}>
                  Each circle is one problem. Upper-right = hardest. Check for balanced distribution.
                </p>
              </div>
            )}

            {analysis.visualizations.confusionDensityMap && (
              <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Confusion Hotspots</h3>
                <div className={styles.chartContent}>
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(analysis.visualizations.confusionDensityMap)}`}
                    alt="Confusion Density Map"
                    className={styles.chartImage}
                  />
                </div>
                <p className={styles.chartDescription}>
                  Darker areas indicate more student confusion. Focus rewrites here.
                </p>
              </div>
            )}

            {analysis.visualizations.fatigueCurve && (
              <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Cumulative Fatigue</h3>
                <div className={styles.chartContent}>
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(analysis.visualizations.fatigueCurve)}`}
                    alt="Fatigue Curve"
                    className={styles.chartImage}
                  />
                </div>
                <p className={styles.chartDescription}>
                  Steep curves indicate students tiring quickly. Consider breaking into shorter sessions.
                </p>
              </div>
            )}

            {analysis.visualizations.topicRadarChart && (
              <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Topic Coverage by Bloom</h3>
                <div className={styles.chartContent}>
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(analysis.visualizations.topicRadarChart)}`}
                    alt="Topic Radar Chart"
                    className={styles.chartImage}
                  />
                </div>
                <p className={styles.chartDescription}>
                  Outer edge = comprehensive coverage. Spotty = gaps in topic/Bloom combinations.
                </p>
              </div>
            )}

            {analysis.visualizations.sectionRiskMatrix && (
              <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Section Risk Assessment</h3>
                <div className={styles.chartContent}>
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(analysis.visualizations.sectionRiskMatrix)}`}
                    alt="Section Risk Matrix"
                    className={styles.chartImage}
                  />
                </div>
                <p className={styles.chartDescription}>
                  Green = safe. Yellow = caution. Red = high risk (hard + students tired).
                </p>
              </div>
            )}
          </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button onClick={onReject} className={styles.buttonSecondary}>
          ✗ Reject & Re-analyze
        </button>
        <button onClick={onReanalyze} className={styles.buttonSecondary}>
          🔄 Re-analyze
        </button>
        <button onClick={onAccept} className={styles.buttonPrimary}>
          ✓ Accept & Proceed to Rewrite
        </button>
      </div>

      {/* Help Section */}
      <details className={styles.helpSection}>
        <summary>How to use this review</summary>
        <div className={styles.helpContent}>
          <h4>Understanding the Recommendations</h4>
          <ul>
            <li>
              <strong>Priority:</strong> High (red) = implement first, Medium (yellow) = good to have, Low (green) = optional
            </li>
            <li>
              <strong>Category:</strong> Describes the type of improvement (clarity, engagement, etc.)
            </li>
            <li>
              <strong>Estimated Impact:</strong> How much improvement you can expect if you implement this change
            </li>
          </ul>
          <h4>Interpreting Visualizations</h4>
          <p>
            There are 6 charts available under the "Visual Analytics" tab. Each shows a different aspect of your
            assignment's complexity and student engagement profile. Use them together to identify patterns.
          </p>
          <h4>Next Steps</h4>
          <p>
            Once you accept these recommendations, the system will generate a rewritten version of your assignment
            incorporating the suggested changes. You can compare the original and rewritten versions side-by-side.
          </p>
        </div>
      </details>
    </div>
  );
}
