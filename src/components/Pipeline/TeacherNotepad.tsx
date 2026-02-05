/**
 * Floating Teacher Notepad Component
 * 
 * Persistent notepad that floats across all pipeline steps
 * Teachers can capture thoughts, observations, and refinement ideas
 * Collapsible, sticky-positioned, exportable
 */

import React, { useState } from 'react';
import { useNotepad } from '../../hooks/useNotepad';
import { ThemeToggle } from '../ThemeToggle';
import './TeacherNotepad.css';

export const TeacherNotepad: React.FC = () => {
  const { entries, addEntry, removeEntry, clearAll, exportNotes } = useNotepad();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTag, setNewTag] = useState<'observation' | 'suggestion' | 'fix' | 'todo' | ''>('');

  const handleAddNote = () => {
    if (!newText.trim()) return;
    addEntry(newText, (newTag as any) || undefined);
    setNewText('');
    setNewTag('');
  };

  const handleExport = () => {
    const exported = exportNotes();
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-notes-${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tagColor = (tag?: string) => {
    switch (tag) {
      case 'observation':
        return '#5b7cfa';
      case 'suggestion':
        return '#ff922b';
      case 'fix':
        return '#51cf66';
      case 'todo':
        return '#ffd43b';
      default:
        return '#868e96';
    }
  };

  return (
    <div className={`notepad-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="notepad-header">
        <div className="notepad-title">
          <span className="notepad-icon">📝</span>
          Teacher Notepad
          {entries.length > 0 && <span className="notepad-badge">{entries.length}</span>}
        </div>
        <div className="notepad-header-actions">
          <ThemeToggle />
          <button
            className="notepad-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="notepad-content">
          {/* Input Section */}
          <div className="notepad-input-section">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Add a note, observation, or suggestion..."
              className="notepad-textarea"
              rows={3}
            />
            <div className="notepad-controls">
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value as any)}
                className="notepad-tag-select"
              >
                <option value="">No tag</option>
                <option value="observation">Observation</option>
                <option value="suggestion">Suggestion</option>
                <option value="fix">Fix</option>
                <option value="todo">Todo</option>
              </select>
              <button
                onClick={handleAddNote}
                disabled={!newText.trim()}
                className="notepad-add-btn"
              >
                Add Note
              </button>
            </div>
          </div>

          {/* Notes List */}
          <div className="notepad-list">
            {entries.length === 0 ? (
              <p className="notepad-empty">No notes yet. Start adding observations and ideas!</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="notepad-item">
                  <div className="notepad-item-header">
                    <div className="notepad-item-meta">
                      {entry.tag && (
                        <span
                          className="notepad-tag"
                          style={{ backgroundColor: tagColor(entry.tag) }}
                        >
                          {entry.tag}
                        </span>
                      )}
                      <span className="notepad-time">{entry.timestamp}</span>
                    </div>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="notepad-delete-btn"
                      title="Delete note"
                    >
                      ×
                    </button>
                  </div>
                  <p className="notepad-item-text">{entry.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {entries.length > 0 && (
            <div className="notepad-footer">
              <button onClick={handleExport} className="notepad-export-btn">
                📥 Export Notes
              </button>
              <button onClick={clearAll} className="notepad-clear-btn">
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
