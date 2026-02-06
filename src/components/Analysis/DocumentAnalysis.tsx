/**
 * Document Analysis Component
 * Displays extracted problems with detection confidence
 * Allows manual adjustment of section/problem boundaries
 * Part of Pipeline "analyze" step
 */

import React from 'react';
import { ExtractedProblem, DocumentStructure } from '../../agents/analysis/documentStructureParser';

interface DocumentAnalysisProps {
  structure: DocumentStructure;
  onConfirm: (structure: DocumentStructure) => void;
  isLoading?: boolean;
}

export function DocumentAnalysis({ structure, onConfirm, isLoading = false }: DocumentAnalysisProps) {
  const [expandedProblem, setExpandedProblem] = React.useState<string | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [showPayloadPreview, setShowPayloadPreview] = React.useState(false);

  const toggleProblem = (problemId: string) => {
    setExpandedProblem(expandedProblem === problemId ? null : problemId);
  };

  const handleConfirm = () => {
    onConfirm(structure);
  };

  const handleDownloadPayload = () => {
    // Show preview instead of download
    setShowPayloadPreview(true);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '4px' }}>📊 Analyze Document</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Review extracted problems and their metadata. Adjust if needed.
          </p>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          style={{
            padding: '8px 12px',
            backgroundColor: editMode ? '#ff9800' : '#f0f0f0',
            color: editMode ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {editMode ? '✏️ Edit Mode' : '🔍 View Mode'}
        </button>
      </div>

      {/* Summary */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px' }}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#666' }}>Total Problems:</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#2196f3' }}>{structure.totalProblems}</div>
          </div>
          <div>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#666' }}>Sections:</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#2196f3' }}>{structure.sections.length}</div>
          </div>
          <div>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#666' }}>Avg Complexity:</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#2196f3' }}>{structure.overallComplexity.toFixed(2)}</div>
          </div>
          <div>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#666' }}>Est. Time:</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#2196f3' }}>{structure.estimatedTotalTimeMinutes} min</div>
          </div>
        </div>

        {/* Bloom Distribution */}
        <div style={{ marginTop: '12px' }}>
          <span style={{ fontWeight: 600, fontSize: '12px' }}>Bloom Distribution:</span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            {Object.entries(structure.bloomDistribution).map(([level, count]) => (
              <span
                key={level}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#fff',
                  border: '1px solid #2196f3',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                {level}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Problems List */}
      <div>
        <h3 style={{ marginBottom: '12px' }}>Extracted Problems</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {structure.sections.flatMap((section) =>
            section.problems.map((problem) => (
              <ProblemAnalysisCard
                key={problem.problemId}
                problem={problem}
                isExpanded={expandedProblem === problem.problemId}
                onToggle={() => toggleProblem(problem.problemId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Payload Preview Modal */}
      {showPayloadPreview && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            maxHeight: '500px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>📋 Document Structure Payload (JSON)</h3>
            <button
              onClick={() => setShowPayloadPreview(false)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ddd',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕ Close
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '12px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '3px',
              fontSize: '11px',
              lineHeight: '1.4',
              overflow: 'auto',
              fontFamily: 'monospace',
            }}
          >
            {JSON.stringify(
              {
                documentId: structure.documentId,
                title: structure.title,
                totalProblems: structure.totalProblems,
                totalSubparts: structure.totalSubparts,
                sections: structure.sections.map(s => ({
                  sectionId: s.sectionId,
                  title: s.title,
                  problemCount: s.problems.length,
                  problems: s.problems.slice(0, 2), // Show first 2 problems per section as sample
                })),
                bloomDistribution: structure.bloomDistribution,
                estimatedTotalTimeMinutes: structure.estimatedTotalTimeMinutes,
                metadata: structure.metadata,
                extractedAt: new Date().toISOString(),
                note: 'Full payload also visible in browser console (F12)',
              },
              null,
              2
            ).substring(0, 3000)}
            ...
          </pre>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDownloadPayload}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          📥 Download Payload
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: isLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? '🔄 Processing...' : '✓ Proceed with Analysis'}
        </button>
      </div>
    </div>
  );
}

interface ProblemAnalysisCardProps {
  problem: ExtractedProblem;
  isExpanded: boolean;
  onToggle: () => void;
}

function ProblemAnalysisCard({ problem, isExpanded, onToggle }: ProblemAnalysisCardProps) {
  const confidenceColor = problem.questionTypeConfidence > 0.8 ? '#4caf50' : problem.questionTypeConfidence > 0.6 ? '#ff9800' : '#f44336';
  
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fff' }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#f9f9f9',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        <div style={{ flex: 1 }}>
          <strong>{problem.sectionId} → {problem.problemId}</strong>
          <span style={{ marginLeft: '12px', fontSize: '12px', color: '#666' }}>
            {problem.detectedQuestionType}
          </span>
          <span
            style={{
              marginLeft: '12px',
              padding: '2px 6px',
              backgroundColor: confidenceColor,
              color: 'white',
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {(problem.questionTypeConfidence * 100).toFixed(0)}% confident
          </span>
          {problem.hasTips && (
            <span style={{ marginLeft: '12px', color: '#4caf50', fontWeight: 600, fontSize: '12px' }}>
              💡 Has Tips
            </span>
          )}
        </div>
        <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '16px', borderTop: '1px solid #eee' }}>
          {/* Problem Text */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ marginTop: 0, marginBottom: '8px', fontSize: '12px', color: '#666', fontWeight: 600 }}>
              Problem Text:
            </p>
            <p
              style={{
                margin: 0,
                padding: '12px',
                backgroundColor: '#f9f9f9',
                borderRadius: '4px',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              {problem.text}
            </p>
          </div>

          {/* Metadata Grid - ProblemProfile Schema */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
            <MetadataItem label="BloomLevel" value={problem.bloomLevels[0] || 'Unknown'} />
            <MetadataItem label="TestType" value={mapTestType(problem.detectedQuestionType)} />
            <MetadataItem label="Type Confidence" value={`${(problem.questionTypeConfidence * 100).toFixed(0)}%`} />
            <MetadataItem label="MultiPart" value={problem.isMultipart ? 'Yes' : 'No'} />
            <MetadataItem label="ProblemLength" value={`${problem.length} words`} />
            <MetadataItem label="LinguisticComplexity" value={problem.linguisticComplexity?.toFixed(2) || problem.complexity.toFixed(2)} />
            <MetadataItem label="SimilarityToPrevious" value={problem.similarity.toFixed(2)} />
            <MetadataItem label="NoveltyScore" value={problem.novelty.toFixed(2)} />
            <MetadataItem label="HasTips" value={problem.hasTips ? 'Yes' : 'No'} color={problem.hasTips ? '#4caf50' : '#999'} />
            <MetadataItem label="Est. Time (min)" value={`${problem.estimatedTimeMinutes}`} />
          </div>
        </div>
      )}
    </div>
  );
}

function MetadataItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
      }}
    >
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}

/**
 * Map detected question types to ProblemProfile TestType
 * Detected types: multiple_choice, true_false, matching, fill_in_blank, short_answer, frq_essay, calculation
 * ProblemProfile TestType: multiple_choice, short_answer, free_response
 */
function mapTestType(detectedType: string): string {
  switch (detectedType.toLowerCase()) {
    case 'multiple_choice':
      return 'multiple_choice';
    case 'true_false':
    case 'matching':
    case 'fill_in_blank':
      return 'short_answer';
    case 'frq_essay':
    case 'free_response':
    case 'calculation':
      return 'free_response';
    default:
      return 'short_answer';
  }
}
