import { useState, useEffect } from 'react';
import { AuthProvider } from "./components_new/Auth/useAuth";
import { useAuth } from "./components_new/Auth/useAuth";
import { SignIn } from './components_new/Auth/SignIn';
import { SignUp } from './components_new/Auth/SignUp';
import { AdminDashboard } from './components_new/Admin/AdminDashboard';
import { APICallNotifier } from './components_new/APICallNotifier';
import { NotepadProvider } from './hooks/useNotepad';
import { ThemeProvider } from './hooks/useTheme';
import { UserFlowProvider } from './hooks/useUserFlow';
import { LegacyDocumentCreation } from './components_new/v4/LegacyDocumentCreation';
import { TeacherStudio } from './components_new/v4/TeacherStudio';
import { PreparednessPage } from './components_new/v4/PreparednessPage';
import { ShortCircuitPage } from './components_new/v4/ShortCircuitPage';
import './App.css';

console.log("ENV CHECK", import.meta.env);

type AuthPage = 'signin' | 'signup';

const ACTIVE_V4_PATHS = new Set(['/', '/v4/semantic', '/studio', '/legacy', '/sim', '/shortcircuit', '/preparedness', '/compare', '/documents/compare']);

function isAllowedV4Path(pathname: string) {
  return ACTIVE_V4_PATHS.has(pathname) || pathname.startsWith('/print/');
}

export interface AssignmentContext {
  assignmentId: string;
  action:
    | 'view'
    | 'edit'
    | 'report-results'
    | 'generate-new-version'
    | 'view rubric';
}

// ---------------------------------------------------------------------------
// Home landing page — entry point for both main flows
// ---------------------------------------------------------------------------
function HomeLanding({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="home-landing">
      <p className="home-landing-kicker">Teacher Studio</p>
      <h2 className="home-landing-heading">What would you like to do?</h2>
      <p className="home-landing-sub">Choose a workflow below to get started.</p>

      <div className="home-landing-cards">
        <button className="home-card" onClick={() => navigate("/sim")}>
          <span className="home-card-icon">📊</span>
          <span className="home-card-title">Simulate Student Experience</span>
          <span className="home-card-desc">
            Upload a document and see how each student profile will experience your material — per-item metrics, Bloom's levels, and cumulative load by profile.
          </span>
        </button>

        <button className="home-card" onClick={() => navigate("/compare")}>
          <span className="home-card-icon">📄</span>
          <span className="home-card-title">Compare Documents</span>
          <span className="home-card-desc">
            Upload documents to run preparedness checks, alignment analysis, rewrite suggestions, and generate aligned tests.
          </span>
        </button>
      </div>
    </div>
  );
}
/* ------------------------------
   Teacher App (with theme toggle)
--------------------------------*/
function TeacherAppContent() {
  const [pathname, setPathname] = useState<string>(window.location.pathname);
  const { logout, user } = useAuth();

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setPathname(path);
  };

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (isAllowedV4Path(pathname)) {
      return;
    }
    window.history.replaceState({}, '', '/');
    setPathname('/');
  }, [pathname]);

  const handleLogout = async () => await logout();

  // Derive page title for the header
  const pageTitle =
    pathname === '/sim' || pathname === '/shortcircuit' ? 'Simulate Student Experience' :
    pathname === '/compare' || pathname === '/documents/compare' ? 'Compare Documents' :
    pathname === '/preparedness' ? 'Student Preparedness' :
    'Teacher Studio';

  return (
    <div className="app-container">
      <header className="app-header v4-home-header">
        <div className="app-header-content v4-home-header-content">
          <div className="v4-home-brand">
            <p className="v4-home-kicker">Agents of Education</p>
            <h1
              className={pathname !== '/' ? 'v4-home-brand-h1--clickable' : undefined}
              onClick={() => pathname !== '/' && navigate('/')}
            >
              {pageTitle}
            </h1>
            {pathname !== '/' && (
              <button className="v4-back-link" onClick={() => navigate('/')}>
                ← Back to home
              </button>
            )}
          </div>

          <div className="v4-home-actions">
            {user?.email && <span className="v4-home-user">{user.email}</span>}
            <button onClick={handleLogout} className="logout-button">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="app-content app-content--v4">
        {pathname === '/'
          ? <HomeLanding navigate={navigate} />
          : pathname === '/legacy'
          ? <LegacyDocumentCreation />
          : pathname === '/preparedness'
          ? <TeacherStudio />
          : pathname === '/compare' || pathname === '/documents/compare'
          ? <PreparednessPage />
          : pathname === '/sim' || pathname === '/shortcircuit'
          ? <ShortCircuitPage />
          : <HomeLanding navigate={navigate} />}
      </main>
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
