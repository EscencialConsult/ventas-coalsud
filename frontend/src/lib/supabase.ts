import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { mapearError } from '@/core/errores/mapearError'

// El único cliente de Supabase de la app; solo lo usan los *.service.supabase.ts.
// Se crea recién al primer uso: en modo fixtures nunca se llama, y por eso las
// variables de Supabase no son obligatorias ahí.
// TODO(BE-03): tipar con createClient<Database> cuando exista src/types/database.ts (⚙ DT-13).
let cliente: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (cliente) return cliente
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el .env del frontend (o use VITE_MODO_DATOS=fixtures).',
    )
  }
  cliente = createClient(url, anonKey)
  return cliente
}

// Desenvuelve { data, error } de supabase-js: o devuelve el dato o lanza un
// ErrorNegocio con el código del contrato (hint).
export function dato<T>(respuesta: { data: unknown; error: unknown }): T {
  if (respuesta.error) throw mapearError(respuesta.error)
  return respuesta.data as T
}
