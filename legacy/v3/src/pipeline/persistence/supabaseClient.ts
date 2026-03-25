import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — avoids crashing at module-load time when env vars are missing
// (e.g. Vercel serverless cold-start before process.env is populated).
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url =
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "";

    const anonKey =
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "";

    _client = createClient(url, anonKey);
  }
  return _client;
}

// Proxy preserves `export const supabase` API — all property access is
// forwarded to the lazily-created client so existing consumers keep working.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
