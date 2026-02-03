import React, { useMemo } from 'react';
import '../Analysis/ClassCompletionSummary.css';

interface ClassCompletionData {
  averageCompletionPercent: number;
  medianCompletionPercent: number;
  averageEstimatedGrade: string;
  completionDistribution: {
    excellent: number;
    good: number;
    partial: number;
    poor: number;
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

interface ClassCompletionSummaryProps {
  classSummary: ClassCompletionData;
  totalStudents: number;
}

const GRADE_COLORS: Record<string, string> = {
  'A': '#4caf50',
  'B': '#8bc34a',
  'C': '#ff9800',
  'D': '#f44336',
  'F': '#d32f2f'
};

const RISK_COLORS: Record<string, string> = {
  'low': '#4caf50',
  'medium': '#ff9800',
  'high': '#f44336'
};

/**
 * ClassCompletionSummary Component
 * Displays aggregate completion data for the entire class
 */
export const ClassCompletionSummary: React.FC<ClassCompletionSummaryProps> = ({
  classSummary,
  totalStudents
}) => {
  
  // Calculate percentages
  const distribution = classSummary.completionDistribution;
  const totalCount = distribution.excellent + distribution.good + distribution.partial + distribution.poor;
  
  const percentages = {
    excellent: totalCount > 0 ? Math.round((distribution.excellent / totalCount) * 100) : 0,
    good: totalCount > 0 ? Math.round((distribution.good / totalCount) * 100) : 0,
    partial: totalCount > 0 ? Math.round((distribution.partial / totalCount) * 100) : 0,
    poor: totalCount > 0 ? Math.round((distribution.poor / totalCount) * 100) : 0
  };

  // Sort at-risk profiles by severity
  const atRiskBySeverity = useMemo(
    () => [...classSummary.atRiskProfiles].sort((a, b) => {
      const riskOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }),
    [classSummary]
  );

  // Calculate class health
  const classHealth = calculateClassHealth(classSummary);

  return (
    <div className="class-completion-summary">
      <div className="ccs-header">
        <h3>📈 Class-Level Completion Summary</h3>
        <p className="ccs-subtitle">Aggregate analysis across all simulated students</p>
      </div>

      {/* Health Indicator */}
      <div className={`ccs-health ccs-health-${classHealth.level}`}>
        <div className="ccsh-indicator">
          <span className="ccsh-emoji">{classHealth.emoji}</span>
          <span className="ccsh-label">{classHealth.label}</span>
        </div>
        <p className="ccsh-message">{classHealth.message}</p>
      </div>

      <div className="ccs-grid">
        {/* Summary Statistics */}
        <div className="ccs-card ccs-stats">
          <h4 className="ccsc-title">Summary Statistics</h4>
          
          <div className="ccss-stat">
            <span className="ccss-label">Average Completion</span>
            <span className="ccss-value">{classSummary.averageCompletionPercent}%</span>
            <div className="ccss-bar">
              <div
                className="ccss-fill"
                style={{
                  width: `${classSummary.averageCompletionPercent}%`,
                  backgroundColor: getCompletionColor(classSummary.averageCompletionPercent)
                }}
              />
            </div>
          </div>

          <div className="ccss-stat">
            <span className="ccss-label">Median Completion</span>
            <span className="ccss-value">{classSummary.medianCompletionPercent}%</span>
          </div>

          <div className="ccss-stat">
            <span className="ccss-label">Average Grade</span>
            <span 
              className="ccss-value ccss-grade"
              style={{ color: GRADE_COLORS[classSummary.averageEstimatedGrade] }}
            >
              {classSummary.averageEstimatedGrade}
            </span>
          </div>
        </div>

        {/* Completion Distribution */}
        <div className="ccs-card ccs-distribution">
          <h4 className="ccsc-title">Completion Distribution</h4>
          
          <div className="ccsd-row">
            <div className="ccsd-category">
              <div className="ccsd-bar-container">
                <div
                  className="ccsd-bar"
                  style={{
                    width: `${percentages.excellent}%`,
                    backgroundColor: '#4caf50',
                    minWidth: percentages.excellent > 0 ? '2px' : '0'
                  }}
                />
              </div>
              <div className="ccsd-label">Excellent (90-100%)</div>
              <div className="ccsd-count">{distribution.excellent} ({percentages.excellent}%)</div>
            </div>
          </div>

          <div className="ccsd-row">
            <div className="ccsd-category">
              <div className="ccsd-bar-container">
                <div
                  className="ccsd-bar"
                  style={{
                    width: `${percentages.good}%`,
                    backgroundColor: '#8bc34a',
                    minWidth: percentages.good > 0 ? '2px' : '0'
                  }}
                />
              </div>
              <div className="ccsd-label">Good (70-89%)</div>
              <div className="ccsd-count">{distribution.good} ({percentages.good}%)</div>
            </div>
          </div>

          <div className="ccsd-row">
            <div className="ccsd-category">
              <div className="ccsd-bar-container">
                <div
                  className="ccsd-bar"
                  style={{
                    width: `${percentages.partial}%`,
                    backgroundColor: '#ff9800',
                    minWidth: percentages.partial > 0 ? '2px' : '0'
                  }}
                />
              </div>
              <div className="ccsd-label">Partial (50-69%)</div>
              <div className="ccsd-count">{distribution.partial} ({percentages.partial}%)</div>
            </div>
          </div>

          <div className="ccsd-row">
            <div className="ccsd-category">
              <div className="ccsd-bar-container">
                <div
                  className="ccsd-bar"
                  style={{
                    width: `${percentages.poor}%`,
                    backgroundColor: '#f44336',
                    minWidth: percentages.poor > 0 ? '2px' : '0'
                  }}
                />
              </div>
              <div className="ccsd-label">Poor (&lt;50%)</div>
              <div className="ccsd-count">{distribution.poor} ({percentages.poor}%)</div>
            </div>
          </div>
        </div>

        {/* Most Skipped Questions */}
        {classSummary.mostSkippedQuestions.length > 0 && (
          <div className="ccs-card ccs-skipped">
            <h4 className="ccsc-title">Most Skipped Questions</h4>
            
            <div className="ccsk-list">
              {classSummary.mostSkippedQuestions.map((item, idx) => (
                <div key={idx} className="ccsk-item">
                  <span className="ccsk-question">{item.question}</span>
                  <div className="ccsk-bar-container">
                    <div
                      className="ccsk-bar"
                      style={{
                        width: `${item.skippedByPercent}%`,
                        backgroundColor: '#f44336'
                      }}
                    />
                  </div>
                  <span className="ccsk-percent">{item.skippedByPercent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checkout Pattern */}
        <div className="ccs-card ccs-checkout">
          <h4 className="ccsc-title">Checkout Patterns</h4>
          
          {classSummary.mostCommonCheckoutPoint ? (
            <>
              <div className="ccsc-item">
                <span className="ccsc-label">Most Common Drop-off</span>
                <span className="ccsc-point">{classSummary.mostCommonCheckoutPoint}</span>
              </div>

              {Object.keys(classSummary.checkoutPointDistribution).length > 1 && (
                <div className="ccsc-distribution">
                  <p className="ccsc-dist-label">Distribution:</p>
                  <div className="ccsc-dist-items">
                    {Object.entries(classSummary.checkoutPointDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([point, count], idx) => (
                        <div key={idx} className="ccsc-dist-item">
                          <span>{point}: {count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="ccsc-no-checkout">✓ Most students completed the assignment</p>
          )}
        </div>

        {/* At-Risk Profiles */}
        {atRiskBySeverity.length > 0 && (
          <div className="ccs-card ccs-atrisk">
            <h4 className="ccsc-title">⚠️ At-Risk Learner Profiles</h4>
            
            <div className="ccar-list">
              {atRiskBySeverity.map((profile, idx) => (
                <div
                  key={idx}
                  className="ccar-item"
                  style={{ borderLeftColor: RISK_COLORS[profile.riskLevel] }}
                >
                  <div className="ccar-name">
                    <span className="ccar-profile">{profile.profile}</span>
                    <span
                      className={`ccar-badge ccar-badge-${profile.riskLevel}`}
                      style={{ backgroundColor: RISK_COLORS[profile.riskLevel] }}
                    >
                      {profile.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <div className="ccar-metric">
                    <span>Avg Completion: {profile.averageCompletion}%</span>
                  </div>
                </div>
              ))}
            </div>

            {atRiskBySeverity.some(p => p.riskLevel === 'high') && (
              <div className="ccar-recommendation">
                <p>💡 Consider: Extended time, Simplified language, Reduced question count, Scaffolding</p>
              </div>
            )}
          </div>
        )}

        {/* Common Drop-off Reasons */}
        {classSummary.commonDropOffReasons.length > 0 && (
          <div className="ccs-card ccs-reasons">
            <h4 className="ccsc-title">Common Drop-off Reasons</h4>
            
            <div className="ccsr-list">
              {classSummary.commonDropOffReasons.map((reason, idx) => (
                <div key={idx} className="ccsr-item">
                  <span className="ccsr-bullet">•</span>
                  <span className="ccsr-text">{reason}</span>
                </div>
              ))}
            </div>

            <div className="ccsr-recommendations">
              <p className="ccsr-rec-title">📋 Recommendations:</p>
              <ul className="ccsr-rec-list">
                {classSummary.commonDropOffReasons.includes('time') && (
                  <li>Increase time allocation or use timed sections</li>
                )}
                {classSummary.commonDropOffReasons.includes('cognitive load') && (
                  <li>Reduce task complexity or break into smaller chunks</li>
                )}
                {classSummary.commonDropOffReasons.includes('Bloom level') && (
                  <li>Provide more scaffolding for higher-order thinking</li>
                )}
                {classSummary.commonDropOffReasons.includes('attention') && (
                  <li>Add engagement hooks or vary question formats</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Calculate overall class health
 */
function calculateClassHealth(summary: ClassCompletionData): {
  level: 'healthy' | 'warning' | 'critical';
  emoji: string;
  label: string;
  message: string;
} {
  
  const avgCompletion = summary.averageCompletionPercent;
  const atRiskCount = summary.atRiskProfiles.filter(p => p.riskLevel === 'high').length;
  const gradeValue = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 }[summary.averageEstimatedGrade] || 3;

  if (avgCompletion >= 85 && gradeValue >= 4 && atRiskCount === 0) {
    return {
      level: 'healthy',
      emoji: '✅',
      label: 'Class Health: Excellent',
      message: 'Students are completing assignments well with strong performance across all profiles.'
    };
  } else if (avgCompletion >= 70 && gradeValue >= 3) {
    return {
      level: 'warning',
      emoji: '⚡',
      label: 'Class Health: Caution',
      message: `Some learner profiles (${atRiskCount}) may need additional support or accommodations.`
    };
  } else {
    return {
      level: 'critical',
      emoji: '⚠️',
      label: 'Class Health: At Risk',
      message: 'Multiple learner profiles are struggling. Assignment may need revision or additional scaffolding.'
    };
  }
}

/**
 * Get color based on completion percentage
 */
function getCompletionColor(percent: number): string {
  if (percent >= 90) return '#4caf50';  // Green
  if (percent >= 70) return '#8bc34a';  // Light green
  if (percent >= 50) return '#ff9800';  // Orange
  if (percent >= 25) return '#f44336';  // Red
  return '#d32f2f';                     // Dark red
}

export default ClassCompletionSummary;
