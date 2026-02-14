/**
 * Step 8: Final Review Component
 * 
 * Enhanced document preview with:
 * - Printable/paginated layout
 * - Assignment metadata display
 * - Problem rendering with Bloom tags
 * - PDF/Word export options
 * - Optional appendix with analytics
 */

import React, { useState } from 'react';
import {
  exportToText,
  exportToJSON,
  exportToPDF,
  generateHTMLPreview,
  downloadFile,
} from '../../utils/exportUtils';
import { Asteroid } from '../../types/simulation';
import './Step8FinalReview.css';

interface Step8Props {
  assignmentText: string;
  assignmentTitle?: string;
  assignmentMetadata?: {
    gradeLevel?: string;
    subject?: string;
    difficulty?: string;
    type?: string;
    estimatedTimeMinutes?: number;
  };
  tags?: any[];
  studentFeedback?: any[];
  asteroids?: any[];
  sourceDocumentId?: string;
  assignmentId?: string;
  teacherId?: string;
  onPrevious?: () => void;
  onComplete?: () => void;
  onCompleteSaveProblems?: (result: { successCount: number; failureCount: number; savedProblemIds: string[] }) => Promise<void>;
}

export const Step8FinalReview: React.FC<Step8Props> = ({
  assignmentText,
  assignmentTitle = 'Assignment',
  assignmentMetadata = {},
  tags = [],
  studentFeedback = [],
  asteroids = [],
  sourceDocumentId,
  assignmentId,
  teacherId,
  onPrevious,
  onComplete,
  onCompleteSaveProblems,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'analytics' | 'export'>('preview');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [showMetadata, setShowMetadata] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isSavingProblems, setIsSavingProblems] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Handle export functions
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const content = generateFinalReviewHTML(true);
      const pdfData = await exportToPDF(content, assignmentTitle);
      if (pdfData) {
        downloadFile(pdfData, `${sanitizeName(assignmentTitle)}_review.pdf`, 'application/pdf');
        setExportStatus('✓ PDF exported successfully');
      } else {
        setExportStatus('✗ PDF generation failed');
      }
    } catch (error) {
      setExportStatus(`✗ Export failed: ${error}`);
    }
    setIsExporting(false);
  };

  const handleExportText = () => {
    setIsExporting(true);
    try {
      const content = exportToText(assignmentText, assignmentTitle, assignmentMetadata);
      downloadFile(content, `${sanitizeName(assignmentTitle)}_review.txt`, 'text/plain');
      setExportStatus('✓ Text file exported successfully');
    } catch (error) {
      setExportStatus(`✗ Export failed: ${error}`);
    }
    setIsExporting(false);
  };

  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      const content = exportToJSON(
        assignmentText,
        assignmentTitle,
        tags,
        studentFeedback,
        assignmentMetadata
      );
      downloadFile(content, `${sanitizeName(assignmentTitle)}_review.json`, 'application/json');
      setExportStatus('✓ JSON file exported successfully');
    } catch (error) {
      setExportStatus(`✗ Export failed: ${error}`);
    }
    setIsExporting(false);
  };

  const sanitizeName = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  const handleCompleteWithSave = async () => {
    // If we have asteroids and save callback, save them to problem bank first
    if (asteroids && asteroids.length > 0 && onCompleteSaveProblems && teacherId && sourceDocumentId && assignmentId) {
      setIsSavingProblems(true);
      setSaveStatus('💾 Saving problems to library...');
      try {
        // Call the parent component's save handler
        await onCompleteSaveProblems({
          successCount: asteroids.length,
          failureCount: 0,
          savedProblemIds: asteroids.map((a: any) => a.ProblemId || ''),
        });
        setSaveStatus('✓ Problems saved to library successfully!');
        // Wait a moment for user to see the success message
        setTimeout(() => {
          onComplete?.();
        }, 1500);
      } catch (error) {
        setSaveStatus(`✗ Error saving problems: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Error saving problems to problem bank:', error);
        // Still allow user to complete even if save fails
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      } finally {
        setIsSavingProblems(false);
      }
    } else {
      // No asteroids to save or no save callback, just complete
      onComplete?.();
    }
  };

  const generateFinalReviewHTML = (includeAnalytics: boolean) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${assignmentTitle}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f9f9f9;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
          }
          .page {
            background: white;
            padding: 60px;
            margin-bottom: 40px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            page-break-after: always;
          }
          
          /* Title Page */
          .title-page {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            min-height: 600px;
          }
          .title-page h1 {
            font-size: 48px;
            color: #5b7cfa;
            margin-bottom: 30px;
          }
          .metadata-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
          }
          .metadata-item {
            text-align: center;
          }
          .metadata-label {
            font-size: 12px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .metadata-value {
            font-size: 18px;
            font-weight: 600;
            color: #333;
          }
          
          /* Content */
          .content {
            margin-top: 30px;
            line-height: 1.8;
          }
          h2 {
            font-size: 28px;
            color: #5b7cfa;
            margin: 30px 0 20px 0;
            border-bottom: 2px solid #5b7cfa;
            padding-bottom: 10px;
          }
          h3 {
            font-size: 18px;
            color: #333;
            margin: 20px 0 10px 0;
            font-weight: 600;
          }
          p {
            margin-bottom: 15px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          
          /* Tags */
          .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 15px 0;
          }
          .tag {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            background: #5b7cfa;
            color: white;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          
          /* Problems */
          .problem {
            margin: 25px 0;
            padding: 15px;
            border-left: 4px solid #5b7cfa;
            background: #f9fafb;
            border-radius: 4px;
          }
          .problem-number {
            font-weight: 600;
            color: #5b7cfa;
            font-size: 14px;
          }
          .problem-text {
            margin: 10px 0;
            font-size: 15px;
            color: #333;
          }
          
          /* Analytics Section */
          .analytics {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
          }
          .analytics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .analytics-card {
            padding: 15px;
            background: #f9fafb;
            border-left: 4px solid #51cf66;
            border-radius: 4px;
          }
          .analytics-label {
            font-size: 12px;
            color: #999;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .analytics-value {
            font-size: 24px;
            font-weight: 700;
            color: #51cf66;
          }
          
          /* Bloom Distribution */
          .bloom-distribution {
            margin: 30px 0;
            padding: 20px;
            background: #f9fafb;
            border-radius: 4px;
          }
          .bloom-bar {
            display: flex;
            margin: 10px 0;
            align-items: center;
            gap: 10px;
          }
          .bloom-label {
            width: 100px;
            font-size: 12px;
            font-weight: 600;
            color: #333;
          }
          .bloom-bar-fill {
            flex: 1;
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
          }
          .bloom-bar-progress {
            height: 100%;
            background: linear-gradient(90deg, #5b7cfa, #748ffc);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 600;
          }
          
          /* Footer */
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
          
          @media print {
            body {
              background: white;
            }
            .page {
              page-break-after: always;
              box-shadow: none;
              margin-bottom: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Title Page -->
          <div class="page title-page">
            <h1>${escapeHtml(assignmentTitle)}</h1>
            ${showMetadata ? `
              <div class="metadata-grid">
                ${assignmentMetadata.subject ? `
                  <div class="metadata-item">
                    <div class="metadata-label">Subject</div>
                    <div class="metadata-value">${escapeHtml(assignmentMetadata.subject)}</div>
                  </div>
                ` : ''}
                ${assignmentMetadata.gradeLevel ? `
                  <div class="metadata-item">
                    <div class="metadata-label">Grade Level</div>
                    <div class="metadata-value">${escapeHtml(assignmentMetadata.gradeLevel)}</div>
                  </div>
                ` : ''}
                ${assignmentMetadata.difficulty ? `
                  <div class="metadata-item">
                    <div class="metadata-label">Difficulty</div>
                    <div class="metadata-value">${escapeHtml(assignmentMetadata.difficulty)}</div>
                  </div>
                ` : ''}
                ${assignmentMetadata.estimatedTimeMinutes ? `
                  <div class="metadata-item">
                    <div class="metadata-label">Est. Time</div>
                    <div class="metadata-value">${assignmentMetadata.estimatedTimeMinutes} min</div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
            <div class="footer">
              Generated on ${new Date().toLocaleString()}
            </div>
          </div>
          
          <!-- Content Page -->
          <div class="page">
            <h2>Assignment Content</h2>
            <div class="content">
              ${escapeHtml(assignmentText)}
            </div>
            ${tags && tags.length > 0 ? `
              <div class="tags">
                ${tags.map((tag) => `<span class="tag">${escapeHtml(tag.name || tag)}</span>`).join('')}
              </div>
            ` : ''}
          </div>
          
          ${includeAnalytics && (showAnalytics || studentFeedback.length > 0) ? `
            <!-- Analytics Page -->
            <div class="page">
              <h2>Analysis & Feedback</h2>
              
              ${studentFeedback && studentFeedback.length > 0 ? `
                <div class="analytics">
                  <h3>Student Feedback Summary</h3>
                  <div class="analytics-grid">
                    ${studentFeedback.map((feedback, idx) => `
                      <div class="analytics-card">
                        <div class="analytics-label">Student ${idx + 1}</div>
                        <div class="analytics-value">${feedback.timeToCompleteMinutes || 'N/A'} min</div>
                        <div style="font-size: 11px; color: #666; margin-top: 8px;">
                          ${feedback.understoodConcepts ? 'Understood: ' + feedback.understoodConcepts.slice(0, 2).join(', ') : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  };

  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="step8-final-review">
      {/* Header */}
      <div className="step8-header">
        <div className="step8-title">
          <h2>📋 Final Review</h2>
          <p>Review and export your assignment</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="step8-tabs">
        <button
          className={`step8-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </button>
        <button
          className={`step8-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
        <button
          className={`step8-tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          💾 Export
        </button>
      </div>

      {/* Content Area */}
      <div className="step8-content">
        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="step8-preview">
            <div className="preview-controls">
              <label className="preview-option">
                <input
                  type="checkbox"
                  checked={showMetadata}
                  onChange={(e) => setShowMetadata(e.target.checked)}
                />
                Show Metadata
              </label>
              <label className="preview-option">
                <input
                  type="checkbox"
                  checked={showAnalytics}
                  onChange={(e) => setShowAnalytics(e.target.checked)}
                />
                Show Analytics
              </label>
              <button
                className="preview-btn"
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
            </div>

            <div className="preview-content">
              <div style={{ background: 'white', padding: '40px', borderRadius: '8px' }}>
                <h1 style={{ color: '#5b7cfa', marginBottom: '30px' }}>
                  {assignmentTitle}
                </h1>

                {showMetadata && (
                  <div className="preview-metadata">
                    <h3>Assignment Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {assignmentMetadata.subject && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>
                            SUBJECT
                          </div>
                          <div>{assignmentMetadata.subject}</div>
                        </div>
                      )}
                      {assignmentMetadata.gradeLevel && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>
                            GRADE LEVEL
                          </div>
                          <div>{assignmentMetadata.gradeLevel}</div>
                        </div>
                      )}
                      {assignmentMetadata.difficulty && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>
                            DIFFICULTY
                          </div>
                          <div>{assignmentMetadata.difficulty}</div>
                        </div>
                      )}
                      {assignmentMetadata.estimatedTimeMinutes && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>
                            ESTIMATED TIME
                          </div>
                          <div>{assignmentMetadata.estimatedTimeMinutes} minutes</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '30px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {assignmentText}
                </div>

                {tags && tags.length > 0 && (
                  <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: '#5b7cfa',
                          color: 'white',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {tag.name || tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="step8-analytics">
            <h3>Feedback Summary</h3>
            {studentFeedback && studentFeedback.length > 0 ? (
              <div className="analytics-cards">
                {studentFeedback.map((feedback, idx) => (
                  <div key={idx} className="analytics-card">
                    <div className="card-label">Student {idx + 1}</div>
                    <div className="card-value">
                      {feedback.timeToCompleteMinutes} minutes
                    </div>
                    {feedback.understoodConcepts && (
                      <div className="card-concepts">
                        Understood: {feedback.understoodConcepts.join(', ')}
                      </div>
                    )}
                    {feedback.struggledWith && (
                      <div className="card-struggled">
                        Struggled: {feedback.struggledWith.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No feedback data available</p>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="step8-export">
            <h3>Export Options</h3>
            <div className="export-buttons">
              <button
                className="export-btn pdf-btn"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                📄 Export as PDF
              </button>
              <button
                className="export-btn text-btn"
                onClick={handleExportText}
                disabled={isExporting}
              >
                📝 Export as Text
              </button>
              <button
                className="export-btn json-btn"
                onClick={handleExportJSON}
                disabled={isExporting}
              >
                ⚙️ Export as JSON
              </button>
            </div>
            {exportStatus && (
              <div
                className={`export-status ${exportStatus.includes('✓') ? 'success' : 'error'}`}
              >
                {exportStatus}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="step8-actions">
        {saveStatus && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: saveStatus.includes('✗') ? '#f8d7da' : '#d4edda',
            color: saveStatus.includes('✗') ? '#721c24' : '#155724',
            border: `1px solid ${saveStatus.includes('✗') ? '#f5c6cb' : '#c3e6cb'}`,
          }}>
            {saveStatus}
          </div>
        )}
        <button
          className="step8-btn secondary"
          onClick={onPrevious}
          disabled={isSavingProblems}
        >
          ← Previous
        </button>
        <button
          className="step8-btn primary"
          onClick={handleCompleteWithSave}
          disabled={isSavingProblems}
        >
          {isSavingProblems ? '⏳ Saving...' : '✓ Complete'}
        </button>
      </div>
    </div>
  );
};
