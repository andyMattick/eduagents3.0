import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SignIn } from './components/Auth/SignIn';
import { SignUp } from './components/Auth/SignUp';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { TeacherDashboard } from './components/TeacherSystem/TeacherDashboard';
import { PipelineRouter } from './components/Pipeline/PipelineRouter';
import { TeacherNotepad } from './components/Pipeline/TeacherNotepad';
import { APICallNotifier } from './components/APICallNotifier';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { UserFlowProvider, useUserFlow } from './hooks/useUserFlow';
import WhatWeInferPage from './components/Inference/WhatWeInferPage';


import './App.css';

type AppTab = 'dashboard' | 'pipeline' | 'notepad' | 'what-we-infer';

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
  const [activeTab, setActiveTab] = useState<AppTab>('pipeline');
  const [assignmentContext, setAssignmentContext] = useState<AssignmentContext | null>(null);
  const { logout, user } = useAuth();
  
  const handleLogout = async () => await logout();

  return (
    <div className="app-container">
      {/* Header */}
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
              className={`app-tab ${activeTab === 'what-we-infer' ? 'active' : ''}`}
              onClick={() => setActiveTab('what-we-infer')}
            >
              🔍 How Your Inputs Drive the Process
            </button>
            {/* Theme Toggle */}
            

          

            <button onClick={handleLogout} className="logout-button">
              Sign Out
            </button>


          </div>

        </div>
      </div>

      {/* Content */}
      <div className="app-content">
        {activeTab === 'dashboard' && (
          <TeacherDashboard
            teacherId={user?.id || ''}
            onNavigate={(page, data) => {
  // Existing routes
              if (page === 'pipeline' || page === 'create-assignment') {
                setAssignmentContext(null);
                setActiveTab('pipeline');
              }

              else if (page === 'view-assignment' && data?.assignmentId) {
                setAssignmentContext({ assignmentId: data.assignmentId, action: 'view' });
                setActiveTab('pipeline');
              }

              else if (page === 'edit-assignment' && data?.assignmentId) {
                setAssignmentContext({ assignmentId: data.assignmentId, action: 'edit' });
                setActiveTab('pipeline');
              }

             

             

              else if (page === 'report-results' && data?.assignmentId) {
                setAssignmentContext({ assignmentId: data.assignmentId, action: 'report-results' });
                setActiveTab('pipeline');
              }

              

              else if (page === 'generate-new-version' && data?.assignmentId) {
                setAssignmentContext({ assignmentId: data.assignmentId, action: 'generate-new-version' });
                setActiveTab('pipeline');
              }

             
              else if (page === 'view-answer-key' && data?.assignmentId) {
                setAssignmentContext({ assignmentId: data.assignmentId, action: 'view answer-key' });
                setActiveTab('pipeline');
              }
              else if (page === 'view-rubric' && data?.assignmentId) {
                setAssignmentContext({ assignmentId: data.assignmentId, action: 'view rubric' });
                setActiveTab('pipeline');
              }
}}

          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineRouter
            assignmentContext={assignmentContext}
            onAssignmentSaved={() => {
              setAssignmentContext(null);
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'notepad' && <TeacherNotepad />}
        {activeTab === 'what-we-infer' && (
   <WhatWeInferPage />

  )}


        

      </div>
    </div>
  );
}

/* ------------------------------
   Auth Gate
--------------------------------*/
function AppContent() {
  const { user, isLoading, logout, signIn, signUp, error } = useAuth();
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
    return <AdminDashboard onLogout={() => logout()} />;
  }

  return (
    <NotepadProvider>
      <UserFlowProvider>
        <TeacherAppContent />
        <APICallNotifier />
      </UserFlowProvider>
    </NotepadProvider>
  );
}

/* ------------------------------
   Root App
--------------------------------*/
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
