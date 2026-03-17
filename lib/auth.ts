/**
 * lib/auth.ts — Shared server-side authentication helper
 *
 * Validates a Supabase JWT by calling the Supabase Auth API.
 * Used by all Vercel API routes that require authentication.
 */

export interface AuthSuccess {
  userId: string;
}

export interface AuthError {
  error: string;
  status: number;
}

export type AuthResult = AuthSuccess | AuthError;

export async function authenticateUser(
  authHeader: string | undefined
): Promise<AuthResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or malformed Authorization header.", status: 401 };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase env vars missing.", status: 500 };
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    });

    if (!res.ok) {
      return { error: "Invalid or expired session.", status: 401 };
    }

    const user = await res.json();
    return user?.id
      ? { userId: user.id }
      : { error: "User not found.", status: 401 };
  } catch (err) {
    console.error("Auth error:", err);
    return { error: "Auth verification failed.", status: 500 };
  }
}
