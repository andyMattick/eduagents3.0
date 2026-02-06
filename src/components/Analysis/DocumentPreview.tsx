/**
 * Document Preview Component
 * Shows user what the parser will extract BEFORE full analysis
 */

import { DocumentPreview } from '../../agents/analysis/documentPreview';

interface DocumentPreviewProps {
  preview: DocumentPreview;
  isAnalyzing?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}

export function DocumentPreviewComponent({ 
  preview, 
  isAnalyzing = false,
  onConfirm, 
  onEdit 
}: DocumentPreviewProps) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '8px' }}>🔍 Document Preview</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Quick validation: verify the parser is detecting the right structure before full extraction
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <SummaryCard 
          label="Sections Detected" 
          value={preview.totalSections.toString()}
          color="#2196f3"
        />
        <SummaryCard 
          label="Est. Problems" 
          value={preview.totalEstimatedProblems.toString()}
          color="#4caf50"
        />
        <SummaryCard 
          label="Est. Multipart" 
          value={preview.totalEstimatedMultipart.toString()}
          color="#ff9800"
        />
      </div>

      {/* Warning if discrepancy */}
      {preview.totalSections === 1 && preview.totalEstimatedProblems > 5 && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404',
            fontSize: '13px',
          }}
        >
          <strong>⚠️ Caution:</strong> Parser detected only <strong>1 section</strong> but {preview.totalEstimatedProblems} problems. 
          If you have multiple parts (Part A, Part B, etc.), click "Edit & Re-upload" to make sure they're on separate lines.
        </div>
      )}

      {/* Validation Feedback */}
      <ValidationFeedback preview={preview} onEdit={onEdit} />

      {/* Section Details */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '14px' }}>📋 Section Breakdown</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {preview.sections.map((section, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: '#f9f9f9',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
                {section.title}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', fontSize: '12px', color: '#666' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>~{section.approximateProblems} problems</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>{section.approximateMultipart} multipart</span>
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#999', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                Preview: {section.preview}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onEdit}
          disabled={isAnalyzing}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
            opacity: isAnalyzing ? 0.6 : 1,
          }}
        >
          ✏️ Edit & Re-upload
        </button>
        <button
          onClick={onConfirm}
          disabled={isAnalyzing}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            opacity: isAnalyzing ? 0.6 : 1,
          }}
        >
          {isAnalyzing ? '🔄 Analyzing...' : '✅ Looks Good - Proceed'}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#f5f5f5',
        border: `2px solid ${color}`,
        borderRadius: '4px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: color }}>{value}</div>
    </div>
  );
}

function ValidationFeedback({ preview, onEdit }: { preview: DocumentPreview; onEdit: () => void }) {
  const { totalSections, totalEstimatedProblems } = preview;

  // Determine if results look reasonable
  const isSingleQuestion = totalEstimatedProblems === 1;
  const isSingleSection = totalSections === 1;
  const isSmallAssignment = totalEstimatedProblems <= 3;

  let status: 'good' | 'warning' | 'info' = 'good';
  let message = '';
  let hints: string[] = [];

  if (isSingleQuestion && isSingleSection) {
    status = 'info';
    message = '📌 Single Question Assignment';
    hints = [
      'This is OK if your assignment is just one question',
      'If you expected multiple questions, reformat with clear numbering (Question 1:, Question 2:, etc.)',
    ];
  } else if (isSingleSection && totalEstimatedProblems > 1) {
    status = 'warning';
    message = `⚠️ Many problems found (${totalEstimatedProblems}) but in 1 section`;
    hints = [
      'If these should be separate sections, add clear headers (Part A:, Part B:, etc.)',
      'Each on its own line in the original document',
      'Then click "Edit & Re-upload" to reformat',
    ];
  } else if (isSmallAssignment) {
    status = 'info';
    message = `✓ Small assignment (${totalEstimatedProblems} problems)`;
    hints = ['This looks reasonable for a quiz or quick assessment'];
  } else if (totalSections > 0 && totalEstimatedProblems > totalSections * 2) {
    status = 'info';
    message = `✓ Multi-part assignment (${totalEstimatedProblems} problems across ${totalSections} sections)`;
    hints = ['Parser looks to be working well'];
  }

  if (!message) return null;

  const bgColor = status === 'good' ? '#d4edda' : status === 'warning' ? '#fff3cd' : '#d1ecf1';
  const borderColor = status === 'good' ? '#28a745' : status === 'warning' ? '#ffc107' : '#17a2b8';
  const textColor = status === 'good' ? '#155724' : status === 'warning' ? '#856404' : '#0c5460';

  return (
    <div
      style={{
        padding: '14px',
        marginBottom: '16px',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        color: textColor,
        fontSize: '13px',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{message}</span>
        {status === 'warning' && (
          <button
            onClick={onEdit}
            style={{
              padding: '4px 12px',
              backgroundColor: '#ffc107',
              color: '#333',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            📝 Reformat
          </button>
        )}
      </div>
      {hints.length > 0 && (
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.5' }}>
          {hints.map((hint, i) => (
            <li key={i}>{hint}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
