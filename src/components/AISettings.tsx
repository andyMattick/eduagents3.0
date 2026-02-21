import { useState } from 'react';
import './AISettings.css';

interface AISettingsProps {
  embedded?: boolean;
}

const AISettingsContent = ({
  hasApiKey,
}: {
  hasApiKey: boolean;
}) => (
  <div className="ai-settings-content">
    {/* Status */}
    <div className="ai-settings-section ai-settings-status">
      <div className={`ai-status-badge ${!hasApiKey ? 'warning' : ''}`}>
        {hasApiKey ? (
          <>
            <span className="badge-icon">✨</span>
            <span className="badge-text">
              Using <strong>Gemini API</strong> (Google Generative AI)
            </span>
          </>
        ) : (
          <>
            <span className="badge-icon">⚠️</span>
            <span className="badge-text">
              <strong>VITE_GOOGLE_API_KEY</strong> not configured
            </span>
          </>
        )}
      </div>
    </div>

    {/* Info Message */}
    <div className="ai-settings-section ai-settings-info">
      <p>
        {hasApiKey
          ? '✨ Real AI is enabled. Using Google Generative AI (Gemini) for all analysis and generation tasks.'
          : '⚠️ Real AI is required. Set VITE_GOOGLE_API_KEY environment variable to enable Gemini API.'}
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
            <strong>AI Mode:</strong> {getCurrentAIMode()}
          </p>
          <p>
            <strong>Service:</strong> Gemini API (Real AI only)
          </p>
          <p>
            <strong>Provider:</strong> Google Generative AI
          </p>
        </div>
      </details>
    </div>
  </div>
);

export function AISettings({ embedded = false }: AISettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasApiKey = !!config.googleApiKey;

  // Embedded mode: show content directly
  if (embedded) {
    return (
      <div className="ai-settings-embedded">
        <AISettingsContent hasApiKey={hasApiKey} />
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
        ⚙️ AI Config
      </button>

      {isOpen && (
        <div className="ai-settings-panel">
          <div className="ai-settings-header">
            <h3>🤖 AI Configuration</h3>
            <button
              className="ai-settings-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <AISettingsContent hasApiKey={hasApiKey} />
        </div>
      )}
    </div>
  );
}
