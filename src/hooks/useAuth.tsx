import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabase } from '../services/teacherSystemService';
import { signUp, login } from '../services/authService';
import { initializeDemoUsers } from '../services/initDemo';
import { SignUpRequest, LoginRequest } from '../types/teacherSystem';

interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signUp: (request: SignUpRequest) => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          // Fetch teacher account from database to get is_admin flag
          const { data: accountData, error: accountError } = await supabase
            .from('teacher_accounts')
            .select('is_admin')
            .eq('user_id', data.session.user.id)
            .single();

          const isAdmin = accountError ? false : (accountData?.is_admin || false);
          
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            isAdmin,
          });
        }

        // Demo users disabled - they make 422 errors in StrictMode
        // Users can sign up/log in normally
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSignUp = async (request: SignUpRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await signUp(request);
      
      // After signup, log them in
      await handleLogin({
        email: request.email,
        password: request.password,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (request: LoginRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await login(request);
      
      // Get user info after login
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      
      if (data.session?.user) {
        // Fetch teacher account from database to get is_admin flag
        const { data: accountData, error: accountError } = await supabase
          .from('teacher_accounts')
          .select('is_admin')
          .eq('user_id', data.session.user.id)
          .single();

        const isAdmin = accountError ? false : (accountData?.is_admin || false);
        
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
          isAdmin,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      const supabase = getSupabase();
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMsg);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    signUp: handleSignUp,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
