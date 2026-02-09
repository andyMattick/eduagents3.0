import { useState } from 'react';
import { PipelineRouter } from './components/Pipeline/PipelineRouter';
import { TeacherNotepad } from './components/Pipeline/TeacherNotepad';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import { UserFlowProvider, useUserFlow } from './hooks/useUserFlow';
import './App.css';

type AppTab = 'pipeline' | 'notepad';

function AppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>('pipeline');
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
            <button onClick={handleResetFlow} className="reset-button" title="Reset the user flow">
              🔄 Reset
            </button>
          )}
        </div>
      </div>

      <div className="app-content">
        {activeTab === 'pipeline' && <PipelineRouter />}
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
