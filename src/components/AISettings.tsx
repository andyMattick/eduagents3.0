import { useState } from 'react';
import { getCurrentAIMode, setAIMode, getAIConfig } from '../config/aiConfig';
import './AISettings.css';

interface AISettingsProps {
  embedded?: boolean;
}

const AISettingsContent = ({
  currentMode,
  hasApiKey,
  onModeChange,
}: {
  currentMode: 'mock' | 'real';
  hasApiKey: boolean;
  onModeChange: (mode: 'mock' | 'real') => void;
}) => (
  <div className="ai-settings-content">
    {/* Mode Selection */}
    <div className="ai-settings-section">
      <label className="ai-settings-label">
        <span>AI Mode</span>
        <span className="ai-settings-subtitle">Choose between real LLM or mock responses</span>
      </label>

      <div className="ai-settings-options">
        <div
          className={`ai-option ${currentMode === 'mock' ? 'selected' : ''}`}
          onClick={() => onModeChange('mock')}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && onModeChange('mock')}
        >
          <div className="ai-option-icon">🔄</div>
          <div className="ai-option-title">Mock AI</div>
          <div className="ai-option-description">Instant responses for testing</div>
        </div>

        <div
          className={`ai-option ${currentMode === 'real' ? 'selected' : ''} ${
            !hasApiKey ? 'disabled' : ''
          }`}
          onClick={() => hasApiKey && onModeChange('real')}
          role="button"
          tabIndex={hasApiKey ? 0 : -1}
          onKeyPress={(e) => e.key === 'Enter' && hasApiKey && onModeChange('real')}
        >
          <div className="ai-option-icon">✨</div>
          <div className="ai-option-title">Real AI (Gemini)</div>
          <div className="ai-option-description">
            {hasApiKey ? '✅ API Key configured' : '❌ No API Key'}
          </div>
        </div>
      </div>
    </div>

    {/* Current Status */}
    <div className="ai-settings-section ai-settings-status">
      <div className={`ai-status-badge ${currentMode === 'real' && !hasApiKey ? 'warning' : ''}`}>
        {currentMode === 'mock' ? (
          <>
            <span className="badge-icon">🔄</span>
            <span className="badge-text">
              Using <strong>Mock AI</strong> (instant, non-factual responses)
            </span>
          </>
        ) : hasApiKey ? (
          <>
            <span className="badge-icon">✨</span>
            <span className="badge-text">
              Using <strong>Real AI</strong> (Gemini API) - <span className="live-indicator">🟢 LIVE</span>
            </span>
          </>
        ) : (
          <>
            <span className="badge-icon">⚠️</span>
            <span className="badge-text">
              <strong>Real AI Selected</strong> but <strong>No API Key Configured</strong> - Falling back to Mock
            </span>
          </>
        )}
      </div>
    </div>

    {/* Info Message */}
    <div className="ai-settings-section ai-settings-info">
      <p>
        {currentMode === 'mock'
          ? '💡 Mock mode provides instant responses for UI testing and demos. Responses are synthetic and not factually accurate.'
          : '🚀 Real mode calls the Google Generative AI API for authentic analysis and generation. Requires valid API key.'}
      </p>
    </div>

    {/* Debug Info */}
    <div className="ai-settings-section ai-settings-debug">
      <details>
        <summary>🔍 Debug Information</summary>
        <div className="debug-content">
          <p>
            <strong>API Key Status:</strong> {hasApiKey ? '✅ Configured' : '❌ Not configured'}
          </p>
          <p>
            <strong>Current Mode:</strong> {currentMode}
          </p>
          <p>
            <strong>Active Service:</strong>{' '}
            {currentMode === 'real' && hasApiKey ? 'Real AI' : 'Mock AI'}
          </p>
          <p>
            <strong>Env VITE_AI_MODE:</strong> {import.meta.env.VITE_AI_MODE || 'not set'}
          </p>
          <p>
            <strong>API Key:</strong> {hasApiKey ? '***hidden***' : 'none'}
          </p>
        </div>
      </details>
    </div>
  </div>
);

export function AISettings({ embedded = false }: AISettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<'mock' | 'real'>(getCurrentAIMode());
  const config = getAIConfig();
  const hasApiKey = !!config.googleApiKey;

  const handleModeChange = (mode: 'mock' | 'real') => {
    setCurrentMode(mode);
    setAIMode(mode);
  };

  // Embedded mode: show content directly
  if (embedded) {
    return (
      <div className="ai-settings-embedded">
        <AISettingsContent
          currentMode={currentMode}
          hasApiKey={hasApiKey}
          onModeChange={handleModeChange}
        />
      </div>
    );
  }

  // Regular mode: floating button with modal
  return (
    <div className="ai-settings">
      <button
        className="ai-settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="AI Settings"
      >
        ⚙️ AI Settings
      </button>

      {isOpen && (
        <div className="ai-settings-panel">
          <div className="ai-settings-header">
            <h3>🤖 AI Mode Settings</h3>
            <button
              className="ai-settings-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <AISettingsContent
            currentMode={currentMode}
            hasApiKey={hasApiKey}
            onModeChange={handleModeChange}
          />
        </div>
      )}
    </div>
  );
}
