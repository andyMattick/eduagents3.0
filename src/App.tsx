import { useState } from 'react';
import { AuthProvider } from "./components_new/Auth/useAuth";
import { useAuth } from "./components_new/Auth/useAuth";
import { SignIn } from './components_new/Auth/SignIn';
import { SignUp } from './components_new/Auth/SignUp';
import { AdminDashboard } from './components_new/Admin/AdminDashboard';
import { TeacherDashboard } from './components_new/TeacherSystem/TeacherDashboard';
import { MyAgentsPage } from './components_new/TeacherSystem/MyAgentsPage';
import { APICallNotifier } from './components_new/APICallNotifier';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import { UserFlowProvider } from './hooks/useUserFlow';
import { useDeveloperMode } from './hooks/useDeveloperMode';
import WhatWeInferPage from './components_new/Inference/WhatWeInferPage';
import { AssessmentDetailPage } from './components_new/TeacherSystem/AssessmentDetailPage';
import './App.css';
import { ConversationalAssessmentWrapper } from './components_new/Pipeline/ConversationalAssessmentWrapper';

console.log("ENV CHECK", import.meta.env);

type AppTab = 'pipeline' | 'notepad' | 'what-we-infer' | 'my-assessments' | 'my-agents' | 'assessment-detail';

type AuthPage = 'signin' | 'signup';

export interface AssignmentContext {
  assignmentId: string;
  action:
    | 'view'
    | 'edit'
    | 'report-results'
    | 'generate-new-version'
    | 'view answer-key'
    | 'view rubric';
}


/* ------------------------------
   Teacher App (with theme toggle)
--------------------------------*/
function TeacherAppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>('my-assessments');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const { devMode, toggleDevMode } = useDeveloperMode();
  
  const handleLogout = async () => await logout();

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div className="app-header-content">
          <div className="app-tabs">
            <button
              className={`app-tab ${activeTab === 'my-assessments' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-assessments')}
            >
              <span className="app-tab-icon">📋</span>
              My Assessments
            </button>

            <button
              className={`app-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('pipeline')}
            >
              <span className="app-tab-icon">📝</span>
              Pipeline
            </button>

            {/* My Agents tab hidden from teacher nav — component kept for internal use */}

            <button
              className={`app-tab ${activeTab === 'what-we-infer' ? 'active' : ''}`}
              onClick={() => setActiveTab('what-we-infer')}
            >
              🔍 How Your Inputs Drive the Process
            </button>

            {/* Developer Mode toggle */}
            <button
              onClick={toggleDevMode}
              title={devMode ? 'Developer Mode ON — click to hide internal data' : 'Developer Mode OFF — click to show internal data'}
              style={{
                marginLeft: 'auto',
                padding: '0.3rem 0.75rem',
                borderRadius: '8px',
                border: `1.5px solid ${devMode ? '#7c3aed' : 'var(--border-color, #ddd)'}`,
                background: devMode ? '#7c3aed' : 'transparent',
                color: devMode ? '#fff' : 'var(--text-secondary, #6b7280)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {devMode ? '🛠 Dev Mode ON' : '🛠 Dev'}
            </button>

            {/* Theme Toggle */}

            <button onClick={handleLogout} className="logout-button">
              Sign Out
            </button>


          </div>

        </div>
      </div>

      {/* Content — all tabs stay mounted; CSS hides inactive ones so pipeline state survives navigation */}
      <div className="app-content">
        <div style={{ display: activeTab === 'pipeline' ? 'block' : 'none' }}>
          <ConversationalAssessmentWrapper
            userId={user?.id ?? null}
            onResult={(data) => {
              console.log("Pipeline result:", data);
            }}
          />
        </div>

        {/* My Assessments — uses TeacherDashboard which renders rich cards and handles navigation */}
        {activeTab === 'my-assessments' && (
          <TeacherDashboard
            teacherId={user?.id ?? ''}
            teacherName={user?.name || user?.email || ''}
            onNavigate={(page, data) => {
              if (page === 'pipeline' || page === 'create-assignment' || page === 'createAssessment') {
                setActiveTab('pipeline');
              } else if (page === 'viewAssessments') {
                setActiveTab('my-assessments');
              } else if (page === 'viewTemplate' && data?.templateId) {
                setSelectedTemplateId(data.templateId);
                setActiveTab('assessment-detail');
              } else if (page === 'viewAgentsBySubject') {
                setActiveTab('my-agents');
              }
            }}
          />
        )}

        {activeTab === 'my-agents' && (
          <MyAgentsPage
            userId={user?.id ?? ''}
            onNewAssessment={() => { setActiveTab('pipeline'); }}
          />
        )}

        <div style={{ display: activeTab === 'what-we-infer' ? 'block' : 'none' }}>
          <WhatWeInferPage />
        </div>

        {activeTab === 'assessment-detail' && selectedTemplateId && (
          <AssessmentDetailPage
            templateId={selectedTemplateId}
            onBack={() => setActiveTab('my-assessments')}
          />
        )}


        

      </div>
    </div>
  );
}

/* ------------------------------
   Auth Gate
--------------------------------*/
function AppContent() {
  const { user, isLoading, logout: _logout, signIn, signUp: _signUp, error } = useAuth();
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
    if (authPage === 'signup') {
      return <SignUp onSignInClick={() => setAuthPage('signin')} />;
    }
    return (
      <SignIn
        onSignUpClick={() => setAuthPage('signup')}
        onSignIn={signIn}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  if (user.isAdmin) {
    return <AdminDashboard />;
  }

return (
  <>
    <TeacherAppContent />
    <APICallNotifier />
  </>
);
}

/* ------------------------------
   Root App
--------------------------------*/
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotepadProvider>
          <UserFlowProvider>
            <AppContent />
          </UserFlowProvider>
        </NotepadProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}


export default App;
