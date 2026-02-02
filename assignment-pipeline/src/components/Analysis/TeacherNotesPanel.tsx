import React, { useState } from 'react';
import { TeacherNote, PeerReviewComment } from '../../agents/analysis/types';

interface TeacherNotesPanelProps {
  comments: PeerReviewComment[];
  onNoteResolved: (note: TeacherNote) => void;
  onAIRewrite: (comment: PeerReviewComment) => Promise<string>;
}

export function TeacherNotesPanel({
  comments,
  onNoteResolved,
  onAIRewrite,
}: TeacherNotesPanelProps) {
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const handleAIFix = async (comment: PeerReviewComment) => {
    setResolving(comment.id);
    try {
      const replacementText = await onAIRewrite(comment);
      
      const newNote: TeacherNote = {
        id: `note-${Date.now()}`,
        tags: comment.tags,
        section: comment.section,
        originalText: comment.comment,
        suggestion: comment.suggestion,
        resolution: 'ai-resolved',
        replacementText,
        timestamp: new Date().toISOString(),
      };

      setNotes([...notes, newNote]);
      onNoteResolved(newNote);
    } catch (err) {
      alert('Failed to generate AI rewrite');
    } finally {
      setResolving(null);
    }
  };

  const handleTeacherFix = (comment: PeerReviewComment) => {
    setEditingId(comment.id);
  };

  const handleSaveTeacherFix = (comment: PeerReviewComment, replacementText: string) => {
    if (!replacementText.trim()) {
      alert('Please enter replacement text');
      return;
    }

    const newNote: TeacherNote = {
      id: `note-${Date.now()}`,
      tags: comment.tags,
      section: comment.section,
      originalText: comment.comment,
      suggestion: comment.suggestion,
      resolution: 'teacher-resolved',
      replacementText,
      timestamp: new Date().toISOString(),
    };

    setNotes([...notes, newNote]);
    onNoteResolved(newNote);
    setEditingId(null);
  };

  const resolvedCount = notes.length;
  const pendingCount = comments.length - resolvedCount;

  const panelStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #dee2e6',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #dee2e6',
  };

  const statsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  };

  const statBadgeStyle = (color: string): React.CSSProperties => ({
    backgroundColor: color,
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  });

  const commentListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const commentItemStyle = (severity: 'low' | 'medium' | 'high'): React.CSSProperties => {
    const severityColors = {
      low: '#e7f3ff',
      medium: '#fff3e0',
      high: '#ffebee',
    };
    return {
      backgroundColor: severityColors[severity],
      border: `1px solid ${severity === 'high' ? '#ef5350' : severity === 'medium' ? '#ff9800' : '#2196f3'}`,
      borderRadius: '6px',
      padding: '12px',
      cursor: 'pointer',
    };
  };

  const tagStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#e0e0e0',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    marginRight: '6px',
    marginBottom: '6px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginRight: '8px',
  };

  const aiButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#2196f3',
    color: 'white',
  };

  const teacherButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#4caf50',
    color: 'white',
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0 }}>📝 Teacher Notes & Peer Review</h3>
        <div style={statsStyle}>
          <div style={statBadgeStyle('#ff9800')}>
            {pendingCount} Pending
          </div>
          <div style={statBadgeStyle('#4caf50')}>
            {resolvedCount} Resolved
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <p style={{ color: '#666', margin: 0 }}>No peer review comments. Your assignment looks great!</p>
      ) : (
        <div style={commentListStyle}>
          {comments.map(comment => {
            const isResolved = notes.some(n => n.originalText === comment.comment);
            const isEditing = editingId === comment.id;

            return (
              <div
                key={comment.id}
                style={{
                  ...commentItemStyle(comment.severity),
                  opacity: isResolved ? 0.6 : 1,
                  pointerEvents: isResolved ? 'none' : 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#333' }}>
                      {isResolved && '✓ '} {comment.section}
                    </p>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '13px' }}>
                      {comment.comment}
                    </p>
                    <div style={{ marginBottom: '8px' }}>
                      {comment.tags.map((tag, idx) => (
                        <span key={idx} style={tagStyle}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
                      💡 Suggestion: {comment.suggestion}
                    </p>

                    {isEditing && (
                      <div style={{ marginBottom: '12px' }}>
                        <textarea
                          placeholder="Enter your replacement text..."
                          rows={3}
                          defaultValue=""
                          id={`edit-${comment.id}`}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            boxSizing: 'border-box',
                            marginBottom: '8px',
                          }}
                        />
                        <div>
                          <button
                            onClick={() => {
                              const text = (document.getElementById(`edit-${comment.id}`) as HTMLTextAreaElement)?.value;
                              handleSaveTeacherFix(comment, text);
                            }}
                            style={{ ...buttonStyle, backgroundColor: '#4caf50', color: 'white' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ ...buttonStyle, backgroundColor: '#999', color: 'white' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {!isEditing && !isResolved && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAIFix(comment)}
                          disabled={resolving === comment.id}
                          style={{
                            ...aiButtonStyle,
                            opacity: resolving === comment.id ? 0.6 : 1,
                            cursor: resolving === comment.id ? 'wait' : 'pointer',
                          }}
                        >
                          {resolving === comment.id ? '⏳ AI Fixing...' : '🤖 Let AI Fix It'}
                        </button>
                        <button
                          onClick={() => handleTeacherFix(comment)}
                          style={teacherButtonStyle}
                        >
                          ✋ I'll Fix It
                        </button>
                      </div>
                    )}

                    {isResolved && (
                      <div style={{ padding: '8px', backgroundColor: '#e8f5e9', borderRadius: '4px', fontSize: '13px' }}>
                        ✓ Resolved
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
