import React, { useState } from 'react';
import { StudentFeedback } from '../../types/pipeline';

interface TeacherNote {
  id: string;
  source: 'student-feedback' | 'peer-teacher' | 'accessibility';
  personaName: string;
  originalTag: string;
  originalText: string;
  suggestedImprovement: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected' | 'fixed-by-ai' | 'fixed-manually';
  manualEdit?: string;
}

interface TeacherNotesPanelProps {
  studentFeedback: StudentFeedback[];
  analysisQuestions?: Array<{ id: string; text: string }>;
  isLoading?: boolean;
  onApplyFix?: (noteId: string, type: 'ai' | 'manual', content?: string) => void;
}

export function TeacherNotesPanel({
  studentFeedback,
  analysisQuestions,
  isLoading = false,
  onApplyFix,
}: TeacherNotesPanelProps) {
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [noteStatuses, setNoteStatuses] = useState<Record<string, TeacherNote['status']>>({});
  const [manualEdits, setManualEdits] = useState<Record<string, string>>({});

  // Convert feedback into actionable teacher notes
  const generateTeacherNotes = (): TeacherNote[] => {
    const notes: TeacherNote[] = [];
    let noteId = 1;

    studentFeedback.forEach((feedback) => {
      if (feedback.whatCouldBeImproved) {
        notes.push({
          id: `note-${noteId++}`,
          source: 'student-feedback',
          personaName: feedback.studentPersona,
          originalTag: feedback.feedbackType,
          originalText: feedback.content,
          suggestedImprovement: feedback.whatCouldBeImproved,
          tags: feedback.relevantTags || [],
          status: 'pending',
        });
      }

      // If engagement is low, flag it
      if (feedback.engagementScore !== undefined && feedback.engagementScore < 0.6) {
        notes.push({
          id: `note-${noteId++}`,
          source: 'student-feedback',
          personaName: feedback.studentPersona,
          originalTag: 'engagement',
          originalText: `Low engagement (${(feedback.engagementScore * 100).toFixed(0)}%)`,
          suggestedImprovement: 'Consider adding more interactive elements, real-world examples, or clearer connections to student interests',
          tags: ['engagement', 'clarity'],
          status: 'pending',
        });
      }

      // If student struggles with something, flag it
      if (feedback.struggledWith && feedback.struggledWith.length > 0) {
        notes.push({
          id: `note-${noteId++}`,
          source: 'student-feedback',
          personaName: feedback.studentPersona,
          originalTag: 'clarity',
          originalText: `Struggled with: ${feedback.struggledWith.join(', ')}`,
          suggestedImprovement: `Provide additional scaffolding or examples for: ${feedback.struggledWith.join(', ')}`,
          tags: ['clarity', 'support'],
          status: 'pending',
        });
      }
    });

    return notes;
  };

  const notes = generateTeacherNotes();
  const pendingNotes = notes.filter((n) => noteStatuses[n.id] !== 'approved' && noteStatuses[n.id] !== 'rejected');

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApprove = (id: string) => {
    setNoteStatuses((prev) => ({ ...prev, [id]: 'approved' }));
  };

  const handleReject = (id: string) => {
    setNoteStatuses((prev) => ({ ...prev, [id]: 'rejected' }));
  };

  const handleApplyAIFix = (id: string) => {
    setNoteStatuses((prev) => ({ ...prev, [id]: 'fixed-by-ai' }));
    onApplyFix?.(id, 'ai');
  };

  const handleApplyManualFix = (id: string, content: string) => {
    if (!content.trim()) {
      alert('Please enter improvement text');
      return;
    }
    setManualEdits((prev) => ({ ...prev, [id]: content }));
    setNoteStatuses((prev) => ({ ...prev, [id]: 'fixed-manually' }));
    onApplyFix?.(id, 'manual', content);
  };

  const getStatusColor = (status: TeacherNote['status']) => {
    const colors = {
      pending: '#fff3cd',
      approved: '#d4edda',
      rejected: '#f8d7da',
      'fixed-by-ai': '#d1ecf1',
      'fixed-manually': '#d1ecf1',
    };
    return colors[status] || '#f5f5f5';
  };

  const getStatusBorderColor = (status: TeacherNote['status']) => {
    const colors = {
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545',
      'fixed-by-ai': '#17a2b8',
      'fixed-manually': '#17a2b8',
    };
    return colors[status] || '#ddd';
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginTop: '20px',
      }}
    >
      <h3 style={{ marginTop: 0, color: '#333' }}>
        📋 Teacher Notes & Improvements
        {pendingNotes.length > 0 && (
          <span
            style={{
              marginLeft: '12px',
              padding: '4px 8px',
              backgroundColor: '#ffc107',
              color: '#000',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {pendingNotes.length} pending
          </span>
        )}
      </h3>

      {notes.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>
          No improvement notes generated. The assignment looks solid!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notes.map((note) => {
            const isExpanded = expandedNotes[note.id];
            const status = noteStatuses[note.id] || note.status;
            const borderColor = getStatusBorderColor(status);
            const bgColor = getStatusColor(status);

            return (
              <div
                key={note.id}
                style={{
                  padding: '16px',
                  backgroundColor: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header - Always visible */}
                <div
                  onClick={() => toggleNote(note.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '18px' }}>
                        {note.source === 'student-feedback'
                          ? '👤'
                          : note.source === 'peer-teacher'
                            ? '👨‍🏫'
                            : '♿'}
                      </span>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', color: '#333' }}>
                          {note.personaName}
                        </h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                          <strong>Issue:</strong> {note.originalText.substring(0, 60)}...
                        </p>
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            padding: '3px 8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            borderRadius: '12px',
                            color: '#333',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      backgroundColor: borderColor,
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                      marginLeft: '12px',
                    }}
                  >
                    {status.replace('-', ' ')}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${borderColor}` }}>
                    {/* Original Text */}
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                        Original Feedback:
                      </p>
                      <div
                        style={{
                          padding: '10px',
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                          borderLeft: `3px solid ${borderColor}`,
                          borderRadius: '3px',
                          fontSize: '13px',
                          color: '#555',
                          lineHeight: '1.5',
                        }}
                      >
                        {note.originalText}
                      </div>
                    </div>

                    {/* Suggested Improvement */}
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                        ✨ Suggested Improvement:
                      </p>
                      <div
                        style={{
                          padding: '10px',
                          backgroundColor: 'rgba(76, 175, 80, 0.1)',
                          borderLeft: '3px solid #4caf50',
                          borderRadius: '3px',
                          fontSize: '13px',
                          color: '#2e7d32',
                          lineHeight: '1.5',
                        }}
                      >
                        {note.suggestedImprovement}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleApplyAIFix(note.id)}
                          disabled={isLoading}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          🤖 Let AI Fix It
                        </button>

                        <button
                          onClick={() => handleApprove(note.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          ✓ Approve as Is
                        </button>

                        <button
                          onClick={() => handleReject(note.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          ✗ Dismiss
                        </button>
                      </div>
                    )}

                    {status === 'pending' && (
                      <div style={{ marginTop: '12px' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                          Or make your own edit:
                        </p>
                        <textarea
                          value={manualEdits[note.id] || ''}
                          onChange={(e) => setManualEdits((prev) => ({ ...prev, [note.id]: e.target.value }))}
                          placeholder="Enter your improvement..."
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            minHeight: '80px',
                            resize: 'vertical',
                          }}
                        />
                        <button
                          onClick={() => handleApplyManualFix(note.id, manualEdits[note.id] || '')}
                          style={{
                            marginTop: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          📝 Apply My Edit
                        </button>
                      </div>
                    )}

                    {status === 'fixed-by-ai' && (
                      <div
                        style={{
                          padding: '10px',
                          backgroundColor: '#d1ecf1',
                          border: '1px solid #17a2b8',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#0c5460',
                        }}
                      >
                        ✓ Applied AI fix to your assignment
                      </div>
                    )}

                    {status === 'fixed-manually' && (
                      <div
                        style={{
                          padding: '10px',
                          backgroundColor: '#d1ecf1',
                          border: '1px solid #17a2b8',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#0c5460',
                        }}
                      >
                        ✓ Applied your manual edit
                      </div>
                    )}

                    {status === 'approved' && (
                      <div
                        style={{
                          padding: '10px',
                          backgroundColor: '#d4edda',
                          border: '1px solid #28a745',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#155724',
                        }}
                      >
                        ✓ Approved - no changes needed
                      </div>
                    )}

                    {status === 'rejected' && (
                      <div
                        style={{
                          padding: '10px',
                          backgroundColor: '#f8d7da',
                          border: '1px solid #dc3545',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#721c24',
                        }}
                      >
                        ✗ Dismissed
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {notes.length > 0 && (
        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'white', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>Summary</h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              fontSize: '13px',
            }}
          >
            <div>
              <strong>Total Notes:</strong> {notes.length}
            </div>
            <div>
              <strong>Pending:</strong>{' '}
              <span style={{ color: '#ffc107' }}>{pendingNotes.length}</span>
            </div>
            <div>
              <strong>Applied:</strong>{' '}
              <span style={{ color: '#17a2b8' }}>
                {
                  Object.values(noteStatuses).filter(
                    (s) => s === 'fixed-by-ai' || s === 'fixed-manually',
                  ).length
                }
              </span>
            </div>
            <div>
              <strong>Approved:</strong>{' '}
              <span style={{ color: '#28a745' }}>
                {Object.values(noteStatuses).filter((s) => s === 'approved').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
