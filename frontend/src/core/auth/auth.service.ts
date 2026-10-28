import type { Perfil } from '@/core/models/organizacion'
import type { UsuarioDemo } from '@/fixtures/organizacion'
import { MODO_FIXTURES } from '@/lib/config'
import { authFixtures } from './auth.service.fixtures'
import { authSupabase } from './auth.service.supabase'

export interface ServicioAuth {
  /** Restaura la sesión guardada (al abrir la app). null = no hay sesión. */
  restaurar(): Promise<Perfil | null>
  ingresar(email: string, password: string): Promise<Perfil>
  /** Cambio de contraseña (obligatorio si debe_cambiar_password). Devuelve el perfil actualizado. */
  cambiarPassword(nueva: string): Promise<Perfil>
  salir(): Promise<void>
  /** Avisa si la sesión se cerró fuera de la app (otra pestaña, token revocado). Devuelve la desuscripción. */
  alCerrarseSesion(callback: () => void): () => void
  /** Solo en modo fixtures (⚙ DT-17): botones "Entrar como…" del login. */
  demo?: {
    usuarios: UsuarioDemo[]
    ingresarComo(usuarioId: string): Promise<Perfil>
  }
}

export const authService: ServicioAuth = MODO_FIXTURES ? authFixtures : authSupabase
