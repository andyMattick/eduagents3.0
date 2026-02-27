import { useEffect, useState } from 'react';
import { getAPICallHistory, APICall } from '../utils/apiCallTracker';

/**
 * Component that displays API call notifications
 * Shows real-time alerts when API calls are made
 */
export function APICallNotifier() {
  const [calls, setCalls] = useState<APICall[]>([]);
  const [visibleCalls, setVisibleCalls] = useState<APICall[]>([]);

  useEffect(() => {
    // Poll for new API calls every 500ms
    const interval = setInterval(() => {
      const history = getAPICallHistory();
      if (history.length > calls.length) {
        const newCall = history[history.length - 1];
        setVisibleCalls(prev => [newCall, ...prev].slice(0, 5)); // Keep last 5
      }
      setCalls(history);
    }, 500);

    return () => clearInterval(interval);
  }, [calls]);

  if (visibleCalls.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999,
      maxWidth: '400px',
    }}>
      {visibleCalls.map((call, idx) => (
        <div
          key={`${call.timestamp.getTime()}-${idx}`}
          style={{
            marginBottom: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 
              call.status === 'success' ? '#d4edda' :
              call.status === 'error' ? '#f8d7da' :
              '#d1ecf1',
            borderLeft: `4px solid ${
              call.status === 'success' ? '#28a745' :
              call.status === 'error' ? '#dc3545' :
              '#17a2b8'
            }`,
            fontSize: '13px',
            fontFamily: 'monospace',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            {call.status === 'success' ? '✅' : call.status === 'error' ? '❌' : '⏳'}
            {' '}
            {call.service}.{call.method}()
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {call.status === 'pending' ? 'Pending...' :
             call.status === 'success' ? `Completed in ${call.duration}ms` :
             `Error: ${call.error}`}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(400px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
