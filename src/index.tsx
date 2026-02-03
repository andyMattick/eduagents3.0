import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { getLastSimulateStudentsPayload, clearSimulateStudentsPayload } from './agents/simulation/simulateStudents';
import { getLastSimulateStudentsPrompt, clearSimulateStudentsPrompt } from './agents/analysis/promptConstruction';
import { getLastCompletionSimulation, getLastClassCompletionSummary, clearCompletionSimulation } from './agents/analysis/completionSimulation';

// Expose debugging functions globally for console access
declare global {
  interface Window {
    getLastSimulateStudentsPayload?: typeof getLastSimulateStudentsPayload;
    clearSimulateStudentsPayload?: typeof clearSimulateStudentsPayload;
    getLastSimulateStudentsPrompt?: typeof getLastSimulateStudentsPrompt;
    clearSimulateStudentsPrompt?: typeof clearSimulateStudentsPrompt;
    getLastCompletionSimulation?: typeof getLastCompletionSimulation;
    getLastClassCompletionSummary?: typeof getLastClassCompletionSummary;
    clearCompletionSimulation?: typeof clearCompletionSimulation;
  }
}

if (typeof window !== 'undefined') {
  window.getLastSimulateStudentsPayload = getLastSimulateStudentsPayload;
  window.clearSimulateStudentsPayload = clearSimulateStudentsPayload;
  window.getLastSimulateStudentsPrompt = getLastSimulateStudentsPrompt;
  window.clearSimulateStudentsPrompt = clearSimulateStudentsPrompt;
  window.getLastCompletionSimulation = getLastCompletionSimulation;
  window.getLastClassCompletionSummary = getLastClassCompletionSummary;
  window.clearCompletionSimulation = clearCompletionSimulation;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
