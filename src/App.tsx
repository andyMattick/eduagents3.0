import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SignIn } from './components/Auth/SignIn';
import { SignUp } from './components/Auth/SignUp';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { TeacherDashboard } from './components/TeacherSystem/TeacherDashboard';
import { PipelineRouter } from './components/Pipeline/PipelineRouter';
import { TeacherNotepad } from './components/Pipeline/TeacherNotepad';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import { UserFlowProvider, useUserFlow } from './hooks/useUserFlow';
import './App.css';

type AppTab = 'dashboard' | 'pipeline' | 'notepad';
type AuthPage = 'signin' | 'signup';

function TeacherAppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const { reset } = useUserFlow();
  const { logout, user } = useAuth();

  const handleResetFlow = () => {
    reset();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="app-container">
      {/* Header with Tab Navigation */}
      <div className="app-header">
        <div className="app-header-content">
          <div className="app-tabs">
            <button
              className={`app-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="app-tab-icon">📊</span>
              Dashboard
            </button>
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
          <div className="app-header-actions">
            {activeTab === 'pipeline' && (
              <button onClick={handleResetFlow} className="reset-button" title="Reset the user flow">
                🔄 Reset
              </button>
            )}
            <button onClick={handleLogout} className="logout-button">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="app-content">
        {activeTab === 'dashboard' && <TeacherDashboard teacherId={user?.id || ''} onNavigate={(page) => {
          if (page === 'pipeline') {
            setActiveTab('pipeline');
          }
        }} />}
        {activeTab === 'pipeline' && <PipelineRouter />}
        {activeTab === 'notepad' && <TeacherNotepad />}
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [authPage, setAuthPage] = useState<AuthPage>('signin');

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {authPage === 'signin' ? (
          <SignIn onSignUpClick={() => setAuthPage('signup')} />
        ) : (
          <SignUp onSignInClick={() => setAuthPage('signin')} />
        )}
      </>
    );
  }

  if (user.isAdmin) {
    return <AdminDashboard onLogout={() => {}} />;
  }

  return (
    <NotepadProvider>
      <UserFlowProvider>
        <TeacherAppContent />
      </UserFlowProvider>
    </NotepadProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
