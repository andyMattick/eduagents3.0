/**
 * Export Page Component
 * 
 * Multi-format export interface with preview tabs
 * Supports Word, PDF, JSON, and LMS upload options
 */

import React, { useState } from 'react';
import {
  exportToText,
  exportToJSON,
  exportToPDF,
  generateHTMLPreview,
  downloadFile,
} from '../../utils/exportUtils';
import './ExportPage.css';

interface ExportPageProps {
  assignmentText: string;
  assignmentTitle?: string;
  tags?: any[];
  studentFeedback?: any[];
  metadata?: {
    gradeLevel?: string;
    subject?: string;
    difficulty?: string;
  };
  onExportComplete?: (format: string) => void;
}

export const ExportPage: React.FC<ExportPageProps> = ({
  assignmentText,
  assignmentTitle = 'Assignment',
  tags = [],
  studentFeedback = [],
  metadata,
  onExportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'options' | 'status'>('preview');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [previewFormat, setPreviewFormat] = useState<'text' | 'html' | 'json'>('text');

  const timestamp = new Date().toLocaleString();
  const sanitizedTitle = assignmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // Handle text export
  const handleExportText = () => {
    setIsExporting(true);
    try {
      const content = exportToText(assignmentText, assignmentTitle, metadata);
      downloadFile(content, `${sanitizedTitle}_${Date.now()}.txt`, 'text/plain');
      setExportStatus(`✓ Text file exported successfully`);
      onExportComplete?.('text');
    } catch (error) {
      setExportStatus(`✗ Export failed: ${error}`);
    }
    setIsExporting(false);
  };

  // Handle JSON export
  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      const content = exportToJSON(
        assignmentText,
        assignmentTitle,
        tags,
        studentFeedback,
        metadata
      );
      downloadFile(content, `${sanitizedTitle}_${Date.now()}.json`, 'application/json');
      setExportStatus(`✓ JSON file exported successfully`);
      onExportComplete?.('json');
    } catch (error) {
      setExportStatus(`✗ Export failed: ${error}`);
    }
    setIsExporting(false);
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const htmlContent = generateHTMLPreview(assignmentText, assignmentTitle, tags, metadata);
      const pdfData = await exportToPDF(htmlContent, assignmentTitle);
      if (pdfData) {
        downloadFile(pdfData, `${sanitizedTitle}_${Date.now()}.pdf`, 'application/pdf');
        setExportStatus(`✓ PDF exported successfully`);
        onExportComplete?.('pdf');
      } else {
        setExportStatus(`✗ PDF generation failed`);
      }
    } catch (error) {
      setExportStatus(`✗ Export failed: ${error}`);
    }
    setIsExporting(false);
  };

  // Generate preview content
  const getPreviewContent = () => {
    switch (previewFormat) {
      case 'json':
        return JSON.stringify(
          {
            title: assignmentTitle,
            metadata,
            tags,
            studentFeedback: studentFeedback.slice(0, 2),
            preview: assignmentText.substring(0, 500),
          },
          null,
          2
        );
      case 'html':
        return generateHTMLPreview(assignmentText, assignmentTitle, tags, metadata);
      default:
        return exportToText(assignmentText, assignmentTitle, metadata);
    }
  };

  return (
    <div className="export-page">
      {/* Header */}
      <div className="export-header">
        <h2>📤 Export Assignment</h2>
        <p className="export-subtitle">Choose format and review before downloading</p>
      </div>

      {/* Tabs */}
      <div className="export-tabs">
        <button
          className={`export-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </button>
        <button
          className={`export-tab ${activeTab === 'options' ? 'active' : ''}`}
          onClick={() => setActiveTab('options')}
        >
          ⚙️ Export Options
        </button>
        <button
          className={`export-tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          📋 Status
        </button>
      </div>

      {/* Tab Content */}
      <div className="export-content">
        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="export-section">
            <div className="preview-controls">
              <label className="preview-label">Preview Format:</label>
              <div className="preview-buttons">
                <button
                  className={`preview-btn ${previewFormat === 'text' ? 'active' : ''}`}
                  onClick={() => setPreviewFormat('text')}
                >
                  📄 Text
                </button>
                <button
                  className={`preview-btn ${previewFormat === 'html' ? 'active' : ''}`}
                  onClick={() => setPreviewFormat('html')}
                >
                  🌐 HTML
                </button>
                <button
                  className={`preview-btn ${previewFormat === 'json' ? 'active' : ''}`}
                  onClick={() => setPreviewFormat('json')}
                >
                  {} JSON
                </button>
              </div>
            </div>

            <div className="preview-box">
              {previewFormat === 'html' ? (
                <iframe
                  title="HTML Preview"
                  srcDoc={getPreviewContent()}
                  className="preview-iframe"
                />
              ) : (
                <pre className="preview-content">{getPreviewContent()}</pre>
              )}
            </div>
          </div>
        )}

        {/* Options Tab */}
        {activeTab === 'options' && (
          <div className="export-section">
            <h3>Export Formats</h3>
            <div className="export-options">
              {/* Text Export */}
              <div className="export-option">
                <div className="option-header">
                  <h4>📄 Plain Text</h4>
                  <span className="option-badge">recommended</span>
                </div>
                <p>Simple text format compatible with all systems</p>
                <button
                  onClick={handleExportText}
                  disabled={isExporting}
                  className="export-btn export-btn-primary"
                >
                  {isExporting ? 'Exporting...' : 'Download TXT'}
                </button>
              </div>

              {/* PDF Export */}
              <div className="export-option">
                <div className="option-header">
                  <h4>📕 PDF Document</h4>
                  <span className="option-badge">formatted</span>
                </div>
                <p>Beautifully formatted PDF with metadata and styling</p>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="export-btn export-btn-accent"
                >
                  {isExporting ? 'Generating...' : 'Download PDF'}
                </button>
              </div>

              {/* JSON Export */}
              <div className="export-option">
                <div className="option-header">
                  <h4>{} JSON Data</h4>
                  <span className="option-badge">technical</span>
                </div>
                <p>Complete data export including tags and metadata</p>
                <button
                  onClick={handleExportJSON}
                  disabled={isExporting}
                  className="export-btn export-btn-secondary"
                >
                  {isExporting ? 'Exporting...' : 'Download JSON'}
                </button>
              </div>
            </div>

            {/* Additional Actions */}
            <div className="export-actions">
              <h3>More Actions</h3>
              <div className="action-grid">
                <button className="action-btn" title="Save to learning platform">
                  🏫 Upload to LMS
                </button>
                <button className="action-btn" title="Save to your profile">
                  💾 Save to Profile
                </button>
                <button className="action-btn" title="Re-analyze with AI">
                  ✨ Re-analyze
                </button>
                <button className="action-btn" title="Share with colleagues">
                  👥 Share
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="export-section">
            <h3>Export Status</h3>
            <div className="status-box">
              {exportStatus ? (
                <p className="status-message">{exportStatus}</p>
              ) : (
                <p className="status-message status-ready">Ready to export</p>
              )}
            </div>

            <div className="export-summary">
              <h4>Assignment Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Title:</span>
                  <span className="summary-value">{assignmentTitle}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Grade Level:</span>
                  <span className="summary-value">{metadata?.gradeLevel || 'N/A'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Subject:</span>
                  <span className="summary-value">{metadata?.subject || 'N/A'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Difficulty:</span>
                  <span className="summary-value">{metadata?.difficulty || 'N/A'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Content Length:</span>
                  <span className="summary-value">
                    {assignmentText.length} characters
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Tags:</span>
                  <span className="summary-value">{tags.length} tags</span>
                </div>
              </div>
            </div>

            <div className="export-timestamp">
              <small>Last updated: {timestamp}</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
