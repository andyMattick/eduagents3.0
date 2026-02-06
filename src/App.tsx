import { useState } from 'react';
import { PipelineShell } from './components/Pipeline/PipelineShell';
import { PipelineRouter } from './components/Pipeline/PipelineRouter';
import { TeacherNotepad } from './components/Pipeline/TeacherNotepad';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import { UserFlowProvider, useUserFlow } from './hooks/useUserFlow';
import './App.css';

type AppTab = 'pipeline' | 'notepad';
type PipelineMode = 'router' | 'shell';

function AppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>('pipeline');
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>('router');
  const { reset } = useUserFlow();

  const handleResetFlow = () => {
    reset();
  };

  return (
    <div className="app-container">
      {/* Header with Tab Navigation */}
      <div className="app-header">
        <div className="app-header-content">
          <div className="app-tabs">
            <button
              className={`app-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('pipeline')}
            >
              <span className="app-tab-icon">📝</span>
              Pipeline
            </button>
            <button
              className={`app-tab ${activeTab === 'notepad' ? 'active' : ''}`}
              onClick={() => setActiveTab('notepad')}
            >
              <span className="app-tab-icon">📋</span>
              Notepad & Settings
            </button>
          </div>
          {activeTab === 'pipeline' && (
            <div className="app-header-controls">
              <select
                value={pipelineMode}
                onChange={e => setPipelineMode(e.target.value as PipelineMode)}
                className="mode-selector"
              >
                <option value="router">New Navigation Flow</option>
                <option value="shell">Classic Pipeline</option>
              </select>
              <button onClick={handleResetFlow} className="reset-button" title="Reset the user flow">
                🔄 Reset
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="app-content">
        {activeTab === 'pipeline' &&
          (pipelineMode === 'router' ? <PipelineRouter /> : <PipelineShell />)}
        {activeTab === 'notepad' && <TeacherNotepad />}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UserFlowProvider>
        <NotepadProvider>
          <AppContent />
        </NotepadProvider>
      </UserFlowProvider>
    </ThemeProvider>
  );
}

export default App;
