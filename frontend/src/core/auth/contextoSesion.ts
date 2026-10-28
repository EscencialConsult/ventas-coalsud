import { createContext } from 'react'
import type { Perfil } from '@/core/models/organizacion'
import type { UsuarioDemo } from '@/fixtures/organizacion'

export type MotivoSalida = 'manual' | 'inactividad' | 'usuario_inactivo' | 'sesion_vencida'

export type EstadoSesion =
  | { estado: 'cargando' }
  | { estado: 'sin_sesion'; motivo?: MotivoSalida }
  | { estado: 'activa'; perfil: Perfil }

export interface ValorSesion {
  sesion: EstadoSesion
  perfil: Perfil | null
  ingresar(email: string, password: string): Promise<void>
  cambiarPassword(nueva: string): Promise<void>
  salir(motivo?: MotivoSalida): Promise<void>
  /** Solo modo fixtures (⚙ DT-17). */
  demo?: { usuarios: UsuarioDemo[]; ingresarComo(id: string): Promise<void> }
}

export const ContextoSesion = createContext<ValorSesion | undefined>(undefined)
