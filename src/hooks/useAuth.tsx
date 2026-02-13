import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { setAIModeByRole } from '../config/aiConfig';
import { login, signUp, logout as supabaseLogout, getCurrentUser } from '../services/authService';
import { AuthSession, LoginRequest, SignUpRequest } from '../types/teacherSystem';

interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  signIn: (request: LoginRequest) => Promise<void>;
  signUp: (request: SignUpRequest & { isAdmin?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize from Supabase auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Demo user initialization disabled - create users manually if needed
        // if (import.meta.env.DEV) {
        //   await initializeDemoUsers();
        // }
        
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email,
            isAdmin: false, // Would need to fetch from user metadata
          });
          setAIModeByRole(false);
        }
      } catch (err) {
        console.error('Failed to check auth state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = useCallback(async (request: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const authSession = await login(request);
      setSession(authSession);
      setUser({
        id: authSession.userId,
        email: authSession.email,
        isAdmin: authSession.tier === 'admin', // Map tier to isAdmin
      });
      setAIModeByRole(authSession.tier === 'admin');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignUp = useCallback(async (request: SignUpRequest & { isAdmin?: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      const authSession = await signUp({
        email: request.email,
        password: request.password,
        name: request.name,
        schoolName: request.schoolName,
      });
      setSession(authSession);
      setUser({
        id: authSession.userId,
        email: authSession.email,
        isAdmin: request.isAdmin || false,
      });
      setAIModeByRole(request.isAdmin || false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (session?.sessionToken) {
        await supabaseLogout(session.sessionToken);
      }
      setUser(null);
      setSession(null);
      setAIModeByRole(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session?.sessionToken]);

  return (
    <AuthContext.Provider 
      value={{
        user,
        session,
        isLoading,
        error,
        signIn: handleLogin,
        signUp: handleSignUp,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
