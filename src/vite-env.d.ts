/* src/vite-env.d.ts */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // GEMINI_API_KEY is server-only — NOT exposed to the browser.
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
