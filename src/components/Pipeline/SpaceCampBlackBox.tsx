import { useEffect, useState } from 'react';
import './SpaceCampBlackBox.css';

/**
 * Space Camp Black Box — Security Wrapper
 * 
 * Hides ALL simulation internals:
 * - No astronaut stats displayed
 * - No overlay visibility
 * - No scoring rules shown
 * - Full-screen loading only
 * 
 * Acts as a secure black box during simulation execution.
 */
interface SpaceCampBlackBoxProps {
  isRunning: boolean;
  onComplete?: () => void;
}

export function SpaceCampBlackBox({ isRunning, onComplete }: SpaceCampBlackBoxProps) {
  const [isVisible, setIsVisible] = useState(isRunning);

  useEffect(() => {
    if (isRunning) {
      setIsVisible(true);
    }
  }, [isRunning]);

  if (!isVisible) return null;

  return (
    <div className={`space-camp-black-box ${isRunning ? 'active' : 'closing'}`}>
      {/* Full-screen overlay */}
      <div className="black-box-overlay" />

      {/* Loading modal */}
      <div className="black-box-modal">
        <div className="black-box-content">
          {/* Animated satellite icon */}
          <div className="satellite-icon">🛰</div>

          {/* Pulsing status text */}
          <h2 className="black-box-title">Space Camp Running</h2>

          {/* Status messages that rotate */}
          <div className="status-messages">
            <div className="message active">Simulating student interactions...</div>
            <div className="message">Analyzing response patterns...</div>
            <div className="message">Computing performance metrics...</div>
            <div className="message">Generating insights...</div>
          </div>

          {/* Loading animation - minimal info */}
          <div className="loading-spinner">
            <div className="spinner-dot" />
            <div className="spinner-dot" />
            <div className="spinner-dot" />
          </div>

          {/* Subtle progress indicator (no details) */}
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>

          {/* Time remaining minimum info */}
          <p className="loading-info">
            This may take 30-60 seconds. Do not close this window.
          </p>
        </div>
      </div>
    </div>
  );
}
