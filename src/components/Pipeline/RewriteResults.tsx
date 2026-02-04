import { useState } from 'react';
import { Tag } from '../../types/pipeline';

interface RewriteResultsProps {
  originalText: string;
  rewrittenText: string;
  summaryOfChanges: string;
  appliedTags: Tag[];
  isLoading?: boolean;
  onNext: () => void;
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
  appliedTags,
  isLoading = false,
  onNext,
}: RewriteResultsProps) {
  const [showHtml, setShowHtml] = useState(false);

  const AssignmentView = ({ text, title, isRewritten }: { text: string; title: string; isRewritten?: boolean }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <h3 style={{ color: '#333', marginBottom: '12px', marginTop: 0 }}>{title}</h3>
      
      {/* Student-facing view: rendered as clean content */}
      {!showHtml && (
        <div
          style={{
            padding: '20px',
            backgroundColor: isRewritten ? '#f0f8f0' : 'white',
            border: isRewritten ? '2px solid #28a745' : '1px solid #ddd',
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

      {/* HTML view: raw markup inspection */}
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
            fontFamily: '"Monaco", "Courier New", monospace',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {text}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 5: Rewritten Assignment</h2>

      {/* Summary of Changes */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#333', marginBottom: '12px' }}>Summary of Changes</h3>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#e8f4f8',
            border: '1px solid #b3e5fc',
            borderRadius: '6px',
            color: '#01579b',
            lineHeight: '1.6',
          }}
        >
          <p style={{ margin: 0 }}>{summaryOfChanges}</p>
        </div>
      </div>

      {/* Applied Tags */}
      {appliedTags.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#333', marginBottom: '12px' }}>Applied Improvements</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {appliedTags.map((tag) => (
              <span
                key={tag.name}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setShowHtml(!showHtml)}
          style={{
            padding: '6px 12px',
            backgroundColor: showHtml ? '#666' : '#f0f0f0',
            color: showHtml ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          {showHtml ? '✓ Show HTML' : 'Show HTML'}
        </button>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {showHtml ? 'Raw markup view' : 'Student view (how it will appear)'}
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
          <AssignmentView text={originalText} title="Original Assignment" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AssignmentView text={rewrittenText} title="Rewritten Assignment" isRewritten={true} />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={onNext}
          disabled={isLoading}
          style={{
            padding: '12px 28px',
            backgroundColor: isLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: '600',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = '#218838';
          }}
          onMouseLeave={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = '#28a745';
          }}
        >
          {isLoading ? 'Processing...' : 'Continue to Export'}
        </button>
      </div>
    </div>
  );
}
