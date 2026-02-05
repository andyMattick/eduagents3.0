import { PipelineShell } from './components/Pipeline/PipelineShell';
import { TeacherNotepad } from './components/Pipeline/TeacherNotepad';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <NotepadProvider>
        <div className="app-container">
          <div className="app-content">
            <PipelineShell />
          </div>
          <TeacherNotepad />
        </div>
      </NotepadProvider>
    </ThemeProvider>
  );
}

export default App;
