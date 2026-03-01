import { useState } from 'react';
import { AuthProvider } from "./components_new/Auth/useAuth";
import { useAuth } from "./components_new/Auth/useAuth";
import { SignIn } from './components_new/Auth/SignIn';
import { SignUp } from './components_new/Auth/SignUp';
import { AdminDashboard } from './components_new/Admin/AdminDashboard';
import { TeacherDashboard } from './components_new/TeacherSystem/TeacherDashboard';
import { MyAssessmentsPage } from './components_new/TeacherSystem/MyAssessmentsPage';
import { MyAgentsPage } from './components_new/TeacherSystem/MyAgentsPage';
import { APICallNotifier } from './components_new/APICallNotifier';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import { UserFlowProvider } from './hooks/useUserFlow';
import WhatWeInferPage from './components_new/Inference/WhatWeInferPage';
import { AssessmentDetailPage } from './components_new/TeacherSystem/AssessmentDetailPage';
import './App.css';
import { ConversationalAssessmentWrapper } from './components_new/Pipeline/ConversationalAssessmentWrapper';

console.log("ENV CHECK", import.meta.env);

type AppTab = 'dashboard' | 'pipeline' | 'notepad' | 'what-we-infer' | 'my-assessments' | 'my-agents' | 'assessment-detail';

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
  const [_assignmentContext, setAssignmentContext] = useState<AssignmentContext | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
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
              className={`app-tab ${activeTab === 'my-assessments' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-assessments')}
            >
              <span className="app-tab-icon">📋</span>
              My Assessments
            </button>

            <button
              className={`app-tab ${activeTab === 'my-agents' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-agents')}
            >
              <span className="app-tab-icon">🤖</span>
              My Agents
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

      {/* Content — all tabs stay mounted; CSS hides inactive ones so pipeline state survives navigation */}
      <div className="app-content">
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          <TeacherDashboard
            teacherId={user?.id || ''}
            teacherName={user?.name || user?.email || ''}
            onNavigate={(page, data) => {
  // Existing routes
              if (page === 'pipeline' || page === 'create-assignment' || page === 'createAssessment') {
                setAssignmentContext(null);
                setActiveTab('pipeline');
              }

              else if (page === 'viewAssessments') {
                setActiveTab('my-assessments');
              }

              else if (page === 'viewTemplate' && data?.templateId) {
                setSelectedTemplateId(data.templateId);
                setActiveTab('assessment-detail');
              }

              else if (page === 'viewAgentsBySubject') {
                setActiveTab('my-agents');
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
        </div>

        <div style={{ display: activeTab === 'pipeline' ? 'block' : 'none' }}>
          <ConversationalAssessmentWrapper
            userId={user?.id ?? null}
            onResult={(data) => {
              console.log("Pipeline result:", data);
            }}
          />
        </div>

        {/* Assessments and Agents are conditionally rendered (not just hidden) so
            they remount and refetch whenever the user navigates to them.
            This ensures new users see their data immediately after generating. */}
        {activeTab === 'my-assessments' && (
          <MyAssessmentsPage
            teacherId={user?.id ?? ''}
            onNewAssessment={() => { setActiveTab('pipeline'); }}
            onViewTemplate={(templateId) => {
              setSelectedTemplateId(templateId);
              setActiveTab('assessment-detail');
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
