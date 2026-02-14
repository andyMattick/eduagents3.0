/**
 * Problem Notes Component
 * 
 * Allows teachers to add, view, edit, and delete notes for specific problems.
 * Integrated inline during PROBLEM_ANALYSIS step.
 */

import React, { useState, useEffect } from 'react';
import {
  saveTeacherNote,
  getProblemNotes,
  updateTeacherNote,
  deleteTeacherNote,
} from '../../services/teacherNotesService';
import { TeacherNote } from '../../types/teacherNotes';
import './ProblemNotes.css';

interface ProblemNotesProps {
  problemId: string;
  documentId: string;
  teacherId: string;
  onNoteSaved?: () => void;
  isCompact?: boolean; // Compact mode for inline display
}

export function ProblemNotes({
  problemId,
  documentId,
  teacherId,
  onNoteSaved,
  isCompact = false,
}: ProblemNotesProps) {
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState<'clarity' | 'difficulty' | 'alignment' | 'typo' | 'other'>('other');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [problemId, documentId, teacherId]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const problemNotes = await getProblemNotes(documentId, problemId, teacherId);
      setNotes(problemNotes);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load notes';
      setError(errorMsg);
      console.error('Failed to load problem notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setIsLoading(true);
      const savedNote = await saveTeacherNote(teacherId, {
        documentId,
        problemId,
        note: newNote,
        category,
      });
      setNotes([...notes, savedNote]);
      setNewNote('');
      setCategory('other');
      setError(null);
      onNoteSaved?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save note';
      setError(errorMsg);
      console.error('Failed to save problem note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingText.trim()) return;

    try {
      setIsLoading(true);
      const updatedNote = await updateTeacherNote(noteId, teacherId, {
        note: editingText,
      });
      setNotes(notes.map((n) => (n.id === noteId ? updatedNote : n)));
      setEditingNoteId(null);
      setEditingText('');
      setError(null);
      onNoteSaved?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update note';
      setError(errorMsg);
      console.error('Failed to update problem note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      setIsLoading(true);
      await deleteTeacherNote(noteId, teacherId);
      setNotes(notes.filter((n) => n.id !== noteId));
      setError(null);
      onNoteSaved?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMsg);
      console.error('Failed to delete problem note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (note: TeacherNote) => {
    setEditingNoteId(note.id);
    setEditingText(note.note);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const categoryColor = (cat?: string) => {
    switch (cat) {
      case 'clarity':
        return '#e3f2fd';
      case 'difficulty':
        return '#fff3e0';
      case 'alignment':
        return '#f3e5f5';
      case 'typo':
        return '#e8f5e9';
      default:
        return '#f5f5f5';
    }
  };

  const categoryLabel = (cat?: string) => {
    const labels: Record<string, string> = {
      clarity: '📝 Clarity',
      difficulty: '⚡ Difficulty',
      alignment: '🎯 Alignment',
      typo: '🔍 Typo',
      other: '💬 Note',
    };
    return labels[cat || 'other'] || 'Note';
  };

  if (isCompact && notes.length === 0 && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#666',
        }}
      >
        + Add Note
      </button>
    );
  }

  return (
    <div className="problem-notes-container" style={{ marginTop: '12px' }}>
      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '12px',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      {/* Existing notes */}
      {notes.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
            Notes ({notes.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  backgroundColor: categoryColor(note.category),
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '10px',
                  fontSize: '13px',
                }}
              >
                {editingNoteId === note.id ? (
                  <>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px',
                        border: '1px solid #999',
                        borderRadius: '3px',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        marginBottom: '8px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={isLoading}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {categoryLabel(note.category)}
                        </div>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          {note.note}
                        </p>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                          {new Date(note.createdAt).toLocaleDateString()} at{' '}
                          {new Date(note.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                        <button
                          onClick={() => handleEditClick(note)}
                          style={{
                            padding: '2px 6px',
                            fontSize: '11px',
                            backgroundColor: 'transparent',
                            color: '#0066cc',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={isLoading}
                          style={{
                            padding: '2px 6px',
                            fontSize: '11px',
                            backgroundColor: 'transparent',
                            color: '#cc0000',
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new note */}
      <div style={{ borderTop: notes.length > 0 ? '1px solid #ddd' : 'none', paddingTop: notes.length > 0 ? '12px' : 0 }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
          Add New Note
        </label>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            disabled={isLoading}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="other">General Note</option>
            <option value="clarity">Clarity Issue</option>
            <option value="difficulty">Difficulty Concern</option>
            <option value="alignment">Alignment Issue</option>
            <option value="typo">Typo/Error</option>
          </select>
        </div>

        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this problem..."
          disabled={isLoading}
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '8px',
            fontSize: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'inherit',
            marginBottom: '8px',
            boxSizing: 'border-box',
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'text',
          }}
        />

        <button
          onClick={handleAddNote}
          disabled={isLoading || !newNote.trim()}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor:
              isLoading || !newNote.trim()
                ? 'not-allowed'
                : 'pointer',
            opacity: isLoading || !newNote.trim() ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Saving...' : 'Save Note'}
        </button>

        {isCompact && isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              marginLeft: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Collapse
          </button>
        )}
      </div>
    </div>
  );
}
