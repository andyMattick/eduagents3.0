import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAIModeByRole } from '../config/aiConfig';

interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, isAdmin: boolean) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check localStorage for saved user
  useEffect(() => {
    const savedUser = localStorage.getItem('testUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Restore AI mode based on admin status
        setAIModeByRole(parsed.isAdmin);
      } catch (err) {
        console.error('Failed to restore user:', err);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSignIn = (email: string, isAdmin: boolean) => {
    const newUser: AuthUser = {
      id: 'user-' + Math.random().toString(36).slice(2, 9),
      email,
      isAdmin,
    };
    
    setUser(newUser);
    localStorage.setItem('testUser', JSON.stringify(newUser));
    setAIModeByRole(isAdmin);
    setError(null);
  };

  const handleLogout = async () => {
    setUser(null);
    localStorage.removeItem('testUser');
    setError(null);
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        isLoading,
        error,
        signIn: handleSignIn,
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
