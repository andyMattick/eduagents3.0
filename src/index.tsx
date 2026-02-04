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
