import React, { useMemo } from 'react';
import '../Analysis/CompletionPerformance.css';

interface StudentCompletion {
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
  performanceFactors: {
    processingSpeed: number;
    attentionSpan: number;
    cognitiveLoad: number;
    bloomChallenge: number;
    completionRisk: 'low' | 'medium' | 'high';
  };
}

interface CompletionPerformanceProps {
  studentSimulations: StudentCompletion[];
  totalTimeAvailableMinutes?: number;
  showDetailed?: boolean;
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

const RISK_LABELS: Record<string, string> = {
  'low': '✓ Low Risk',
  'medium': '⚡ Medium Risk',
  'high': '⚠️ High Risk'
};

/**
 * CompletionPerformance Component
 * Displays individual student completion data with progress bars, grades, and risk indicators
 */
export const CompletionPerformance: React.FC<CompletionPerformanceProps> = ({
  studentSimulations,
  totalTimeAvailableMinutes = 60,
  showDetailed = false
}) => {
  
  // Sort by completion % descending for better visual flow
  const sortedSimulations = useMemo(
    () => [...studentSimulations].sort((a, b) => b.completedPercent - a.completedPercent),
    [studentSimulations]
  );

  // Compute profile grouping
  const profileGroups = useMemo(() => {
    const groups: Record<string, StudentCompletion[]> = {};
    sortedSimulations.forEach(sim => {
      if (!groups[sim.studentProfile]) {
        groups[sim.studentProfile] = [];
      }
      groups[sim.studentProfile].push(sim);
    });
    return groups;
  }, [sortedSimulations]);

  return (
    <div className="completion-performance">
      <div className="cp-header">
        <h3>📊 Completion & Performance Analysis</h3>
        <p className="cp-subtitle">How students performed under time constraints and cognitive load</p>
      </div>

      <div className="cp-student-groups">
        {Object.entries(profileGroups).map(([profile, students]) => (
          <div key={profile} className="cp-profile-group">
            <div className="cp-group-header">
              <h4>{profile}</h4>
              <span className="cp-group-count">{students.length} student{students.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="cp-students-list">
              {students.map((sim, idx) => (
                <StudentCompletionCard
                  key={`${profile}-${idx}`}
                  simulation={sim}
                  timeAvailable={totalTimeAvailableMinutes}
                  showDetailed={showDetailed}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Individual Student Completion Card
 */
interface StudentCardProps {
  simulation: StudentCompletion;
  timeAvailable: number;
  showDetailed: boolean;
}

const StudentCompletionCard: React.FC<StudentCardProps> = ({
  simulation,
  timeAvailable,
  showDetailed
}) => {
  
  const completionColor = getCompletionColor(simulation.completedPercent);
  const riskColor = RISK_COLORS[simulation.performanceFactors.completionRisk];
  const riskLabel = RISK_LABELS[simulation.performanceFactors.completionRisk];
  const gradeColor = GRADE_COLORS[simulation.estimatedGrade];

  return (
    <div className="cp-student-card" style={{ borderLeftColor: riskColor }}>
      {/* Top Row: Profile, Grade, Risk */}
      <div className="cpc-header">
        <div className="cpc-profile-info">
          <span className="cpc-profile-name">{simulation.studentProfile}</span>
        </div>
        <div className="cpc-grade-badge" style={{ backgroundColor: gradeColor }}>
          <span className="cpc-grade-letter">{simulation.estimatedGrade}</span>
        </div>
        <div className="cpc-risk-badge" style={{ backgroundColor: riskColor }}>
          <span className="cpc-risk-label">{riskLabel}</span>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div className="cpc-metric">
        <div className="cpc-metric-label">
          <span>Completion</span>
          <span className="cpc-metric-value">{simulation.completedPercent}%</span>
        </div>
        <div className="cpc-progress-bar">
          <div
            className="cpc-progress-fill"
            style={{
              width: `${simulation.completedPercent}%`,
              backgroundColor: completionColor
            }}
          />
        </div>
        <div className="cpc-progress-details">
          {simulation.completedQuestions.length} of {simulation.completedQuestions.length + simulation.skippedQuestions.length} questions
        </div>
      </div>

      {/* Time Analysis */}
      <div className="cpc-metric">
        <div className="cpc-metric-label">
          <span>Time Used</span>
          <span className="cpc-metric-value">{simulation.timeSpentMinutes}m / {timeAvailable}m</span>
        </div>
        <div className="cpc-time-bar">
          <div
            className="cpc-time-fill"
            style={{ width: `${Math.min(100, (simulation.timeSpentMinutes / timeAvailable) * 100)}%` }}
          />
        </div>
      </div>

      {/* Accuracy & Confidence */}
      <div className="cpc-metrics-row">
        <div className="cpc-small-metric">
          <span className="cpc-small-label">Accuracy</span>
          <span className="cpc-small-value">{simulation.accuracyEstimate}%</span>
        </div>
        <div className="cpc-small-metric">
          <span className="cpc-small-label">Confidence</span>
          <span className="cpc-small-value">{Math.round(simulation.confidenceScore * 100)}%</span>
        </div>
        <div className="cpc-small-metric">
          <span className="cpc-small-label">Cognitive Load</span>
          <span className="cpc-small-value">{Math.round(simulation.performanceFactors.cognitiveLoad * 100)}%</span>
        </div>
      </div>

      {/* Drop-off Point */}
      {simulation.checkedOutAt && (
        <div className="cpc-checkout">
          <span className="cpc-checkout-label">Checked out at</span>
          <span className="cpc-checkout-point">{simulation.checkedOutAt}</span>
        </div>
      )}

      {/* Skipped Questions */}
      {simulation.skippedQuestions.length > 0 && (
        <div className="cpc-skipped">
          <span className="cpc-skipped-label">Skipped ({simulation.skippedQuestions.length})</span>
          <div className="cpc-skipped-list">
            {simulation.skippedQuestions.map((q, idx) => (
              <span key={idx} className="cpc-skipped-badge">{q}</span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Notes */}
      {showDetailed && (
        <div className="cpc-notes">
          <p className="cpc-notes-text">{simulation.notes}</p>
        </div>
      )}

      {/* Performance Factors Detail */}
      {showDetailed && (
        <div className="cpc-factors">
          <div className="cpcf-row">
            <div className="cpcf-item">
              <span className="cpcf-label">Processing Speed</span>
              <div className="cpcf-bar">
                <div
                  className="cpcf-fill"
                  style={{ width: `${Math.round(simulation.performanceFactors.processingSpeed * 100)}%` }}
                />
              </div>
            </div>
            <div className="cpcf-item">
              <span className="cpcf-label">Attention Span</span>
              <div className="cpcf-bar">
                <div
                  className="cpcf-fill"
                  style={{ width: `${Math.round(simulation.performanceFactors.attentionSpan * 100)}%` }}
                />
              </div>
            </div>
            <div className="cpcf-item">
              <span className="cpcf-label">Bloom Challenge</span>
              <div className="cpcf-bar">
                <div
                  className="cpcf-fill"
                  style={{ width: `${Math.round(simulation.performanceFactors.bloomChallenge * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

export default CompletionPerformance;
