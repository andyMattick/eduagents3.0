import { useState, useEffect } from 'react';
import { AuthProvider } from "./components_new/Auth/useAuth";
import { useAuth } from "./components_new/Auth/useAuth";
import { supabase } from './supabase/client';
import type { StepId } from './components_new/Pipeline/ConversationalAssessment';
import { SignIn } from './components_new/Auth/SignIn';
import { SignUp } from './components_new/Auth/SignUp';
import { AdminDashboard } from './components_new/Admin/AdminDashboard';
import { MyAssessmentsPage } from './components_new/TeacherSystem/MyAssessmentsPage';
import { MyAgentsPage } from './components_new/TeacherSystem/MyAgentsPage';
import { TeacherProfilePage } from './components_new/TeacherSystem/TeacherProfilePage';
import { APICallNotifier } from './components_new/APICallNotifier';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import { UserFlowProvider } from './hooks/useUserFlow';
import { useDeveloperMode } from './hooks/useDeveloperMode';
import WhatWeInferPage from './components_new/Inference/WhatWeInferPage';
import { AssessmentDetailPage } from './components_new/TeacherSystem/AssessmentDetailPage';
import { loadTeacherProfile } from './services_new/teacherProfileService';
import './App.css';
import { ConversationalAssessmentWrapper } from './components_new/Pipeline/ConversationalAssessmentWrapper';

console.log("ENV CHECK", import.meta.env);

type AppTab = 'pipeline' | 'notepad' | 'what-we-infer' | 'my-assessments' | 'my-agents' | 'assessment-detail' | 'my-profile';

type AuthPage = 'signin' | 'signup';

export interface AssignmentContext {
  assignmentId: string;
  action:
    | 'view'
    | 'edit'
    | 'report-results'
    | 'generate-new-version'
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
  const [pipelineDefaults, setPipelineDefaults] = useState<Partial<Record<StepId, string>>>({});  // Tracks whether this user has ever saved a teacher profile.
  // null = still loading, false = no profile yet (show first-run banner), true = exists.
  const [hasStoredProfile, setHasStoredProfile] = useState<boolean | null>(null);
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);
  // Check whether a stored profile row exists for this user (once on mount).
  useEffect(() => {
    if (!user?.id) return;
    loadTeacherProfile(user.id).then((p) => setHasStoredProfile(p !== null)).catch(() => setHasStoredProfile(false));
  }, [user?.id]);

  /** Derive most-used course + grade from the teacher's last 20 assessments */
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('assessment_templates')
      .select('domain, uar_json')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data?.length) return;
        // Most common domain → course default
        const domainCounts: Record<string, number> = {};
        for (const t of data) {
          const d = (t.domain as string | null)?.trim();
          if (d) domainCounts[d] = (domainCounts[d] ?? 0) + 1;
        }
        const topCourse = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        // Most common grade level
        const gradeCounts: Record<string, number> = {};
        for (const t of data) {
          const uar = t.uar_json as Record<string, any> | null;
          const g: string | undefined =
            Array.isArray(uar?.gradeLevels) ? uar!.gradeLevels[0] : uar?.grade;
          if (g) gradeCounts[String(g)] = (gradeCounts[String(g)] ?? 0) + 1;
        }
        const topGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const defaults: Partial<Record<StepId, string>> = {};
        if (topCourse) defaults.course = topCourse;
        if (topGrade) defaults.gradeLevels = topGrade;
        if (Object.keys(defaults).length) setPipelineDefaults(defaults);
      });
  }, [user?.id]);

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

            <button
              className={`app-tab ${activeTab === 'my-profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-profile')}
              title="Your teaching defaults — pre-fill every new assessment"
            >
              <span className="app-tab-icon">⚙️</span>
              My Defaults
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
            defaultAnswers={pipelineDefaults}
            onResult={(data) => {
              console.log("Pipeline result:", data);
            }}
          />
        </div>

        {/* My Assessments — uses TeacherDashboard which renders rich cards and handles navigation */}
        {activeTab === 'my-assessments' && (
          <MyAssessmentsPage
            teacherId={user?.id ?? ''}
            onNewAssessment={() => setActiveTab('pipeline')}
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

        {activeTab === 'my-profile' && user?.id && (
          <TeacherProfilePage userId={user.id} />
        )}

        {/* ── First-run banner for users without a stored profile ──── */}
        {activeTab === 'my-assessments' &&
          hasStoredProfile === false &&
          !profileBannerDismissed && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem',
            background: 'var(--color-primary-subtle, #ede9fe)',
            border: '1px solid var(--color-primary, #6366f1)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--color-text, #1a1a2e)',
          }}>
            <span>⚙️</span>
            <span style={{ flex: 1 }}>
              <strong>Using default settings.</strong>{' '}
              Personalise question types, pacing, and writing style so the system asks you fewer questions each time.
            </span>
            <button
              onClick={() => setActiveTab('my-profile')}
              style={{
                padding: '0.375rem 0.75rem',
                background: 'var(--color-primary, #6366f1)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
              }}
            >
              Set My Defaults →
            </button>
            <button
              onClick={() => setProfileBannerDismissed(true)}
              title="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                color: 'var(--color-text-muted, #6b7280)',
                padding: '0.25rem',
              }}
            >
              ✕
            </button>
          </div>
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
