/**
 * Problem Payload Viewer Component
 * Teacher-facing UI for displaying and interacting with problem payloads
 */

import React, { useState } from 'react';
import {
  extractedProblemToPayload,
  asteroidProblemToPayload,
  formatPayloadAsJSON,
  formatPayloadAsTable,
  formatPayloadAsStructured,
  ProblemPayload,
  generatePayloadFile,
} from '../../agents/analysis/problemPayloadViewer';

export interface ProblemPayloadViewerProps {
  problem: Record<string, any>; // Can be ExtractedProblem or AsteroidOptimizedProblem
  onClose?: () => void;
  viewMode?: 'modal' | 'embedded' | 'sidebar';
}

type ViewFormat = 'json' | 'table' | 'structured' | 'schema';

export const ProblemPayloadViewer: React.FC<ProblemPayloadViewerProps> = ({
  problem,
  onClose,
  viewMode = 'modal',
}) => {
  const [format, setFormat] = useState<ViewFormat>('schema');
  const [copied, setCopied] = useState(false);

  // Convert problem to payload
  const payload = 'generatedPrompt' in problem
    ? asteroidProblemToPayload(problem as AsteroidOptimizedProblem)
    : extractedProblemToPayload(problem as ExtractedProblem);

  const getFormattedContent = (): string => {
    switch (format) {
      case 'json':
        return formatPayloadAsJSON(payload);
      case 'table':
        return formatPayloadAsTable(payload);
      case 'structured':
        return formatPayloadAsStructured(payload);
      default:  // 'schema'
        return JSON.stringify(payload, null, 2);
    }
  };

  const handleCopyPayload = () => {
    const content = format === 'schema' ? JSON.stringify(payload, null, 2) : getFormattedContent();
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadJSON = () => {
    const blob = generatePayloadFile(payload);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `problem-${payload.problemId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = format === 'schema' 
    ? renderSchemaGrid(payload) 
    : (
        <div className="payload-formatted">
          <pre className="payload-content">{getFormattedContent()}</pre>
        </div>
      );

  const containerClass = `problem-payload-viewer problem-payload-${viewMode}`;

  return (
    <div className={containerClass}>
      {viewMode === 'modal' && (
        <div className="payload-header">
          <h2>Problem Payload: {payload.problemId}</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
      )}

      <div className="payload-toolbar">
        <div className="format-selector">
          <label>View Format:</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as ViewFormat)}>
            <option value="schema">Schema (Structured)</option>
            <option value="json">JSON</option>
            <option value="table">Table</option>
            <option value="structured">Structured Text</option>
          </select>
        </div>

        <div className="payload-actions">
          <button
            className="btn-copy"
            onClick={handleCopyPayload}
            title="Copy payload to clipboard"
          >
            {copied ? '✓ Copied!' : 'Copy Payload'}
          </button>
          <button
            className="btn-download"
            onClick={handleDownloadJSON}
            title="Download as JSON file"
          >
            Download JSON
          </button>
        </div>
      </div>

      <div className="payload-content-wrapper">{content}</div>

      <style>{`
        .problem-payload-viewer {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .problem-payload-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          max-width: 900px;
          max-height: 80vh;
          overflow: auto;
          z-index: 1000;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .payload-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f0f0;
        }

        .payload-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #000;
        }

        .payload-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 6px;
          gap: 15px;
          flex-wrap: wrap;
        }

        .format-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .format-selector label {
          font-weight: 500;
          color: #555;
          font-size: 14px;
        }

        .format-selector select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .payload-actions {
          display: flex;
          gap: 10px;
        }

        button.btn-copy,
        button.btn-download {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #333;
          transition: all 0.2s ease;
        }

        button.btn-copy:hover,
        button.btn-download:hover {
          background: #e8e8e8;
          border-color: #999;
        }

        button.btn-copy:active,
        button.btn-download:active {
          background: #ddd;
        }

        .payload-content-wrapper {
          max-height: 500px;
          overflow-y: auto;
        }

        .payload-formatted {
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          overflow-x: auto;
        }

        .payload-content {
          margin: 0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .schema-grid {
          display: grid;
          gap: 15px;
        }

        .schema-section {
          padding: 12px;
          background: #fafafa;
          border-left: 3px solid #4a90e2;
          border-radius: 4px;
        }

        .schema-section-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }

        .schema-field {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 10px;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .schema-field:last-child {
          margin-bottom: 0;
        }

        .schema-label {
          font-weight: 600;
          color: #555;
        }

        .schema-value {
          color: #333;
          word-break: break-word;
        }

        .schema-value-code {
          background: white;
          padding: 4px 6px;
          border-radius: 3px;
          border: 1px solid #ddd;
          font-family: monospace;
          font-size: 12px;
        }

        .schema-value-array {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .schema-value-item {
          background: white;
          padding: 4px 8px;
          border-radius: 3px;
          border: 1px solid #ddd;
          font-size: 12px;
        }

        .schema-value-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .schema-bar {
          flex: 1;
          height: 20px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
        }

        .schema-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a90e2, #357abd);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 4px;
          color: white;
          font-size: 11px;
          font-weight: 600;
        }

        .schema-value-number {
          font-weight: 600;
          color: #2c3e50;
        }

        .subparts-list {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 0;
          list-style: none;
          margin: 0;
        }

        .subpart-item {
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
        }

        .subpart-item:last-child {
          border-bottom: none;
        }

        .subpart-header {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .subpart-text {
          color: #666;
          font-size: 12px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

/**
 * Render the payload as a structured schema grid
 */
function renderSchemaGrid(payload: ProblemPayload): React.ReactNode {
  const getBloomColor = (bloom: string): string => {
    const colors: Record<string, string> = {
      Remember: '#ff6b6b',
      Understand: '#ffd93d',
      Apply: '#6bcf7f',
      Analyze: '#4d96ff',
      Evaluate: '#a855f7',
      Create: '#ec4899',
    };
    return colors[bloom] || '#999';
  };

  return (
    <div className="schema-grid">
      {/* Core Identity */}
      <div className="schema-section">
        <div className="schema-section-title">Problem Identity</div>
        <div className="schema-field">
          <div className="schema-label">Problem ID:</div>
          <div className="schema-value">
            <span className="schema-value-code">{payload.problemId}</span>
          </div>
        </div>
        <div className="schema-field">
          <div className="schema-label">Section ID:</div>
          <div className="schema-value">
            <span className="schema-value-code">{payload.sectionId}</span>
          </div>
        </div>
        <div className="schema-field">
          <div className="schema-label">Problem Type:</div>
          <div className="schema-value">{payload.problemType}</div>
        </div>
      </div>

      {/* Structure Metadata */}
      <div className="schema-section">
        <div className="schema-section-title">Structure</div>
        <div className="schema-field">
          <div className="schema-label">Is Multipart:</div>
          <div className="schema-value">{payload.isMultipart ? '✓ Yes' : '✗ No'}</div>
        </div>
        <div className="schema-field">
          <div className="schema-label">Structure:</div>
          <div className="schema-value">
            <span className="schema-value-code">{payload.structure}</span>
          </div>
        </div>
        <div className="schema-field">
          <div className="schema-label">Word Count:</div>
          <div className="schema-value">
            <span className="schema-value-number">{payload.length}</span> words
          </div>
        </div>
        {payload.estimatedTimeMinutes !== undefined && (
          <div className="schema-field">
            <div className="schema-label">Est. Time:</div>
            <div className="schema-value">
              <span className="schema-value-number">{payload.estimatedTimeMinutes}</span> min
            </div>
          </div>
        )}
      </div>

      {/* Learning Metrics */}
      <div className="schema-section">
        <div className="schema-section-title">Learning Metrics</div>
        <div className="schema-field">
          <div className="schema-label">Bloom Levels:</div>
          <div className="schema-value">
            <div className="schema-value-array">
              {payload.bloomLevels.map((level: string) => (
                <span
                  key={level}
                  className="schema-value-item"
                  style={{ borderLeftColor: getBloomColor(level), borderLeftWidth: '3px' }}
                >
                  {level}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="schema-field">
          <div className="schema-label">Complexity:</div>
          <div className="schema-value">
            <div className="schema-value-bar">
              <div className="schema-bar">
                <div
                  className="schema-bar-fill"
                  style={{ width: `${payload.complexity * 100}%` }}
                >
                  {(payload.complexity * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="schema-field">
          <div className="schema-label">Novelty:</div>
          <div className="schema-value">
            <div className="schema-value-bar">
              <div className="schema-bar">
                <div
                  className="schema-bar-fill"
                  style={{ width: `${payload.novelty * 100}%` }}
                >
                  {(payload.novelty * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="schema-field">
          <div className="schema-label">Similarity:</div>
          <div className="schema-value">
            <div className="schema-value-bar">
              <div className="schema-bar">
                <div
                  className="schema-bar-fill"
                  style={{ width: `${payload.similarity * 100}%` }}
                >
                  {(payload.similarity * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
        {payload.linguisticComplexity !== undefined && (
          <div className="schema-field">
            <div className="schema-label">Linguistic Complex:</div>
            <div className="schema-value">
              <div className="schema-value-bar">
                <div className="schema-bar">
                  <div
                    className="schema-bar-fill"
                    style={{ width: `${payload.linguisticComplexity * 100}%` }}
                  >
                    {(payload.linguisticComplexity * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Problem Content */}
      <div className="schema-section">
        <div className="schema-section-title">Problem Text</div>
        <div className="schema-value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
          {payload.text}
        </div>
      </div>

      {/* Subparts */}
      {payload.subparts && payload.subparts.length > 0 && (
        <div className="schema-section">
          <div className="schema-section-title">Subparts ({payload.subparts.length})</div>
          <ul className="subparts-list">
            {payload.subparts.map((subpart: ProblemSubpart) => (
              <li key={subpart.id} className="subpart-item">
                <div className="subpart-header">
                  Part ({subpart.id}) — {subpart.bloomLevels.join(', ')}
                </div>
                <div className="subpart-text">{subpart.text}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Render the payload as a simple schema text view
 */
function renderSchemaView(payload: ProblemPayload): React.ReactNode {
  return (
    <div className="payload-formatted">
      <pre className="payload-content">{JSON.stringify(payload, null, 2)}</pre>
    </div>
  );
}

export default ProblemPayloadViewer;
