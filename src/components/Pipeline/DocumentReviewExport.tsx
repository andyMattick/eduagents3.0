import { useState } from 'react';
import './DocumentReviewExport.css';
import { ExportButtons } from './ExportButtons';

export interface AsteroidProblem {
  id: string;
  text: string;
  bloomLevel?: string;
  complexity?: number;
  novelty?: number;
  tips?: string;
  multipart?: boolean;
}

export interface AssignmentContent {
  title: string;
  topic?: string;
  gradeLevel?: string;
  type?: string;
  problems: AsteroidProblem[];
  metadata?: {
    subject?: string;
    totalTime?: number;
    instructions?: string;
  };
}

interface DocumentReviewExportProps {
  assignment: AssignmentContent;
  showMetadata?: boolean;
  showAnalytics?: boolean;
  analysisData?: {
    bloomHistogram?: Record<string, number>;
    averageComplexity?: number;
    totalEstimatedTime?: number;
    studentFeedbackSummary?: string;
  };
}

/**
 * Enhanced Document Review & Export Component
 * Provides printable preview with export options to PDF and Word
 */
export function DocumentReviewExport({
  assignment,
  showMetadata = true,
  showAnalytics = true,
  analysisData,
}: DocumentReviewExportProps) {
  const [displayMetadata, setDisplayMetadata] = useState(showMetadata);
  const [displayTips, setDisplayTips] = useState(true);
  const [displayAnalytics, setDisplayAnalytics] = useState(showAnalytics);
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const PROBLEMS_PER_PAGE = 5;
  const paginatedProblems = assignment.problems.slice(0, currentPage * PROBLEMS_PER_PAGE);
  const hasMorePages = currentPage * PROBLEMS_PER_PAGE < assignment.problems.length;

  return (
    <div className="document-review-export">
      {/* Export & Control Panel */}
      <div className="export-panel">
        <div className="export-controls">
          <div className="control-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={displayMetadata}
                onChange={e => setDisplayMetadata(e.target.checked)}
              />
              Show Metadata & Instructions
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={displayTips}
                onChange={e => setDisplayTips(e.target.checked)}
              />
              Show Tips & Hints
            </label>
            {displayAnalytics && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={displayAnalytics}
                  onChange={e => setDisplayAnalytics(e.target.checked)}
                />
                Show Analytics Appendix
              </label>
            )}
          </div>

          <ExportButtons
            assignment={assignment}
            includeMetadata={displayMetadata}
            includeTips={displayTips}
            includeAnalytics={displayAnalytics && analysisData}
            analyticsData={analysisData}
          />
        </div>
      </div>

      {/* Document Preview */}
      <div className="document-preview-container">
        <div className="document-page">
          {/* Header Section */}
          {displayMetadata && (
            <div className="document-header">
              <h1 className="document-title">{assignment.title}</h1>
              {assignment.metadata?.instructions && (
                <div className="instructions-box">
                  <h3>Instructions</h3>
                  <p>{assignment.metadata.instructions}</p>
                </div>
              )}
              <div className="document-metadata">
                {assignment.gradeLevel && (
                  <div className="metadata-item">
                    <strong>Grade Level:</strong> {assignment.gradeLevel}
                  </div>
                )}
                {assignment.type && (
                  <div className="metadata-item">
                    <strong>Type:</strong> {assignment.type}
                  </div>
                )}
                {assignment.topic && (
                  <div className="metadata-item">
                    <strong>Topic:</strong> {assignment.topic}
                  </div>
                )}
                {assignment.metadata?.totalTime && (
                  <div className="metadata-item">
                    <strong>Estimated Time:</strong> {assignment.metadata.totalTime} minutes
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Problems Section */}
          <div className="document-content">
            <h2 className="problems-heading">Problems</h2>
            <div className="problems-list">
              {paginatedProblems.map((problem, index) => (
                <div key={problem.id} className="problem-item">
                  <div className="problem-number">{index + 1}.</div>
                  <div className="problem-content">
                    <p className="problem-text">{problem.text}</p>

                    {displayTips && problem.tips && (
                      <div className="problem-tips">
                        <strong>💡 Tip:</strong> {problem.tips}
                      </div>
                    )}

                    {displayTips && (
                      <div className="problem-metadata">
                        {problem.bloomLevel && (
                          <span className="metadata-badge bloom">📚 {problem.bloomLevel}</span>
                        )}
                        {problem.complexity !== undefined && (
                          <span className="metadata-badge complexity">
                            ⚙️ Complexity: {(problem.complexity * 100).toFixed(0)}%
                          </span>
                        )}
                        {problem.novelty !== undefined && (
                          <span className="metadata-badge novelty">
                            ✨ Novelty: {(problem.novelty * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {hasMorePages && (
              <div className="pagination-controls">
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="load-more-btn"
                >
                  Load More Problems ({assignment.problems.length - paginatedProblems.length} remaining)
                </button>
              </div>
            )}
          </div>

          {/* Analytics Appendix */}
          {displayAnalytics && analysisData && (
            <div className="document-appendix">
              <h2>📊 Analytics & Insights</h2>

              {analysisData.bloomHistogram && (
                <div className="analytics-section">
                  <h3>Bloom Level Distribution</h3>
                  <div className="bloom-histogram">
                    {Object.entries(analysisData.bloomHistogram).map(([level, count]) => (
                      <div key={level} className="histogram-bar">
                        <div className="bar-label">{level}</div>
                        <div className="bar-container">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(count / Math.max(...Object.values(analysisData.bloomHistogram || {}))) * 100}%`,
                            }}
                          />
                          <span className="bar-value">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisData.averageComplexity !== undefined && (
                <div className="analytics-section">
                  <h3>Assignment Complexity</h3>
                  <p>Average Complexity: {(analysisData.averageComplexity * 100).toFixed(1)}%</p>
                </div>
              )}

              {analysisData.totalEstimatedTime && (
                <div className="analytics-section">
                  <h3>Time Estimate</h3>
                  <p>Total Estimated Time: {analysisData.totalEstimatedTime} minutes</p>
                </div>
              )}

              {analysisData.studentFeedbackSummary && (
                <div className="analytics-section">
                  <h3>Student Feedback Summary</h3>
                  <p>{analysisData.studentFeedbackSummary}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="document-footer">
            <p>Generated by Assignment Studio</p>
          </div>
        </div>
      </div>
    </div>
  );
}
