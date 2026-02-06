import { useState } from 'react';
import { PipelineShell } from './components/Pipeline/PipelineShell';
import { TeacherNotepad } from './components/Pipeline/TeacherNotepad';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import './App.css';

type AppTab = 'pipeline' | 'notepad';

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('pipeline');

  return (
    <ThemeProvider>
      <NotepadProvider>
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
            </div>
          </div>

          <div className="app-content">
            {activeTab === 'pipeline' && <PipelineShell />}
            {activeTab === 'notepad' && <TeacherNotepad />}
          </div>
        </div>
      </NotepadProvider>
    </ThemeProvider>
  );
}

export default App;
