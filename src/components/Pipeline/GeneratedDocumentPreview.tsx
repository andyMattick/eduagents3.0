import { useState } from 'react';
import './GeneratedDocumentPreview.css';

export interface GeneratedDocumentPreviewProps {
  title: string;
  content: string;
  metadata?: {
    subject?: string;
    gradeLevel?: string;
    estimatedTime?: number;
    difficulty?: string;
  };
  onContinue: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
}

/**
 * Generated Document Preview Component
 * Shows a clean preview of the AI-generated document BEFORE problem analysis
 * Displays the full document content in a printable layout
 */
export function GeneratedDocumentPreview({
  title,
  content,
  metadata,
  onContinue,
  onEdit,
  isLoading = false,
}: GeneratedDocumentPreviewProps) {
  const [showMetadata, setShowMetadata] = useState(true);

  // Estimate reading time (average 200 words per minute)
  const wordCount = content.trim().split(/\s+/).length;
  const estimatedReadTime = Math.ceil(wordCount / 200);

  return (
    <div className="generated-document-preview">
      {/* Header */}
      <div className="gdp-header">
        <h1 className="gdp-title">📄 Generated Document Preview</h1>
        <p className="gdp-subtitle">Review your AI-generated assignment before problem analysis</p>
      </div>

      {/* Control Panel */}
      <div className="gdp-control-panel">
        <div className="gdp-controls">
          <label className="gdp-checkbox">
            <input
              type="checkbox"
              checked={showMetadata}
              onChange={(e) => setShowMetadata(e.target.checked)}
            />
            Show Metadata
          </label>
        </div>

        {/* Quick Stats */}
        <div className="gdp-stats">
          <div className="stat">
            <span className="stat-label">Words:</span>
            <span className="stat-value">{wordCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Reading Time:</span>
            <span className="stat-value">~{estimatedReadTime} min</span>
          </div>
        </div>
      </div>

      {/* Document Preview Container */}
      <div className="gdp-preview-container">
        {/* Document Page */}
        <div className="gdp-document-page">
          {/* Title */}
          <div className="gdp-document-header">
            <h2 className="gdp-document-title">{title}</h2>
          </div>

          {/* Metadata Section */}
          {showMetadata && metadata && (
            <div className="gdp-metadata-box">
              <div className="metadata-grid">
                {metadata.subject && (
                  <div className="metadata-item">
                    <span className="metadata-label">Subject:</span>
                    <span className="metadata-value">{metadata.subject}</span>
                  </div>
                )}
                {metadata.gradeLevel && (
                  <div className="metadata-item">
                    <span className="metadata-label">Grade Level:</span>
                    <span className="metadata-value">{metadata.gradeLevel}</span>
                  </div>
                )}
                {metadata.difficulty && (
                  <div className="metadata-item">
                    <span className="metadata-label">Difficulty:</span>
                    <span className="metadata-value">{metadata.difficulty}</span>
                  </div>
                )}
                {metadata.estimatedTime && (
                  <div className="metadata-item">
                    <span className="metadata-label">Estimated Time:</span>
                    <span className="metadata-value">{metadata.estimatedTime} minutes</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Document Content */}
          <div className="gdp-content">
            <div
              className="gdp-markdown-content"
              dangerouslySetInnerHTML={{
                __html: formatContentAsHTML(content),
              }}
            />
          </div>

          {/* Document Footer */}
          <div className="gdp-document-footer">
            <p className="footer-note">
              This document was AI-generated. Review the content carefully before proceeding.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="gdp-actions">
        <button
          className="gdp-button-secondary"
          onClick={onEdit}
          disabled={isLoading || !onEdit}
        >
          ✏️ Edit Content
        </button>

        <button
          className="gdp-button-primary"
          onClick={onContinue}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Processing...' : 'Continue to Problem Analysis →'}
        </button>
      </div>
    </div>
  );
}

/**
 * Convert markdown-like content to HTML for preview
 * Handles basic formatting: headers, lists, bold, italic
 */
function formatContentAsHTML(content: string): string {
  let html = content
    // Escape HTML special characters first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Convert markdown headers to HTML
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    // Convert bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Convert italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Convert line breaks to paragraphs
    .replace(/\n\n+/g, '</p><p>')
    // Convert bullet points
    .replace(/^\s*[-*+] (.*?)$/gm, '<li>$1</li>')
    // Convert numbered lists
    .replace(/^\s*\d+\. (.*?)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in ul
    .replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>')
    // Wrap paragraphs
    .split('\n')
    .map((line) => {
      if (
        !line.includes('<h') &&
        !line.includes('<li') &&
        !line.includes('<ul') &&
        line.trim()
      ) {
        return `<p>${line}</p>`;
      }
      return line;
    })
    .join('\n')
    // Fix multiple paragraph tags
    .replace(/<\/p>\s*<p>/g, '</p><p>')
    .replace(/<p>(.*?)<\/p>/g, '<p>$1</p>');

  return html;
}
