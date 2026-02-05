/**
 * Problem Inspector
 * Upload/paste documents and view extracted problems with Phase 1 metadata
 * (Bloom levels, complexity, novelty, hasTips, etc.)
 */

import React from 'react';
import { parseDocumentStructure, DocumentStructure, ExtractedProblem } from '../../agents/analysis/documentStructureParser';

export function ProblemInspector() {
  const [documentText, setDocumentText] = React.useState('');
  const [structure, setStructure] = React.useState<DocumentStructure | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [expandedProblem, setExpandedProblem] = React.useState<string | null>(null);

  const handleParse = async () => {
    if (!documentText.trim()) {
      alert('Please enter or paste document text');
      return;
    }

    setIsLoading(true);
    try {
      const result = await parseDocumentStructure(documentText, {
        documentTitle: 'Uploaded Document',
      });
      setStructure(result);
    } catch (error) {
      console.error('Parse error:', error);
      alert('Error parsing document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setDocumentText(text);
    };
    reader.readAsText(file);
  };

  const toggleProblem = (problemId: string) => {
    setExpandedProblem(expandedProblem === problemId ? null : problemId);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>🔍 Phase 1: Problem Inspector</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Upload or paste a document to extract problems and view their Phase 1 metadata
      </p>

      {/* Input Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Text Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Paste Document Text
          </label>
          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Paste assignment text here..."
            style={{
              width: '100%',
              height: '300px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* File Upload */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Or Upload File
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            style={{
              display: 'block',
              marginBottom: '12px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleParse}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isLoading ? '#ccc' : '#5b7cfa',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? '🔄 Parsing...' : '📄 Parse Document'}
          </button>
        </div>
      </div>

      {/* Results */}
      {structure && (
        <div>
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
            <h3 style={{ marginTop: 0, marginBottom: '12px' }}>📊 Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <span style={{ fontWeight: 600 }}>Total Problems:</span> {structure.totalProblems}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Total Subparts:</span> {structure.totalSubparts}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Overall Complexity:</span> {structure.overallComplexity.toFixed(2)}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Est. Time:</span> {structure.estimatedTotalTimeMinutes} min
              </div>
            </div>

            {/* Bloom Distribution */}
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontWeight: 600 }}>Bloom Distribution:</span>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                {Object.entries(structure.bloomDistribution).map(([level, count]) => (
                  <span
                    key={level}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#fff',
                      border: '1px solid #2196f3',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {level}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Problems Grid */}
          <div>
            <h3 style={{ marginBottom: '12px' }}>🎯 Extracted Problems</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {structure.sections.flatMap((section) =>
                section.problems.map((problem) => (
                  <ProblemCard
                    key={problem.problemId}
                    problem={problem}
                    isExpanded={expandedProblem === problem.problemId}
                    onToggle={() => toggleProblem(problem.problemId)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProblemCardProps {
  problem: ExtractedProblem;
  isExpanded: boolean;
  onToggle: () => void;
}

function ProblemCard({ problem, isExpanded, onToggle }: ProblemCardProps) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#f5f5f5',
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
        <div>
          <strong>{problem.sectionId} → {problem.problemId}</strong>
          <span style={{ marginLeft: '12px', color: '#666', fontSize: '12px' }}>
            {problem.problemType}
          </span>
          {problem.hasTips && <span style={{ marginLeft: '12px', color: '#4caf50', fontWeight: 600 }}>💡 Has Tips</span>}
        </div>
        <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '16px', borderTop: '1px solid #eee' }}>
          {/* Problem Text */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ marginTop: 0, marginBottom: '8px', fontSize: '12px', color: '#666' }}>
              <strong>Problem Text:</strong>
            </p>
            <p
              style={{
                margin: 0,
                padding: '12px',
                backgroundColor: '#f9f9f9',
                borderRadius: '4px',
                fontSize: '13px',
                lineHeight: '1.4',
              }}
            >
              {problem.text}
            </p>
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {/* Core Traits */}
            <MetadataBox label="Bloom Levels" value={problem.bloomLevels.join(', ')} />
            <MetadataBox label="Problem Type" value={problem.problemType} />
            <MetadataBox label="Is Multipart" value={problem.isMultipart ? 'Yes' : 'No'} />
            <MetadataBox label="Has Tips" value={problem.hasTips ? '✓ Yes' : 'No'} highlight={problem.hasTips} />

            {/* Question Type Detection */}
            <MetadataBox 
              label="Detected Question Type" 
              value={`${problem.detectedQuestionType} (${(problem.questionTypeConfidence * 100).toFixed(0)}%)`}
              score={problem.questionTypeConfidence}
            />

            {/* Scores */}
            <MetadataBox label="Complexity" value={problem.complexity.toFixed(3)} score={problem.complexity} />
            <MetadataBox label="Novelty" value={problem.novelty.toFixed(3)} score={problem.novelty} />
            <MetadataBox label="Similarity" value={problem.similarity.toFixed(3)} score={problem.similarity} />
            <MetadataBox
              label="Linguistic Complexity"
              value={(problem.linguisticComplexity || 0).toFixed(3)}
              score={problem.linguisticComplexity || 0}
            />

            {/* Other */}
            <MetadataBox label="Length (words)" value={String(problem.length)} />
            <MetadataBox label="Est. Time (min)" value={String(problem.estimatedTimeMinutes)} />
          </div>

          {/* Subparts */}
          {problem.subparts.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <strong style={{ fontSize: '12px' }}>Subparts ({problem.subparts.length}):</strong>
              <div style={{ marginTop: '8px', display: 'grid', gap: '8px' }}>
                {problem.subparts.map((subpart) => (
                  <div
                    key={subpart.id}
                    style={{
                      padding: '8px',
                      backgroundColor: '#f0f4ff',
                      borderLeft: '3px solid #5b7cfa',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                  >
                    <strong>({subpart.id})</strong> {subpart.text.substring(0, 100)}...
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                      Bloom: {subpart.bloomLevels.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MetadataBoxProps {
  label: string;
  value: string;
  score?: number;
  highlight?: boolean;
}

function MetadataBox({ label, value, score, highlight }: MetadataBoxProps) {
  let backgroundColor = '#f9f9f9';
  let borderColor = '#ddd';

  if (highlight) {
    backgroundColor = '#c8e6c9';
    borderColor = '#4caf50';
  } else if (score !== undefined) {
    // Color code by score: red (0) → yellow (0.5) → green (1)
    const hue = score * 120; // 0=red, 120=green
    const lightness = 90 - score * 20; // 90% light at 0, 70% at 1
    backgroundColor = `hsl(${hue}, 80%, ${lightness}%)`;
    borderColor = `hsl(${hue}, 80%, ${lightness - 10}%)`;
  }

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        fontSize: '12px',
      }}
    >
      <div style={{ color: '#666', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: '14px' }}>{value}</div>
    </div>
  );
}
