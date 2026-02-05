import { useState } from 'react';
import { PipelineShell } from './components/Pipeline/PipelineShell';
import { MaterialsHub } from './components/MaterialsHub/MaterialsHub';
import { TeacherNotepad } from './components/Pipeline/TeacherNotepad';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import './App.css';

type AppView = 'assignments' | 'materials';

function App() {
  const [activeView, setActiveView] = useState<AppView>('assignments');

  return (
    <ThemeProvider>
      <NotepadProvider>
        <div className="app-container">
          {/* Navigation */}
          <nav style={{
            padding: '12px 20px',
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            gap: '16px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}>
            <button
              onClick={() => setActiveView('assignments')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeView === 'assignments' ? '#007bff' : 'transparent',
                color: activeView === 'assignments' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: activeView === 'assignments' ? '600' : '400',
                transition: 'all 0.2s ease',
              }}
            >
              📝 Assignment Pipeline
            </button>
            <button
              onClick={() => setActiveView('materials')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeView === 'materials' ? '#28a745' : 'transparent',
                color: activeView === 'materials' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: activeView === 'materials' ? '600' : '400',
                transition: 'all 0.2s ease',
              }}
            >
              📚 Materials Hub
            </button>
          </nav>

          <div className="app-content">
            {activeView === 'assignments' && <PipelineShell />}
            {activeView === 'materials' && <MaterialsHub />}
          </div>
          <TeacherNotepad />
        </div>
      </NotepadProvider>
    </ThemeProvider>
  );
}

export default App;
