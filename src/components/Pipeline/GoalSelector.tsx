import './GoalSelector.css';
import { useUserFlow } from '../../hooks/useUserFlow';

/**
 * Step 1: Goal Selector
 * User chooses between creating a new assignment or analyzing/refining an existing one
 */
export function GoalSelector() {
  const { setGoal } = useUserFlow();

  return (
    <div className="goal-selector">
      <div className="goal-selector-container">
        <div className="goal-selector-header">
          <h1>Assignment Studio</h1>
          <p>What would you like to do?</p>
        </div>

        <div className="goal-options">
          {/* Option 1: Create a New Assignment */}
          <button
            className="goal-option create-option"
            onClick={() => setGoal('create')}
            aria-label="Create a new assignment"
          >
            <div className="goal-option-icon">✨</div>
            <div className="goal-option-content">
              <h2>Create a New Assignment</h2>
              <p>Generate a tailored assignment from source materials or learning objectives</p>
            </div>
            <div className="goal-option-arrow">→</div>
          </button>

          {/* Option 2: Analyze or Refine */}
          <button
            className="goal-option analyze-option"
            onClick={() => setGoal('analyze')}
            aria-label="Analyze or refine an existing assignment"
          >
            <div className="goal-option-icon">🔍</div>
            <div className="goal-option-content">
              <h2>Analyze or Refine an Existing Assignment</h2>
              <p>Test your assignment against student personas and optimize difficulty & clarity</p>
            </div>
            <div className="goal-option-arrow">→</div>
          </button>
        </div>

        <div className="goal-selector-footer">
          <p className="hint">You can switch goals at any time from the main menu</p>
        </div>
      </div>
    </div>
  );
}
