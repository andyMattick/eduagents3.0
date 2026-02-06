import { useState } from 'react';
import { Phase3Goal, Phase3Source } from '../../types/assignmentGeneration';
import './Phase3Selector.css';

interface Phase3SelectorProps {
  onSelect: (goal: Phase3Goal, source: Phase3Source) => void;
  isLoading?: boolean;
}

export function Phase3Selector({ onSelect, isLoading = false }: Phase3SelectorProps) {
  const [selectedGoal, setSelectedGoal] = useState<Phase3Goal | null>(null);
  const [selectedSource, setSelectedSource] = useState<Phase3Source | null>(null);

  const handleGoalSelect = (goal: Phase3Goal) => {
    setSelectedGoal(goal);
    // Auto-proceed if source already selected
    if (selectedSource) {
      onSelect(goal, selectedSource);
    }
  };

  const handleSourceSelect = (source: Phase3Source) => {
    setSelectedSource(source);
    // Auto-proceed if goal already selected
    if (selectedGoal) {
      onSelect(selectedGoal, source);
    }
  };

  return (
    <div className="phase3-selector">
      <h1>📚 What would you like to do?</h1>

      {/* Goal Selection */}
      <div className="phase3-section">
        <h2>Step 1: Select Your Goal</h2>
        <div className="phase3-options">
          <div
            className={`phase3-option ${selectedGoal === 'create' ? 'selected' : ''}`}
            onClick={() => handleGoalSelect('create')}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleGoalSelect('create')}
          >
            <div className="icon">✨</div>
            <div className="title">Create</div>
            <div className="description">
              Generate a new assignment from scratch or from your lesson materials
            </div>
          </div>

          <div
            className={`phase3-option ${selectedGoal === 'analyze' ? 'selected' : ''}`}
            onClick={() => handleGoalSelect('analyze')}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleGoalSelect('analyze')}
          >
            <div className="icon">🔍</div>
            <div className="title">Analyze</div>
            <div className="description">
              Evaluate an existing assignment for Bloom's levels, pacing, and difficulty
            </div>
          </div>

          <div
            className={`phase3-option ${selectedGoal === 'refine' ? 'selected' : ''}`}
            onClick={() => handleGoalSelect('refine')}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleGoalSelect('refine')}
          >
            <div className="icon">✏️</div>
            <div className="title">Refine</div>
            <div className="description">
              Improve an existing assignment with better pacing, scaffolding, and balance
            </div>
          </div>
        </div>
      </div>

      {/* Source Selection */}
      {selectedGoal && (
        <div className="phase3-section phase3-section-fade-in">
          <h2>Step 2: Do You Have Source Materials?</h2>
          <div className="phase3-options">
            <div
              className={`phase3-option ${selectedSource === 'hasNotes' ? 'selected' : ''}`}
              onClick={() => handleSourceSelect('hasNotes')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleSourceSelect('hasNotes')}
            >
              <div className="icon">📄</div>
              <div className="title">Yes, I Have Notes</div>
              <div className="description">
                Upload lesson plans, slides, notes, or raw problems to guide generation
              </div>
            </div>

            <div
              className={`phase3-option ${selectedSource === 'noNotes' ? 'selected' : ''}`}
              onClick={() => handleSourceSelect('noNotes')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleSourceSelect('noNotes')}
            >
              <div className="icon">💡</div>
              <div className="title">No, Just Tell Me</div>
              <div className="description">
                Just provide the topic, grade level, and learning goals
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Behavior Preview */}
      {selectedGoal && selectedSource && (
        <div className="phase3-section phase3-section-fade-in">
          <h2>Here's What Will Happen</h2>
          <div className="phase3-behavior-summary">
            {getBehaviorSummary(selectedGoal, selectedSource)}
          </div>
          <button
            className="phase3-proceed-button"
            onClick={() => onSelect(selectedGoal, selectedSource)}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Let\'s Go →'}
          </button>
        </div>
      )}
    </div>
  );
}

function getBehaviorSummary(goal: Phase3Goal, source: Phase3Source): string {
  const summaries: Record<Phase3Goal, Record<Phase3Source, string>> = {
    create: {
      hasNotes:
        '🎯 I\'ll scan your notes for learning objectives and key concepts, then generate a well-balanced assignment that covers everything. I\'ll score each problem for novelty and how much it assumes prior knowledge.',
      noNotes:
        '🎯 Just tell me the topic, grade level, and what Bloom levels you want. I\'ll create an assignment from scratch with good novelty spacing and complexity balance.',
    },
    analyze: {
      hasNotes:
        '🔍 I\'ll compare your assignment to your notes, showing you the Bloom distribution, pacing, which problems are new vs. familiar, and gaps in the source coverage.',
      noNotes:
        '🔍 I\'ll break down your assignment by Bloom level, estimate time to completion, and flag potential problem areas. (No source comparison available)',
    },
    refine: {
      hasNotes:
        '✏️ I\'ll identify redundant or gappy problems, rebalance Bloom levels, improve scaffolding where needed, and regenerate to better match your notes and objectives.',
      noNotes:
        '✏️ Tell me what to improve (e.g., "add more critical thinking" or "simplify the language") and I\'ll regenerate your assignment with those changes.',
    },
  };

  return summaries[goal][source];
}
