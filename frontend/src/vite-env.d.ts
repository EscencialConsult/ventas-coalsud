/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODO_DATOS?: 'fixtures' | 'supabase'
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_INACTIVIDAD_MIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
