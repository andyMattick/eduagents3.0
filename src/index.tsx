import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { inject } from '@vercel/analytics';
import { getLastSimulateStudentsPayload, clearSimulateStudentsPayload } from './agents/simulation/simulateStudents';
import { getLastSimulateStudentsPrompt, clearSimulateStudentsPrompt } from './agents/analysis/promptConstruction';
import { getLastCompletionSimulation, getLastClassCompletionSummary, clearCompletionSimulation } from './agents/analysis/completionSimulation';
import { demonstrateMockData, generateMockAsteroids, generateMockSimulationResults } from './agents/simulation/mockData';
import { showMockDataOnly, runMockPipeline } from './agents/simulation/demoRunner';

// Enforce API key requirement at initialization
if (!import.meta.env.VITE_GOOGLE_API_KEY) {
  const errorMsg = 'VITE_GOOGLE_API_KEY missing. This is required to run this application.';
  console.error('❌ ' + errorMsg);
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace; white-space: pre-wrap;">${errorMsg}\n\nSet VITE_GOOGLE_API_KEY environment variable before starting the app.</div>`;
  throw new Error(errorMsg);
}

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
    // New demo functions
    demonstrateMockData?: typeof demonstrateMockData;
    generateMockAsteroids?: typeof generateMockAsteroids;
    generateMockSimulationResults?: typeof generateMockSimulationResults;
    showMockDataOnly?: typeof showMockDataOnly;
    runMockPipeline?: typeof runMockPipeline;
  }
}

if (typeof window !== 'undefined') {
  // Initialize Vercel Analytics
  inject();
  
  window.getLastSimulateStudentsPayload = getLastSimulateStudentsPayload;
  window.clearSimulateStudentsPayload = clearSimulateStudentsPayload;
  window.getLastSimulateStudentsPrompt = getLastSimulateStudentsPrompt;
  window.clearSimulateStudentsPrompt = clearSimulateStudentsPrompt;
  window.getLastCompletionSimulation = getLastCompletionSimulation;
  window.getLastClassCompletionSummary = getLastClassCompletionSummary;
  window.clearCompletionSimulation = clearCompletionSimulation;
  // Expose demo functions
  window.demonstrateMockData = demonstrateMockData;
  window.generateMockAsteroids = generateMockAsteroids;
  window.generateMockSimulationResults = generateMockSimulationResults;
  window.showMockDataOnly = showMockDataOnly;
  window.runMockPipeline = runMockPipeline;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
