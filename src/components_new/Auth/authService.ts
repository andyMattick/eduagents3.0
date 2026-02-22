import { supabase } from "../../../supabase/client";
import {
  LoginRequest,
  SignUpRequest,
} from "@/types/teacherSystem";


export async function login(request: LoginRequest) {
  const { email, password } = request;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;

  return {
    userId: data.user?.id ?? "",
    email: data.user?.email ?? "",
    sessionToken: data.session?.access_token ?? "",
    tier: data.user?.user_metadata?.tier ?? "teacher"
  };
}


export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function logout() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
