import { useUserFlow } from '../../hooks/useUserFlow';
import './AssignmentPreview.css';
import { useState } from 'react';
import { exportDocumentPreviewPDF } from '../../utils/exportUtils';

/**
 * Assignment Preview Component
 * Shows a full preview of the generated assignment in a clean, printable layout
 * before finalizing and routing to student analysis
 */
export function AssignmentPreview() {
  const { generatedAssignment, sourceFile, setReadyForClassroomAnalysis, setReadyForEditing, saveAssignmentVersion, assignmentVersions } = useUserFlow();
  const [showBloomMetrics, setShowBloomMetrics] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

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
            <div className="title-with-version">
              <h1>{generatedAssignment.title}</h1>
              <span className="version-badge">Version 1 (Pre-Analysis)</span>
            </div>
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
                  <span className="section-info">{section.instructions}</span>
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
                      <p className="problem-text">{problem.problemText}</p>

                      {section.includeTips && problem.tipText && (
                        <div className="problem-tips">
                          <span className="tips-label">💡 Tip:</span>
                          <p>{problem.tipText}</p>
                        </div>
                      )}

                      <div className="problem-metadata">
                        <span className="bloom-badge" data-level={String(problem.bloomLevel).toLowerCase()}>
                          📚 Level {problem.bloomLevel}
                        </span>
                        <span className="format-badge">{problem.questionFormat.replace('-', ' ')}</span>
                        {problem.problemLength && (
                          <span className="length-badge" title="Word count">
                            📏 {problem.problemLength} words
                          </span>
                        )}
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
            <button className="button-secondary" onClick={() => setShowDocumentPreview(true)}>
              👁️ View Document Preview
            </button>
            <button 
              className="button-secondary"
              onClick={() => setReadyForEditing(true)}
            >
              ✏️ Edit Problems
            </button>
            <button 
              className="button-primary" 
              onClick={() => {
                // Save this as Version 1 (Pre-Analysis)
                if (generatedAssignment && assignmentVersions.length === 0) {
                  saveAssignmentVersion(
                    'Pre-Analysis (V1)',
                    'Original AI-generated assignment before student analysis',
                    generatedAssignment
                  );
                }
                setReadyForClassroomAnalysis(true);
              }}
            >
              Analyze with Students →
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showDocumentPreview && (
        <div className="document-preview-modal-overlay">
          <div className="document-preview-modal">
            <div className="modal-header">
              <h2>{generatedAssignment.title}</h2>
              <button
                className="modal-close"
                onClick={() => setShowDocumentPreview(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content" id="document-preview-content">
              {/* Clean Quiz Header */}
              <div className="modal-quiz-header">
                <p className="modal-quiz-title">{generatedAssignment.assignmentType || 'Assessment'}: {generatedAssignment.topic}</p>
                <div className="modal-quiz-info">
                  <span>Time: {generatedAssignment.estimatedTime} minutes</span>
                  <span>•</span>
                  <span>Questions: {generatedAssignment.questionCount}</span>
                  {generatedAssignment.assessmentType && (
                    <>
                      <span>•</span>
                      <span>{generatedAssignment.assessmentType === 'formative' ? 'Formative' : 'Summative'} Assessment</span>
                    </>
                  )}
                </div>
              </div>

              {/* Document Title */}
              <div className="modal-document-header">
                <h1>{generatedAssignment.title}</h1>
                {sourceFile && (
                  <p className="modal-assignment-instruction">
                    Answer all questions. Show your work where applicable.
                  </p>
                )}
              </div>

              {/* Sections and Problems */}
              <div className="modal-preview-content">
                {generatedAssignment.sections.map((section, sectionIdx) => {
                  return (
                  <div key={sectionIdx} className="modal-section-block">
                    {/* Section header with instructions */}
                    <div className="modal-section-header">
                      <h2 className="modal-section-title">{section.sectionName}</h2>
                      <p className="modal-section-instruction">{section.instructions}</p>
                    </div>

                    {/* Problems for this section */}
                    <div className="modal-problems-list">
                      {section.problems.map((problem, problemIdx) => {
                        // Calculate global problem number
                        const globalProblemNumber = generatedAssignment.sections
                          .slice(0, sectionIdx)
                          .reduce((sum, s) => sum + s.problems.length, 0) + problemIdx + 1;

                        // Render options for multiple choice and true/false
                        const renderOptions = () => {
                          if (problem.questionFormat === 'multiple-choice') {
                            const options = ['A', 'B', 'C', 'D'];
                            return (
                              <div className="modal-problem-options">
                                {options.map(option => (
                                  <div key={option} className="modal-option-item">
                                    <input type="radio" id={`q${globalProblemNumber}-${option}`} name={`question-${globalProblemNumber}`} disabled />
                                    <label htmlFor={`q${globalProblemNumber}-${option}`}>{option}. _______________________________</label>
                                  </div>
                                ))}
                              </div>
                            );
                          } else if (problem.questionFormat === 'true-false') {
                            return (
                              <div className="modal-problem-options">
                                <div className="modal-option-item">
                                  <input type="radio" id={`q${globalProblemNumber}-true`} name={`question-${globalProblemNumber}`} disabled />
                                  <label htmlFor={`q${globalProblemNumber}-true`}>True</label>
                                </div>
                                <div className="modal-option-item">
                                  <input type="radio" id={`q${globalProblemNumber}-false`} name={`question-${globalProblemNumber}`} disabled />
                                  <label htmlFor={`q${globalProblemNumber}-false`}>False</label>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        };

                        // Render response space for short answer, free response, or fill-blank
                        const renderResponseSpace = () => {
                          if (['short-answer', 'free-response', 'fill-blank'].includes(problem.questionFormat)) {
                            const lineCount = problem.questionFormat === 'fill-blank' ? 1 : 4;
                            return (
                              <div className="modal-response-space">
                                {Array.from({ length: lineCount }).map((_, i) => (
                                  <div key={i} className="modal-response-line" />
                                ))}
                              </div>
                            );
                          }
                          return null;
                        };

                        return (
                          <div key={problemIdx} className="modal-problem-item">
                            <div className="modal-problem-number">{globalProblemNumber}.</div>

                            <div className="modal-problem-content">
                              <p className="modal-problem-text">{problem.problemText}</p>

                              {/* Render options for multiple choice or true/false */}
                              {renderOptions()}

                              {/* Render response space for short answer, free response, fill-blank */}
                              {renderResponseSpace()}

                              {/* Show tip if included in section */}
                              {section.includeTips && problem.hasTip && problem.tipText && (
                                <div className="modal-problem-tips">
                                  <span className="modal-tips-label">💡 Tip:</span>
                                  <p>{problem.tipText}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="button-secondary"
                onClick={() => setShowDocumentPreview(false)}
              >
                Close
              </button>
              <button
                className="button-primary"
                onClick={async () => {
                  const success = await exportDocumentPreviewPDF(
                    'document-preview-content',
                    `${generatedAssignment.title.replace(/\s+/g, '_')}_assessment.pdf`
                  );
                  if (success) {
                    setShowDocumentPreview(false);
                  }
                }}
              >
                ⬇️ Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
