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
  name: string;
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
            name: currentUser.user_metadata?.name ?? "",
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
      const { data, error: loginError } = await login(request.email, request.password);
      if (loginError) throw loginError;
      if (!data?.user?.id) throw new Error("Login failed — no user returned.");
      setSession(null); // Supabase manages the session internally
      setUser({
        id: data.user.id,
        email: data.user.email ?? "",
        name: data.user.user_metadata?.name ?? "",
        isAdmin: data.user.user_metadata?.tier === "admin",
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
        const { data, error: signUpError } = await signUp(
          request.email,
          request.password,
          request.name,
          request.schoolName,
        );
        if (signUpError) throw signUpError;
        if (!data?.user?.id) {
          // Supabase returned no error but also no user — email confirmation likely required
          throw new Error("Account created! Please check your email to confirm before signing in.");
        }
        // If session is null, Supabase requires email confirmation before the user can log in
        if (!data.session) {
          throw new Error("Account created! Please check your email to confirm your account, then sign in.");
        }
        setSession(null);
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          name: request.name ?? "",
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

