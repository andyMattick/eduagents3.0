/**
 * Inline Problem Editor Component
 * 
 * Click-to-edit problem text with live ProblemProfile updates
 * Shows current tags, scores, and allows refinement
 */

import React, { useState, useRef, useEffect } from 'react';
import { ProblemProfile } from '../../types/classroomProfiles';
import './InlineProblemEditor.css';

interface InlineProblemEditorProps {
  problem: ProblemProfile;
  index: number;
  onUpdate: (updatedProblem: ProblemProfile) => void;
  onQuickNote?: (problemId: string, text: string) => void;
}

export const InlineProblemEditor: React.FC<InlineProblemEditorProps> = ({
  problem,
  index,
  onUpdate,
  onQuickNote,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate({
        ...problem,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText('');
    setIsEditing(false);
  };

  const bloomColor = (level: string) => {
    const colorMap: Record<string, string> = {
      'Remember': '#868e96',
      'Understand': '#5b7cfa',
      'Apply': '#748ffc',
      'Analyze': '#ff922b',
      'Evaluate': '#ffd43b',
      'Create': '#51cf66',
    };
    return colorMap[level] || '#868e96';
  };

  return (
    <div className="inline-editor-container">
      <div className="inline-editor-header">
        <span className="inline-editor-index">Question {index + 1}</span>
        {!isEditing && (
          <div className="inline-editor-actions">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-editor-btn inline-editor-edit-btn"
              title="Edit problem"
            >
              ✎ Edit
            </button>
            {onQuickNote && (
              <button
                onClick={() => onQuickNote(problem.ProblemId || `problem_${index}`, '')}
                className="inline-editor-btn inline-editor-note-btn"
                title="Add note"
              >
                📌 Note
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="inline-editor-form">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="inline-editor-textarea"
          />
          <div className="inline-editor-form-actions">
            <button onClick={handleSave} className="inline-editor-save-btn">
              ✓ Save
            </button>
            <button onClick={handleCancel} className="inline-editor-cancel-btn">
              ✕ Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="inline-editor-text">{`Problem #${problem.ProblemId}`}</p>

          <div className="inline-editor-tags">
            <span
              className="inline-editor-tag bloom-tag"
              style={{ backgroundColor: bloomColor(problem.BloomLevel) }}
            >
              {problem.BloomLevel}
            </span>

            {problem.LinguisticComplexity !== undefined && (
              <span className="inline-editor-tag complexity-tag">
                Complexity: {(problem.LinguisticComplexity * 100).toFixed(0)}%
              </span>
            )}

            {problem.NoveltyScore !== undefined && (
              <span className="inline-editor-tag novelty-tag">
                Novelty: {(problem.NoveltyScore * 100).toFixed(0)}%
              </span>
            )}

            {problem.MultiPart && (
              <span className="inline-editor-tag multipart-tag">
                Multi-Part
              </span>
            )}
          </div>

          <div className="inline-editor-metadata">
            <div className="inline-editor-meta-item">
              <span className="meta-label">Length:</span>
              <span className="meta-value">{problem.ProblemLength || 'N/A'} words</span>
            </div>

            {problem.CreativityScore !== undefined && (
              <div className="inline-editor-meta-item">
                <span className="meta-label">Creativity:</span>
                <span className="meta-value">{(problem.CreativityScore * 100).toFixed(0)}%</span>
              </div>
            )}

            {problem.TestType && (
              <div className="inline-editor-meta-item">
                <span className="meta-label">Type:</span>
                <span className="meta-value">{problem.TestType}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
