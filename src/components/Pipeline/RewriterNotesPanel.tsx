import { useState } from 'react';
import './RewriterNotesPanel.css';

export interface RewriterNote {
  id: string;
  problemNumber?: number;
  category: 'difficulty' | 'clarity' | 'bloom-level' | 'novelty' | 'coverage' | 'scaffold' | 'wording' | 'other';
  priority: 'high' | 'medium' | 'low';
  note: string;
  timestamp: string;
}

interface RewriterNotesPanelProps {
  problemCount?: number;
  onNotesChange?: (notes: RewriterNote[]) => void;
}

/**
 * Rewriter Notes Panel
 * Dedicated interface for teachers to organize notes about desired changes before rewriting
 * Allows categorized, prioritized feedback at problem or assignment level
 */
export function RewriterNotesPanel({ problemCount = 0, onNotesChange }: RewriterNotesPanelProps) {
  const [notes, setNotes] = useState<RewriterNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RewriterNote['category']>('clarity');
  const [selectedPriority, setSelectedPriority] = useState<RewriterNote['priority']>('medium');
  const [selectedProblem, setSelectedProblem] = useState<number | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<RewriterNote['category'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<RewriterNote['priority'] | 'all'>('all');

  const categories: Array<{ id: RewriterNote['category']; label: string; icon: string }> = [
    { id: 'difficulty', label: 'Difficulty Level', icon: '📊' },
    { id: 'clarity', label: 'Clarity/Wording', icon: '💡' },
    { id: 'bloom-level', label: "Bloom's Level", icon: '🎯' },
    { id: 'novelty', label: 'Repetition (Novelty)', icon: '🔄' },
    { id: 'coverage', label: 'Coverage/Scope', icon: '📚' },
    { id: 'scaffold', label: 'Scaffolding', icon: '🪜' },
    { id: 'wording', label: 'Wording/Ambiguity', icon: '❓' },
    { id: 'other', label: 'Other', icon: '⭐' },
  ];

  const priorities: Array<{ id: RewriterNote['priority']; label: string; color: string }> = [
    { id: 'high', label: 'High Priority', color: '#ff6b6b' },
    { id: 'medium', label: 'Medium Priority', color: '#ffa500' },
    { id: 'low', label: 'Low Priority', color: '#51cf66' },
  ];

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: RewriterNote = {
      id: `note-${Date.now()}`,
      problemNumber: selectedProblem !== 'all' ? selectedProblem : undefined,
      category: selectedCategory,
      priority: selectedPriority,
      note: newNote.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedNotes = [...notes, note];
    setNotes(updatedNotes);
    onNotesChange?.(updatedNotes);

    // Reset form
    setNewNote('');
    setSelectedCategory('clarity');
    setSelectedPriority('medium');
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    onNotesChange?.(updatedNotes);
  };

  const filteredNotes = notes.filter(note => {
    const categoryMatch = filterCategory === 'all' || note.category === filterCategory;
    const priorityMatch = filterPriority === 'all' || note.priority === filterPriority;
    return categoryMatch && priorityMatch;
  });

  const highPriorityCount = notes.filter(n => n.priority === 'high').length;
  const unreadNotes = notes.length;

  const getPriorityColor = (priority: RewriterNote['priority']) => {
    switch (priority) {
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return '#ffa500';
      case 'low':
        return '#51cf66';
    }
  };

  return (
    <div className="rewriter-notes-panel">
      {/* Header */}
      <div className="rnp-header">
        <div className="rnp-header-title">
          <h2>📝 Rewriter Notes</h2>
          <p>Organize your feedback for the AI rewriting process</p>
        </div>
        <div className="rnp-stats">
          {highPriorityCount > 0 && (
            <div className="rnp-stat high">
              <span className="rnp-stat-icon">⚡</span>
              <span className="rnp-stat-label">{highPriorityCount} High Priority</span>
            </div>
          )}
          <div className="rnp-stat">
            <span className="rnp-stat-icon">📌</span>
            <span className="rnp-stat-label">{unreadNotes} Total Notes</span>
          </div>
        </div>
      </div>

      {/* Add New Note Section */}
      <div className="rnp-input-section">
        <div className="rnp-input-title">Add a New Note</div>

        {/* Problem Selection */}
        {problemCount > 0 && (
          <div className="rnp-form-group">
            <label htmlFor="problem-select" className="rnp-label">
              <span className="rnp-label-icon">📌</span>
              Apply to Problem
            </label>
            <select
              id="problem-select"
              value={selectedProblem}
              onChange={(e) =>
                setSelectedProblem(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
              }
              className="rnp-select"
            >
              <option value="all">All Problems</option>
              {Array.from({ length: problemCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Problem {i + 1}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Selection */}
        <div className="rnp-form-group">
          <label className="rnp-label">
            <span className="rnp-label-icon">🏷️</span>
            Category
          </label>
          <div className="rnp-category-grid">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rnp-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              >
                <span className="rnp-cat-icon">{cat.icon}</span>
                <span className="rnp-cat-label">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Priority Selection */}
        <div className="rnp-form-group">
          <label className="rnp-label">
            <span className="rnp-label-icon">🎯</span>
            Priority
          </label>
          <div className="rnp-priority-grid">
            {priorities.map((pri) => (
              <button
                key={pri.id}
                onClick={() => setSelectedPriority(pri.id)}
                className={`rnp-priority-btn ${selectedPriority === pri.id ? 'active' : ''}`}
                style={{
                  borderColor: selectedPriority === pri.id ? pri.color : undefined,
                  backgroundColor: selectedPriority === pri.id ? `${pri.color}10` : undefined,
                }}
              >
                <span
                  className="rnp-priority-indicator"
                  style={{ backgroundColor: pri.color }}
                ></span>
                {pri.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note Input */}
        <div className="rnp-form-group">
          <label htmlFor="note-input" className="rnp-label">
            <span className="rnp-label-icon">✍️</span>
            Your Note
          </label>
          <textarea
            id="note-input"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Describe the change you'd like... (e.g., 'Simplify the wording to match 6th grade reading level')"
            className="rnp-textarea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleAddNote();
              }
            }}
          />
          <div className="rnp-textarea-hint">
            {newNote.length} characters (Ctrl+Enter to add)
          </div>
        </div>

        <button
          onClick={handleAddNote}
          disabled={!newNote.trim()}
          className="rnp-add-btn"
        >
          ✓ Add Note
        </button>
      </div>

      {/* Filter Section */}
      {notes.length > 0 && (
        <div className="rnp-filter-section">
          <div className="rnp-filter-title">Filter Notes</div>
          <div className="rnp-filters">
            <div className="rnp-filter-group">
              <label htmlFor="filter-category" className="rnp-filter-label">Category:</label>
              <select
                id="filter-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="rnp-filter-select"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rnp-filter-group">
              <label htmlFor="filter-priority" className="rnp-filter-label">Priority:</label>
              <select
                id="filter-priority"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="rnp-filter-select"
              >
                <option value="all">All Priorities</option>
                {priorities.map((pri) => (
                  <option key={pri.id} value={pri.id}>
                    {pri.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="rnp-notes-list">
        {filteredNotes.length === 0 && notes.length === 0 ? (
          <div className="rnp-empty-state">
            <div className="rnp-empty-icon">📝</div>
            <div className="rnp-empty-title">No notes yet</div>
            <p className="rnp-empty-description">
              Add notes to guide the rewriting process. Be specific about what needs to change!
            </p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="rnp-empty-state">
            <div className="rnp-empty-icon">🔍</div>
            <div className="rnp-empty-title">No matching notes</div>
            <p className="rnp-empty-description">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="rnp-notes">
            {filteredNotes.map((note) => {
              const category = categories.find(c => c.id === note.category);
              const priority = priorities.find(p => p.id === note.priority);
              return (
                <div key={note.id} className={`rnp-note rnp-note-${note.priority}`}>
                  <div className="rnp-note-header">
                    <div className="rnp-note-meta">
                      <span className="rnp-note-category">
                        {category?.icon} {category?.label}
                      </span>
                      {note.problemNumber && (
                        <span className="rnp-note-problem">Problem {note.problemNumber}</span>
                      )}
                      <span
                        className="rnp-note-priority"
                        style={{ color: getPriorityColor(note.priority) }}
                      >
                        {priority?.label}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="rnp-note-delete"
                      title="Delete note"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="rnp-note-content">{note.note}</div>
                  <div className="rnp-note-footer">
                    {new Date(note.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {notes.length > 0 && (
        <div className="rnp-summary">
          <div className="rnp-summary-content">
            <div className="rnp-summary-item">
              <span className="rnp-summary-label">Total Notes:</span>
              <span className="rnp-summary-value">{notes.length}</span>
            </div>
            <div className="rnp-summary-item">
              <span className="rnp-summary-label">High Priority:</span>
              <span className="rnp-summary-value" style={{ color: '#ff6b6b' }}>
                {notes.filter(n => n.priority === 'high').length}
              </span>
            </div>
            <div className="rnp-summary-item">
              <span className="rnp-summary-label">Categories:</span>
              <span className="rnp-summary-value">
                {new Set(notes.map(n => n.category)).size} types
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
