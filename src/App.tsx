import { PipelineShell } from './components/Pipeline/PipelineShell';
import { TeacherNotepad } from './components/Pipeline/TeacherNotepad';
import { NotepadProvider } from './hooks/useNotepad';
import './App.css';

function App() {
  return (
    <NotepadProvider>
      <div className="app-container">
        <div className="app-content">
          <PipelineShell />
        </div>
        <TeacherNotepad />
      </div>
    </NotepadProvider>
  );
}

export default App;
