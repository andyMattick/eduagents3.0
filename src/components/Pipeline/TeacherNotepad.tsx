/**
 * Teacher Notepad + Settings View
 * 
 * Full-page view with tabbed interface:
 * - Notes: Persistent notepad for capturing thoughts and observations
 * - AI Settings: Configure AI mode (mock vs real) and API settings
 * 
 * Accessible via top navigation tab
 */

import React, { useState } from 'react';
import { useNotepad } from '../../hooks/useNotepad';
import { AISettings } from '../AISettings';
import { ThemeToggle } from '../ThemeToggle';
import './TeacherNotepad.css';

type NotepandTab = 'notes' | 'ai-settings';

export const TeacherNotepad: React.FC = () => {
  const { entries, addEntry, removeEntry, clearAll, exportNotes } = useNotepad();
  const [activeTab, setActiveTab] = useState<NotepandTab>('notes');
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
    <div className="notepad-full-view">
      {/* Page Header */}
      <div className="notepad-page-header">
        <div className="notepad-page-title">
          <h1>{activeTab === 'notes' ? 'Teacher Notepad' : 'AI Settings'}</h1>
          {activeTab === 'notes' && entries.length > 0 && (
            <span className="notepad-page-badge">{entries.length} notes</span>
          )}
        </div>
        <ThemeToggle />
      </div>

      {/* Tabs */}
      <div className="notepad-tabs-fullpage">
        <button
          className={`notepad-tab-fullpage ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Notes & Observations
        </button>
        <button
          className={`notepad-tab-fullpage ${activeTab === 'ai-settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-settings')}
        >
          ⚙️ AI Settings
        </button>
      </div>

      {/* Content */}
      <div className="notepad-fullpage-content">
        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="notepad-notes-wrapper">
            {/* Input Section */}
            <div className="notepad-input-section">
              <div className="notepad-input-label">
                <label>Add New Note</label>
              </div>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Add a note, observation, or suggestion..."
                className="notepad-textarea-fullpage"
                rows={4}
              />
              <div className="notepad-controls-fullpage">
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
            <div className="notepad-list-fullpage">
              <div className="notepad-list-header">
                <h3>Notes ({entries.length})</h3>
                {entries.length > 0 && (
                  <div className="notepad-list-actions">
                    <button onClick={handleExport} className="notepad-export-btn">
                      📥 Export
                    </button>
                    <button onClick={clearAll} className="notepad-clear-btn">
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {entries.length === 0 ? (
                <p className="notepad-empty-fullpage">
                  No notes yet. Start adding observations, ideas, and suggestions!
                </p>
              ) : (
                <div className="notepad-items-grid">
                  {entries.map((entry) => (
                    <div key={entry.id} className="notepad-item-fullpage">
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Settings Tab */}
        {activeTab === 'ai-settings' && (
          <div className="notepad-ai-settings-fullpage">
            <AISettings embedded={true} />
          </div>
        )}
      </div>
    </div>
  );
};
