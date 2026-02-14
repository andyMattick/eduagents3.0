import { useState } from 'react';
import { Tag } from '../../types/pipeline';

interface RewriteResultsProps {
  originalText: string;
  rewrittenText: string;
  summaryOfChanges: string;
  appliedTags: Tag[];
  isLoading?: boolean;
  onNext: () => void;
  onEditAndRetest?: () => void;
  onReanalyze?: () => void;
  hasUnsavedChanges?: boolean;
}

/**
 * Step 5: Side-by-side comparison of original and rewritten assignments
 * Renders both versions as students would see them (clean, formatted content)
 * Optional HTML view toggle for technical review
 */
export function RewriteResults({
  originalText,
  rewrittenText,
  summaryOfChanges,
  isLoading = false,
  onNext,
  onEditAndRetest,
  onReanalyze,
  hasUnsavedChanges = false,
}: RewriteResultsProps) {
  const [showHtml, setShowHtml] = useState(false);

  /**
   * Clean and format HTML for student view
   * Converts HTML to readable text with proper formatting
   */
  const formatForStudentView = (html: string): string => {
    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Preserve line breaks and structure
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/(p|div|blockquote|h[1-6])>/gi, '\n');
    text = text.replace(/<li>/gi, '• ');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    text = textarea.value;

    // Normalize whitespace
    text = text.replace(/\n\s*\n/g, '\n\n');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.trim();

    return text;
  };

  const originalFormatted = formatForStudentView(originalText);
  const rewrittenFormatted = formatForStudentView(rewrittenText);

  const AssignmentView = ({
    text,
    title,
    isRewritten,
  }: {
    text: string;
    title: string;
    isRewritten?: boolean;
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3
        style={{
          color: isRewritten ? '#28a745' : '#333',
          marginBottom: '12px',
          marginTop: 0,
          fontSize: '16px',
          fontWeight: '700',
          borderBottom: isRewritten ? '3px solid #28a745' : '2px solid #ddd',
          paddingBottom: '8px',
        }}
      >
        {title}
      </h3>

      {/* Student-facing view: rendered as clean, formatted content */}
      {!showHtml && (
        <div
          style={{
            padding: '20px',
            backgroundColor: isRewritten ? '#f0f8f0' : '#fafafa',
            border: isRewritten ? '2px solid #28a745' : '1px solid #e0e0e0',
            borderRadius: '6px',
            fontSize: '15px',
            lineHeight: '1.7',
            color: '#333',
            overflowY: 'auto',
            flex: 1,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {text}
        </div>
      )}

      {/* HTML view: raw markup inspection (only shown when toggled) */}
      {showHtml && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#2d2d2d',
            border: '1px solid #555',
            borderRadius: '6px',
            fontSize: '12px',
            lineHeight: '1.5',
            color: '#f8f8f2',
            overflowY: 'auto',
            flex: 1,
            fontFamily: '"Courier New", monospace',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {isRewritten ? rewrittenText : originalText}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Step 5: Assignment Comparison</h2>
      <p style={{ color: '#666', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>
        Review how your assignment has been improved. Both versions are shown as students will see them.
      </p>

      {/* Summary of Changes */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#333', marginBottom: '12px', fontSize: '15px', fontWeight: '600' }}>
          📋 Summary of Changes
        </h3>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#e8f4f8',
            border: '2px solid #b3e5fc',
            borderRadius: '6px',
            color: '#01579b',
            lineHeight: '1.6',
            fontSize: '14px',
          }}
        >
          {summaryOfChanges ? (
            <p style={{ margin: 0 }}>{summaryOfChanges}</p>
          ) : (
            <p style={{ margin: 0, fontStyle: 'italic' }}>Generating summary of changes...</p>
          )}
        </div>
      </div>

      {!rewrittenText && !summaryOfChanges && (
        <div
          style={{
            padding: '24px',
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '6px',
            color: '#856404',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600' }}>
            ⏳ Rewriting your assignment...
          </p>
          <p style={{ margin: 0, fontSize: '13px' }}>
            The rewrite engine is analyzing your content and generating improvements. This may take a moment.
          </p>
        </div>
      )}

      
      {/* View Toggle: Show HTML / Student View */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={() => setShowHtml(!showHtml)}
          style={{
            padding: '8px 14px',
            backgroundColor: showHtml ? '#666' : '#f0f0f0',
            color: showHtml ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            if (!showHtml) e.currentTarget.style.backgroundColor = '#e0e0e0';
          }}
          onMouseLeave={e => {
            if (!showHtml) e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
        >
          {showHtml ? '📋 Show HTML' : '👀 Show HTML'}
        </button>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {showHtml
            ? 'Raw markup (for technical review)'
            : 'Student view (how it will appear to learners)'}
        </span>
      </div>

      {/* Side-by-Side Comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '24px',
          minHeight: '500px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AssignmentView text={originalFormatted} title="📄 Original Assignment" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AssignmentView text={rewrittenFormatted} title="✨ Rewritten Assignment" isRewritten={true} />
        </div>
      </div>

      {/* Comparison Tips */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#f0f8ff',
          borderLeft: '4px solid #0066cc',
          borderRadius: '4px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#0066cc',
        }}
      >
        <strong>💡 Tips:</strong> Compare clarity, tone, structure, and readability. The rewritten
        version should be easier for your students to understand and engage with.
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: hasUnsavedChanges ? '#ff6b6b' : '#999' }}>
          {hasUnsavedChanges ? '⚠️ Unsaved changes' : '✓ Ready to save'}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {onReanalyze && (
            <button
              onClick={onReanalyze}
              disabled={isLoading}
              style={{
                padding: '10px 18px',
                backgroundColor: isLoading ? '#ccc' : '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              title="Re-analyze the rewritten assignment with the same student personas to validate improvements"
            >
              🔍 Reanalyze with Same Students
            </button>
          )}
          {onEditAndRetest && (
            <button
              onClick={onEditAndRetest}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                backgroundColor: isLoading ? '#ccc' : '#f0f0f0',
                color: '#333',
                border: '2px solid #0066cc',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#e6f2ff';
                }
              }}
              onMouseLeave={e => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }
              }}
            >
              🔄 Edit & Re-test
            </button>
          )}
          <button
            onClick={onNext}
            disabled={isLoading || hasUnsavedChanges}
            style={{
              padding: '12px 28px',
              backgroundColor: isLoading || hasUnsavedChanges ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading || hasUnsavedChanges ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              if (!isLoading && !hasUnsavedChanges) e.currentTarget.style.backgroundColor = '#218838';
            }}
            onMouseLeave={e => {
              if (!isLoading && !hasUnsavedChanges) e.currentTarget.style.backgroundColor = '#28a745';
            }}
            title={hasUnsavedChanges ? 'Reanalyze the rewritten version before saving' : 'Continue to export and save'}
          >
            {isLoading ? '⏳ Processing...' : hasUnsavedChanges ? '📊 Reanalyze First' : '✓ Continue to Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
