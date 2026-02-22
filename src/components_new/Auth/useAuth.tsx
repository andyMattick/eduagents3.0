import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

import {
  login,
  signUp,
  logout as supabaseLogout,
  getCurrentUser,
} from "./authService";

import {
  AuthSession,
  LoginRequest,
  SignUpRequest,
} from "@/types/teacherSystem";

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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email ?? "",
            isAdmin: currentUser.user_metadata?.tier === "admin",
          });
        }
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
        isAdmin: authSession.tier === "admin",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignUp = useCallback(
    async (request: SignUpRequest & { isAdmin?: boolean }) => {
      setIsLoading(true);
      setError(null);
      try {
        const authSession = await signUp(request);
        setSession(authSession);
        setUser({
          id: authSession.userId,
          email: authSession.email,
          isAdmin: request.isAdmin || false,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Sign up failed";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await supabaseLogout();
      setUser(null);
      setSession(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Logout failed";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

