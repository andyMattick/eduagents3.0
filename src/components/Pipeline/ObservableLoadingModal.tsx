/**
 * Observable Loading Modal
 *
 * Displayed while Space Camp (backend simulation) is running.
 * Shows a thinking visual and auto-closes when analysis completes.
 */

import React from 'react';

interface ObservableLoadingModalProps {
  /** Is the analysis currently running? */
  isLoading: boolean;
}

export function ObservableLoadingModal({ isLoading }: ObservableLoadingModalProps) {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.4s ease-out',
        }}
      >
        {/* Telescope icon with animation */}
        <div
          style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          🔭
        </div>

        {/* Title */}
        <h2 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '24px' }}>
          Space Camp is Analyzing
        </h2>

        {/* Subtitle */}
        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '15px', lineHeight: '1.5' }}>
          Simulating your assignment across diverse student personas...
        </p>

        {/* Thinking dots animation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '6px',
            marginBottom: '20px',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#0066cc',
                animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Status text */}
        <p style={{ margin: 0, color: '#999', fontSize: '13px' }}>
          This may take a moment...
        </p>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
