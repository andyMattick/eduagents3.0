/**
 * Clickable Tag System Component
 * 
 * Interactive tags (Bloom, complexity, performance) with context menus
 * Tags open options for suggestions, manual edits, and notepad integration
 */

import React, { useState, useRef, useEffect } from 'react';
import './ClickableTagSystem.css';

export interface TagAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

interface ClickableTagProps {
  label: string;
  type: 'bloom' | 'complexity' | 'novelty' | 'performance' | 'feedback';
  value?: number | string;
  actions?: TagAction[];
  onAction?: (actionId: string) => void;
}

export const ClickableTag: React.FC<ClickableTagProps> = ({
  label,
  type,
  value,
  actions = [],
  onAction,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tagClassMap = {
    bloom: 'tag-bloom',
    complexity: 'tag-complexity',
    novelty: 'tag-novelty',
    performance: 'tag-performance',
    feedback: 'tag-feedback',
  };

  const handleActionClick = (actionId: string) => {
    onAction?.(actionId);
    setShowMenu(false);
  };

  return (
    <div className="clickable-tag-wrapper" ref={menuRef}>
      <button
        className={`clickable-tag ${tagClassMap[type]}`}
        onClick={() => setShowMenu(!showMenu)}
        title={`Click for options related to ${label}`}
      >
        {label}
        {value !== undefined && <span className="tag-value">{value}</span>}
        {actions.length > 0 && <span className="tag-indicator">⋯</span>}
      </button>

      {showMenu && actions.length > 0 && (
        <div className="tag-menu">
          <div className="tag-menu-header">{label}</div>
          <div className="tag-menu-items">
            {actions.map((action) => (
              <button
                key={action.id}
                className="tag-menu-item"
                onClick={() => handleActionClick(action.id)}
              >
                <span className="tag-menu-icon">{action.icon}</span>
                <span className="tag-menu-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Tag System Utility Component
 * Manages multiple tags and orchestrates interactions
 */
interface TagSystemProps {
  bloomLevel?: string;
  complexity?: number;
  novelty?: number;
  performance?: 'excellent' | 'good' | 'fair' | 'struggling';
  feedbackTags?: string[];
  onBloomSuggest?: (suggestion: string) => void;
  onComplexityAdjust?: (adjustment: 'increase' | 'decrease') => void;
  onAddToNotepad?: (text: string) => void;
  onRequestFix?: () => void;
}

export const TagSystem: React.FC<TagSystemProps> = ({
  bloomLevel,
  complexity,
  novelty,
  performance,
  feedbackTags = [],
  onBloomSuggest,
  onComplexityAdjust,
  onAddToNotepad,
  onRequestFix,
}) => {
  const bloomActions: TagAction[] = bloomLevel
    ? [
        {
          id: 'simplify',
          label: 'Suggest Simpler Level',
          icon: '⬇️',
          action: () => onBloomSuggest?.('Understand'),
        },
        {
          id: 'increase',
          label: 'Suggest Higher Level',
          icon: '⬆️',
          action: () => onBloomSuggest?.('Apply'),
        },
        {
          id: 'edit-manually',
          label: 'Edit Manually',
          icon: '✎',
          action: () => {}, // Edit Bloom level
        },
        {
          id: 'add-note',
          label: 'Add Note',
          icon: '📌',
          action: () => onAddToNotepad?.(`Bloom level: ${bloomLevel}`),
        },
      ]
    : [];

  const complexityActions: TagAction[] = complexity !== undefined
    ? [
        {
          id: 'simplify',
          label: 'Reduce Complexity',
          icon: '⬇️',
          action: () => onComplexityAdjust?.('decrease'),
        },
        {
          id: 'increase',
          label: 'Increase Complexity',
          icon: '⬆️',
          action: () => onComplexityAdjust?.('increase'),
        },
        {
          id: 'add-note',
          label: 'Add Note',
          icon: '📌',
          action: () => onAddToNotepad?.(`Complexity: ${(complexity * 100).toFixed(0)}%`),
        },
      ]
    : [];

  const performanceActions: TagAction[] = performance
    ? [
        {
          id: 'analyze',
          label: 'Analyze Struggles',
          icon: '🔍',
          action: () => {}, // Analyze performance
        },
        {
          id: 'request-fix',
          label: 'Request AI Fix',
          icon: '✨',
          action: () => onRequestFix?.(),
        },
        {
          id: 'add-note',
          label: 'Add Note',
          icon: '📌',
          action: () => onAddToNotepad?.(`Performance: ${performance}`),
        },
      ]
    : [];

  return (
    <div className="tag-system">
      <div className="tag-system-row">
        {bloomLevel && (
          <ClickableTag
            label={bloomLevel}
            type="bloom"
            actions={bloomActions}
            onAction={(actionId) => {
              const action = bloomActions.find((a) => a.id === actionId);
              action?.action();
            }}
          />
        )}

        {complexity !== undefined && (
          <ClickableTag
            label="Complexity"
            type="complexity"
            value={`${(complexity * 100).toFixed(0)}%`}
            actions={complexityActions}
            onAction={(actionId) => {
              const action = complexityActions.find((a) => a.id === actionId);
              action?.action();
            }}
          />
        )}

        {novelty !== undefined && (
          <ClickableTag
            label="Novelty"
            type="novelty"
            value={`${(novelty * 100).toFixed(0)}%`}
          />
        )}

        {performance && (
          <ClickableTag
            label={performance}
            type="performance"
            actions={performanceActions}
            onAction={(actionId) => {
              const action = performanceActions.find((a) => a.id === actionId);
              action?.action();
            }}
          />
        )}
      </div>

      {feedbackTags.length > 0 && (
        <div className="tag-system-feedback">
          {feedbackTags.map((tag, idx) => (
            <ClickableTag key={idx} label={tag} type="feedback" />
          ))}
        </div>
      )}
    </div>
  );
};
