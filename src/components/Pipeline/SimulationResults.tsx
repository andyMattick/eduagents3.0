/**
 * Simulation Results Visualization Component
 * 
 * Charts and heatmaps displaying student performance data
 * Confidence, fatigue, confusion metrics with interactive drill-down
 */

import React, { useState } from 'react';
import './SimulationResults.css';

interface StudentResult {
  studentId: string;
  comprehension: number; // 0-1
  fatigue: number; // 0-1
  confusion: number; // 0-1
  timeOnTask: number; // minutes
  engagement: number; // 0-1
}

interface ProblemResult {
  problemId: string;
  avgComprehension: number;
  avgFatigue: number;
  avgConfusion: number;
  studentCount: number;
  strugglingCount: number;
}

interface SimulationResultsProps {
  studentResults: StudentResult[];
  problemResults: ProblemResult[];
  totalTime: number;
  completionRate: number;
  onProblemClick?: (problemId: string) => void;
  onStudentClick?: (studentId: string) => void;
}

/**
 * Simple bar chart component
 */
const SimpleBarChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  title: string;
  max?: number;
}> = ({ data, title, max = 1 }) => {
  return (
    <div className="chart-container">
      <h4 className="chart-title">{title}</h4>
      <div className="bar-chart">
        {data.map((item, idx) => (
          <div key={idx} className="bar-item">
            <div className="bar-label">{item.label}</div>
            <div className="bar-wrapper">
              <div
                className="bar-fill"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: item.color || '#5b7cfa',
                }}
              >
                <span className="bar-value">{(item.value * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main Results Visualization Component
 */
export const SimulationResults: React.FC<SimulationResultsProps> = ({
  studentResults,
  problemResults,
  totalTime,
  completionRate,
  onProblemClick,
  onStudentClick,
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'students' | 'problems' | 'details'>(
    'overview'
  );
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);

  // Calculate aggregate metrics
  const avgComprehension =
    studentResults.reduce((sum, r) => sum + r.comprehension, 0) / studentResults.length;
  const avgFatigue = studentResults.reduce((sum, r) => sum + r.fatigue, 0) / studentResults.length;
  const avgConfusion =
    studentResults.reduce((sum, r) => sum + r.confusion, 0) / studentResults.length;
  const avgEngagement =
    studentResults.reduce((sum, r) => sum + r.engagement, 0) / studentResults.length;

  // Calculate risk levels
  const atRiskCount = studentResults.filter((r) => r.comprehension < 0.5).length;
  const fatigueCount = studentResults.filter((r) => r.fatigue > 0.7).length;
  const confusedCount = studentResults.filter((r) => r.confusion > 0.6).length;

  // Build data for visualizations
  const comprehensionByStudent = studentResults
    .sort((a, b) => a.comprehension - b.comprehension)
    .slice(0, 10)
    .map((r) => ({
      label: r.studentId.substring(0, 8),
      value: r.comprehension,
      color: r.comprehension > 0.7 ? '#51cf66' : r.comprehension > 0.4 ? '#ffa94d' : '#ff6b6b',
    }));

  const metricsByProblem = problemResults
    .sort((a, b) => a.avgComprehension - b.avgComprehension)
    .slice(0, 8)
    .map((r) => ({
      label: `P${r.problemId.substring(0, 4)}`,
      value: r.avgComprehension,
      color:
        r.avgComprehension > 0.7 ? '#51cf66' : r.avgComprehension > 0.4 ? '#ffa94d' : '#ff6b6b',
    }));

  return (
    <div className="simulation-results">
      {/* Header */}
      <div className="results-header">
        <h2>📊 Simulation Results</h2>
        <p className="results-subtitle">
          Analyzed {studentResults.length} student personas across {problemResults.length} problems
        </p>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-info">
            <span className="metric-label">Avg. Comprehension</span>
            <span className="metric-value">{(avgComprehension * 100).toFixed(0)}%</span>
          </div>
          <div className="metric-status healthy">Good</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⚡</div>
          <div className="metric-info">
            <span className="metric-label">Avg. Engagement</span>
            <span className="metric-value">{(avgEngagement * 100).toFixed(0)}%</span>
          </div>
          <div className="metric-status healthy">Good</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">😩</div>
          <div className="metric-info">
            <span className="metric-label">Avg. Fatigue</span>
            <span className="metric-value">{(avgFatigue * 100).toFixed(0)}%</span>
          </div>
          <div className={`metric-status ${avgFatigue > 0.5 ? 'warning' : 'healthy'}`}>
            {avgFatigue > 0.5 ? 'Monitor' : 'Low'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">❓</div>
          <div className="metric-info">
            <span className="metric-label">Avg. Confusion</span>
            <span className="metric-value">{(avgConfusion * 100).toFixed(0)}%</span>
          </div>
          <div className={`metric-status ${avgConfusion > 0.5 ? 'danger' : 'healthy'}`}>
            {avgConfusion > 0.5 ? 'High' : 'Low'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-info">
            <span className="metric-label">Est. Total Time</span>
            <span className="metric-value">{totalTime} min</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✓</div>
          <div className="metric-info">
            <span className="metric-label">Completion Rate</span>
            <span className="metric-value">{(completionRate * 100).toFixed(0)}%</span>
          </div>
          <div className={`metric-status ${completionRate > 0.8 ? 'healthy' : 'warning'}`}>
            {completionRate > 0.8 ? 'Good' : 'Concern'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="results-tabs">
        <button
          className={`results-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`results-tab ${activeView === 'students' ? 'active' : ''}`}
          onClick={() => setActiveView('students')}
        >
          👥 Students ({studentResults.length})
        </button>
        <button
          className={`results-tab ${activeView === 'problems' ? 'active' : ''}`}
          onClick={() => setActiveView('problems')}
        >
          ❓ Problems ({problemResults.length})
        </button>
        <button
          className={`results-tab ${activeView === 'details' ? 'active' : ''}`}
          onClick={() => setActiveView('details')}
        >
          🔍 Details
        </button>
      </div>

      {/* Tab Content */}
      <div className="results-content">
        {/* Overview */}
        {activeView === 'overview' && (
          <div className="view-section">
            <div className="charts-grid">
              <SimpleBarChart
                title="Comprehension by Problem (Bottom 8)"
                data={metricsByProblem}
              />
              <SimpleBarChart
                title="Comprehension by Student (Bottom 10)"
                data={comprehensionByStudent}
              />
            </div>

            <div className="risk-summary">
              <h3>Risk Assessment</h3>
              <div className="risk-grid">
                <div className="risk-card danger">
                  <span className="risk-count">{atRiskCount}</span>
                  <span className="risk-label">Students At Risk</span>
                  <span className="risk-desc">Comprehension &lt; 50%</span>
                </div>
                <div className="risk-card warning">
                  <span className="risk-count">{fatigueCount}</span>
                  <span className="risk-label">High Fatigue</span>
                  <span className="risk-desc">Fatigue &gt; 70%</span>
                </div>
                <div className="risk-card danger">
                  <span className="risk-count">{confusedCount}</span>
                  <span className="risk-label">Confused Students</span>
                  <span className="risk-desc">Confusion &gt; 60%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students */}
        {activeView === 'students' && (
          <div className="view-section">
            <div className="students-list">
              {studentResults.map((student) => (
                <div
                  key={student.studentId}
                  className={`student-result-item ${
                    selectedStudent === student.studentId ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedStudent(student.studentId);
                    onStudentClick?.(student.studentId);
                  }}
                >
                  <div className="student-result-name">{student.studentId}</div>
                  <div className="student-result-metrics">
                    <div className="metric-mini">
                      <div className="metric-bar">
                        <div
                          className="metric-fill"
                          style={{
                            width: `${student.comprehension * 100}%`,
                            backgroundColor:
                              student.comprehension > 0.7
                                ? '#51cf66'
                                : student.comprehension > 0.4
                                  ? '#ffa94d'
                                  : '#ff6b6b',
                          }}
                        ></div>
                      </div>
                      <span className="metric-label">Comp</span>
                    </div>
                    <div className="metric-mini">
                      <div className="metric-bar">
                        <div
                          className="metric-fill"
                          style={{
                            width: `${student.fatigue * 100}%`,
                            backgroundColor: student.fatigue > 0.7 ? '#ff6b6b' : '#ffa94d',
                          }}
                        ></div>
                      </div>
                      <span className="metric-label">Fatigue</span>
                    </div>
                    <div className="metric-mini">
                      <div className="metric-bar">
                        <div
                          className="metric-fill"
                          style={{
                            width: `${student.confusion * 100}%`,
                            backgroundColor: student.confusion > 0.6 ? '#ff6b6b' : '#ffa94d',
                          }}
                        ></div>
                      </div>
                      <span className="metric-label">Confusion</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problems */}
        {activeView === 'problems' && (
          <div className="view-section">
            <div className="problems-list">
              {problemResults.map((problem) => (
                <div
                  key={problem.problemId}
                  className={`problem-result-item ${
                    selectedProblem === problem.problemId ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedProblem(problem.problemId);
                    onProblemClick?.(problem.problemId);
                  }}
                >
                  <div className="problem-result-header">
                    <div className="problem-result-name">{problem.problemId}</div>
                    <div className="problem-result-stats">
                      <span className="stat-badge">
                        {problem.studentCount} students
                      </span>
                      <span className={`stat-badge ${problem.strugglingCount > 0 ? 'warning' : ''}`}>
                        {problem.strugglingCount} struggling
                      </span>
                    </div>
                  </div>
                  <div className="problem-result-metrics">
                    <div className="metric-bar-h">
                      <span className="metric-label-h">Comp</span>
                      <div className="bar">
                        <div
                          className="fill"
                          style={{
                            width: `${problem.avgComprehension * 100}%`,
                            backgroundColor:
                              problem.avgComprehension > 0.7
                                ? '#51cf66'
                                : problem.avgComprehension > 0.4
                                  ? '#ffa94d'
                                  : '#ff6b6b',
                          }}
                        ></div>
                      </div>
                      <span className="value">
                        {(problem.avgComprehension * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        {activeView === 'details' && (
          <div className="view-section">
            <h3>Detailed Analysis</h3>
            <div className="detail-info">
              <p>
                <strong>Assignment Duration:</strong> Estimated {totalTime} minutes for typical
                student
              </p>
              <p>
                <strong>Expected Completion:</strong> {(completionRate * 100).toFixed(0)}% of
                students expected to finish
              </p>
              <p>
                <strong>Comprehension Trend:</strong> Average comprehension is{' '}
                {avgComprehension > 0.7 ? 'strong' : avgComprehension > 0.4 ? 'moderate' : 'low'}
              </p>
              <p>
                <strong>Fatigue Risk:</strong>{' '}
                {fatigueCount > 0
                  ? `${fatigueCount} students may experience fatigue - consider shorter assignment or breaks`
                  : 'Low fatigue risk'}
              </p>
              <p>
                <strong>Confusion Points:</strong>{' '}
                {confusedCount > 0
                  ? `${confusedCount} students show confusion - problems may need clarification`
                  : 'Generally clear and understandable'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
