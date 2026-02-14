import React, { useState } from 'react';
import './RewriteNotesCapturePanel.css';

interface RewriteNotesCapturePanelProps {
  existingNotes?: string;
  onNotesChange: (notes: string) => void;
  isLoading?: boolean;
}

/**
 * Rewrite Notes Capture Panel
 * Allows teachers to capture specific feedback about what needs to change
 * This drives the rewriting process
 */
export function RewriteNotesCapturePanel({
  existingNotes = '',
  onNotesChange,
  isLoading = false,
}: RewriteNotesCapturePanelProps) {
  const [notes, setNotes] = useState(existingNotes);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const commonIssues = [
    { id: 'clarity', label: 'Clarity Issues', icon: '💡' },
    { id: 'difficulty', label: 'Too Difficult', icon: '🔴' },
    { id: 'multi-part', label: 'Multi-part Questions', icon: '📋' },
    { id: 'scaffold', label: 'Add Scaffolding', icon: '🪜' },
    { id: 'accessibility', label: 'Accessibility', icon: '♿' },
    { id: 'wording', label: 'Wording/Ambiguity', icon: '❓' },
  ];

  const handleNotesChange = (text: string) => {
    setNotes(text);
    onNotesChange(text);
  };

  const handleTagClick = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(t => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);

    // Add tag info to notes if not already present
    const selectedIssue = commonIssues.find(i => i.id === tagId);
    if (selectedIssue && !notes.toLowerCase().includes(selectedIssue.label.toLowerCase())) {
      const additionalNote = `\n- ${selectedIssue.label}`;
      handleNotesChange(notes + additionalNote);
    }
  };

  const handleClear = () => {
    setNotes('');
    setSelectedTags([]);
    onNotesChange('');
  };

  return (
    <div className="rncp-container">
      <div className="rncp-header">
        <h3>📝 Capture Rewrite Notes</h3>
        <p className="rncp-subtitle">
          What specific feedback will drive this rewrite? These notes guide the AI.
        </p>
      </div>

      {/* Quick Issue Tags */}
      <div className="rncp-tags-section">
        <label className="rncp-tags-label">Common Issues</label>
        <div className="rncp-tags">
          {commonIssues.map(issue => (
            <button
              key={issue.id}
              onClick={() => handleTagClick(issue.id)}
              className={`rncp-tag ${selectedTags.includes(issue.id) ? 'selected' : ''}`}
            >
              <span className="rncp-tag-icon">{issue.icon}</span>
              <span className="rncp-tag-label">{issue.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes Textarea */}
      <div className="rncp-textarea-container">
        <label htmlFor="rewrite-notes" className="rncp-label">
          Detailed Notes
        </label>
        <textarea
          id="rewrite-notes"
          className="rncp-textarea"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder={`Describe specific changes needed:
• Question 1: Simplify the wording
• Question 3: Break into two separate questions
• Overall: Add more scaffolding for struggling students`}
          disabled={isLoading}
        />
        <div className="rncp-char-count">
          {notes.length} characters
        </div>
      </div>

      {/* Actions */}
      <div className="rncp-actions">
        <button
          onClick={handleClear}
          className="rncp-btn-clear"
          disabled={!notes && selectedTags.length === 0 || isLoading}
        >
          Clear Notes
        </button>
        <div className="rncp-status">
          {notes || selectedTags.length > 0 ? (
            <span className="rncp-status-ready">✓ Notes captured</span>
          ) : (
            <span className="rncp-status-empty">Add notes to guide rewrite</span>
          )}
        </div>
      </div>
    </div>
  );
}
