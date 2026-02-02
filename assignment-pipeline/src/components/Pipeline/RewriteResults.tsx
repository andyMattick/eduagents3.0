import React from 'react';
import { Tag } from '../../types/pipeline';

interface RewriteResultsProps {
  originalText: string;
  rewrittenText: string;
  summaryOfChanges: string;
  appliedTags: Tag[];
  isLoading?: boolean;
  onNext: () => void;
}

export function RewriteResults({
  originalText,
  rewrittenText,
  summaryOfChanges,
  appliedTags,
  isLoading = false,
  onNext,
}: RewriteResultsProps) {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 4: Rewritten Assignment</h2>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#333', marginBottom: '12px' }}>Summary of Changes</h3>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#e8f4f8',
            border: '1px solid #b3e5fc',
            borderRadius: '6px',
            color: '#01579b',
          }}
        >
          <p style={{ margin: 0, lineHeight: '1.6' }}>{summaryOfChanges}</p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#333', marginBottom: '12px' }}>Applied Tags</h3>
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
                fontWeight: 'bold',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h3 style={{ color: '#333', marginBottom: '12px' }}>Original Text</h3>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              maxHeight: '400px',
              overflowY: 'auto',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#555',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {originalText}
          </div>
        </div>

        <div>
          <h3 style={{ color: '#333', marginBottom: '12px' }}>Rewritten Text</h3>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f8f0',
              border: '2px solid #28a745',
              borderRadius: '6px',
              maxHeight: '400px',
              overflowY: 'auto',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#2d5016',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {rewrittenText}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button
          onClick={onNext}
          disabled={isLoading}
          style={{
            padding: '10px 24px',
            backgroundColor: isLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? 'Loading...' : 'View Comparison'}
        </button>
      </div>
    </div>
  );
}
