import { useUserFlow } from '../../hooks/useUserFlow';
import './AssignmentPreview.css';
import { useState } from 'react';

/**
 * Assignment Preview Component
 * Shows a full preview of the generated assignment in a clean, printable layout
 * before finalizing and routing to student analysis
 */
export function AssignmentPreview() {
  const { generatedAssignment, sourceFile, setReadyForClassroomAnalysis } = useUserFlow();
  const [showBloomMetrics, setShowBloomMetrics] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState(false);

  if (!generatedAssignment) {
    return (
      <div className="preview-error">
        <p>No assignment generated yet. Please complete the assignment form.</p>
      </div>
    );
  }

  const bloomEntries = Object.entries(generatedAssignment.bloomDistribution);
  const maxBloomValue = Math.max(...bloomEntries.map(([_, count]) => count));

  return (
    <div className="assignment-preview">
      <div className="preview-container">
        {/* Header */}
        <div className="preview-header">
          <div className="header-title">
            <h1>{generatedAssignment.title}</h1>
            <p className="subtitle">{generatedAssignment.topic}</p>
          </div>
          <div className="header-meta">
            <div className="meta-item">
              <span className="meta-label">Type</span>
              <span className="meta-value">{generatedAssignment.assignmentType}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Questions</span>
              <span className="meta-value">{generatedAssignment.questionCount}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Time</span>
              <span className="meta-value">{generatedAssignment.estimatedTime} min</span>
            </div>
            {generatedAssignment.assessmentType && (
              <div className="meta-item">
                <span className="meta-label">Assessment</span>
                <span className="meta-value">{generatedAssignment.assessmentType}</span>
              </div>
            )}
          </div>
        </div>

        {sourceFile && (
          <div className="source-reference">
            <span className="source-icon">📎</span>
            <span>Based on: <strong>{sourceFile.name}</strong></span>
          </div>
        )}

        {/* Sections and Problems */}
        <div className="preview-content">
          {generatedAssignment.sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="section-block">
              <div className="section-header">
                <h2 className="section-title">{section.sectionName}</h2>
                <div className="section-meta">
                  <span className="section-info">{section.topic}</span>
                  <span className="section-info">
                    {section.problems.length} {section.problems.length === 1 ? 'question' : 'questions'}
                  </span>
                </div>
              </div>

              <div className="problems-list">
                {section.problems.map((problem, problemIdx) => (
                  <div key={problemIdx} className="problem-item">
                    <div className="problem-number">
                      {sectionIdx === 0 ? problemIdx + 1 : `${sectionIdx}.${problemIdx + 1}`}
                    </div>

                    <div className="problem-content">
                      <p className="problem-text">{problem.text}</p>

                      {section.includeTips && problem.tips && (
                        <div className="problem-tips">
                          <span className="tips-label">💡 Tip:</span>
                          <p>{problem.tips}</p>
                        </div>
                      )}

                      <div className="problem-metadata">
                        <span className="bloom-badge" data-level={problem.bloomLevel.toLowerCase()}>
                          {problem.bloomLevel}
                        </span>
                        <span className="format-badge">{problem.questionFormat.replace('-', ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bloom Distribution Overview */}
        <div className="preview-footer">
          <button
            type="button"
            className="metrics-toggle"
            onClick={() => setShowBloomMetrics(!showBloomMetrics)}
          >
            {showBloomMetrics ? '▼' : '▶'} Bloom's Taxonomy Distribution
          </button>

          {showBloomMetrics && (
            <div className="bloom-metrics">
              <div className="bloom-chart">
                {bloomEntries.map(([level, count]) => (
                  <div key={level} className="bloom-row">
                    <div className="bloom-label">{level}</div>
                    <div className="bloom-bar-container">
                      <div
                        className="bloom-bar"
                        style={{ width: `${(count / maxBloomValue) * 100}%` }}
                        data-level={level.toLowerCase()}
                      />
                    </div>
                    <div className="bloom-count">{count}</div>
                  </div>
                ))}
              </div>
              <p className="chart-note">
                Distribution across {Object.keys(generatedAssignment.bloomDistribution).length} cognitive levels
              </p>
            </div>
          )}
        </div>

        {/* No Analysis Disclaimer */}
        <div className="preview-disclaimer">
          <span className="disclaimer-icon">⚠️</span>
          <div className="disclaimer-content">
            <strong>Preview Only — No Student Analysis Yet</strong>
            <p>This is a preview of the assignment structure. No student profiles have been evaluated against these problems. Continue to student analysis to simulate how different learners will interact with this assignment.</p>
          </div>
        </div>

        {/* Payload Inspector */}
        <div className="preview-footer">
          <button
            type="button"
            className="metrics-toggle"
            onClick={() => setShowPayloadModal(!showPayloadModal)}
          >
            {showPayloadModal ? '▼' : '▶'} View Problem Payload
          </button>

          {showPayloadModal && (
            <div className="payload-modal">
              <div className="payload-header">
                <h3>Problem Structure (JSON)</h3>
                <button 
                  className="payload-close" 
                  onClick={() => setShowPayloadModal(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
              <div className="payload-content">
                <pre><code>{JSON.stringify(generatedAssignment, null, 2)}</code></pre>
              </div>
              <div className="payload-actions">
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(generatedAssignment, null, 2));
                    alert('Payload copied to clipboard!');
                  }}
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="preview-actions">
          <button className="button-secondary" onClick={() => window.history.back()}>
            ← Back to Form
          </button>
          <div className="button-group">
            <button className="button-secondary" onClick={() => window.print()}>
              🖨️ Print/Export
            </button>
            <button className="button-primary" onClick={() => setReadyForClassroomAnalysis(true)}>
              Analyze with Students →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
