import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Cliente con service_role: salta la RLS. Solo para acciones que la función ya autorizó. */
export function clienteAdmin(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !clave) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno de la función.')
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } })
}
