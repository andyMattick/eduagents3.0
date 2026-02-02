import React, { useState } from 'react';
import { TagChange, VersionAnalysis } from '../../types/pipeline';
import jsPDF from 'jspdf';

interface Props {
  original: string;
  rewritten: string;
  summary: string;
  tagChanges: TagChange[];
  versionAnalysis?: VersionAnalysis | null;
  onReset: () => void;
}

export function VersionComparison({
  original,
  rewritten,
  summary,
  tagChanges,
  versionAnalysis,
  onReset,
}: Props) {
  const [showStudentView, setShowStudentView] = useState(false);

  const exportStudentViewPDF = () => {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Title
    pdf.setFontSize(16);
    pdf.text('Assignment', 20, yPosition);
    yPosition += 10;

    // Content
    pdf.setFontSize(11);
    const splitText = pdf.splitTextToSize(rewritten, 170);
    pdf.text(splitText, 20, yPosition);

    pdf.save('assignment-student-view.pdf');
  };

  if (showStudentView) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>📚 Student View</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          This is how students will see the final assignment.
        </p>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '16px' }}>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#f9f9f9',
              border: '1px solid #ddd',
              borderRadius: '6px',
              minHeight: '300px',
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#333',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {rewritten}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={exportStudentViewPDF}
            style={{
              padding: '10px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            📥 Download PDF
          </button>
          <button
            onClick={() => setShowStudentView(false)}
            style={{
              padding: '10px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Back to Comparison
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>Step 5: Version Comparison</h2>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#333' }}>Summary of Changes</h3>
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
          <p style={{ margin: 0 }}>{summary}</p>
        </div>
      </div>

      {versionAnalysis && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#333' }}>Overall Metrics</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Engagement Score Change
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: versionAnalysis.engagementScoreDelta > 0 ? '#28a745' : '#dc3545' }}>
                {versionAnalysis.engagementScoreDelta > 0 ? '+' : ''}
                {(versionAnalysis.engagementScoreDelta * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {versionAnalysis.originalEngagementScore.toFixed(2)} → {versionAnalysis.rewrittenEngagementScore.toFixed(2)}
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Reading Time Change
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: versionAnalysis.timeToReadDelta < 0 ? '#28a745' : '#ffc107' }}>
                {versionAnalysis.timeToReadDelta < 0 ? '' : '+'}
                {Math.round(versionAnalysis.timeToReadDelta)}s
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {Math.round(versionAnalysis.originalTimeToRead)}s → {Math.round(versionAnalysis.rewrittenTimeToRead)}s
              </div>
            </div>
          </div>
        </div>
      )}

      {tagChanges.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#333' }}>Tag Changes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {tagChanges.map((change) => (
              <div
                key={change.tag}
                style={{
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                }}
              >
                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{change.tag}</h4>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: change.delta > 0 ? '#28a745' : change.delta < 0 ? '#dc3545' : '#999',
                    marginBottom: '8px',
                  }}
                >
                  {change.delta > 0 ? '↑' : change.delta < 0 ? '↓' : '→'} {(change.delta * 100).toFixed(0)}%
                </div>
                {change.fromConfidence !== undefined && change.toConfidence !== undefined && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {(change.fromConfidence * 100).toFixed(0)}% → {(change.toConfidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h3 style={{ color: '#333' }}>Original Text</h3>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              maxHeight: '300px',
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#555',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {original}
          </div>
        </div>

        <div>
          <h3 style={{ color: '#333' }}>Rewritten Text</h3>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f8f0',
              border: '2px solid #28a745',
              borderRadius: '6px',
              maxHeight: '300px',
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#2d5016',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {rewritten}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setShowStudentView(true)}
          style={{
            padding: '10px 24px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          👁️ View Student Version
        </button>
        <button
          onClick={onReset}
          style={{
            padding: '10px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
