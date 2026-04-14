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
import { CreateDocumentFlow } from './components_new/v4/CreateDocumentFlow';
import { LegacyDocumentCreation } from './components_new/v4/LegacyDocumentCreation';
import { TeacherStudio } from './components_new/v4/TeacherStudio';
import './App.css';

console.log("ENV CHECK", import.meta.env);

type AuthPage = 'signin' | 'signup';

const ACTIVE_V4_PATHS = new Set(['/', '/v4/semantic', '/studio', '/legacy', '/sim', '/preparedness']);

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


/* ------------------------------
   Teacher App (with theme toggle)
--------------------------------*/
function TeacherAppContent() {
  const [pathname, setPathname] = useState<string>(window.location.pathname);
  const { logout, user } = useAuth();

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

  return (
    <div className="app-container">
      <header className="app-header v4-home-header">
        <div className="app-header-content v4-home-header-content">
          <div className="v4-home-brand">
            <p className="v4-home-kicker">Agents of Education</p>
            <h1>
              Educational Simulation
            </h1>

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
        {pathname === '/legacy'
          ? <LegacyDocumentCreation />
          : pathname === '/sim'
          ? <CreateDocumentFlow />
          : pathname === '/preparedness'
          ? <TeacherStudio />
          : <TeacherStudio />}
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
