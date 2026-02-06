import './SourceSelector.css';
import { useUserFlow } from '../../hooks/useUserFlow';

/**
 * Step 2: Source Selector
 * User chooses whether they have source documents available
 */
export function SourceSelector() {
  const { goal, setHasSourceDocs } = useUserFlow();

  if (!goal) {
    return null;
  }

  const createMode = goal === 'create';

  return (
    <div className="source-selector">
      <div className="source-selector-container">
        {/* Header */}
        <div className="source-selector-header">
          <button className="back-button" onClick={() => window.history.back()}>
            ← Back
          </button>
          <h1>{createMode ? 'Where will we start?' : 'Do you have source materials?'}</h1>
          <p>
            {createMode
              ? 'Choose how you would like to provide the content for your assignment'
              : 'Select if you are analyzing a new assignment or refining an existing one'}
          </p>
        </div>

        {/* Options */}
        <div className="source-options">
          {/* Option 1: With Source Documents */}
          <button
            className="source-option with-docs-option"
            onClick={() => setHasSourceDocs(true)}
            aria-label="I have source documents"
          >
            <div className="source-option-icon">📁</div>
            <div className="source-option-content">
              <h2>I have source documents</h2>
              <p>
                {createMode
                  ? 'Upload textbooks, articles, or PDFs to extract problems from'
                  : 'Provide source materials and the assignment to analyze together'}
              </p>
            </div>
            <div className="source-option-arrow">→</div>
          </button>

          {/* Option 2: Without Source Documents */}
          <button
            className="source-option without-docs-option"
            onClick={() => setHasSourceDocs(false)}
            aria-label="I don't have source documents"
          >
            <div className="source-option-icon">💡</div>
            <div className="source-option-content">
              <h2>I don't have source documents</h2>
              <p>
                {createMode
                  ? 'Describe your learning objectives and we will generate the assignment'
                  : 'Upload your assignment for analysis and optimization'}
              </p>
            </div>
            <div className="source-option-arrow">→</div>
          </button>
        </div>

        {/* Footer hint */}
        <div className="source-selector-footer">
          <p className="hint">
            {createMode
              ? 'Source documents help create more authentic, contextually-grounded assignments'
              : 'Both options provide comprehensive analysis and optimization'}
          </p>
        </div>
      </div>
    </div>
  );
}
