import React from 'react';
import { Tag } from '../../types/pipeline';

interface TagAnalysisProps {
  tags: Tag[];
  isLoading?: boolean;
  onNext: () => void;
}

export function TagAnalysis({ tags, isLoading = false, onNext }: TagAnalysisProps) {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 2: Tag Analysis</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        The following tags were detected in your assignment:
      </p>

      {tags.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>No tags detected.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {tags.map((tag) => (
            <div
              key={tag.name}
              style={{
                padding: '16px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', color: '#007bff' }}>{tag.name}</h4>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Confidence</div>
                <div
                  style={{
                    height: '8px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginTop: '4px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: `hsl(${(tag.confidenceScore * 120)}, 70%, 50%)`,
                      width: `${tag.confidenceScore * 100}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {(tag.confidenceScore * 100).toFixed(0)}%
                </div>
              </div>
              {tag.description && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#555' }}>
                  {tag.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

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
          {isLoading ? 'Loading...' : 'Continue to Feedback'}
        </button>
      </div>
    </div>
  );
}
