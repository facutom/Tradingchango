// Fix: Removed problematic 'vite/client' type reference causing compilation error.
// Local interfaces provide type definitions for import.meta.env.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
