// Formas del Contrato de API (backend/docs/03-especificacion/Contrato_API.md).
// Los campos van en snake_case, igual que en la base y en los tipos generados.

export interface Regional {
  id: string
  codigo: string
  nombre: string
}

export type Rol = 'nacional' | 'regional'

/** rpc('mi_perfil') — Contrato §3 */
export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  debe_cambiar_password: boolean
  /** El nacional recibe todas las regionales. */
  regionales: Regional[]
}

export interface Vendedor {
  id: string
  regional_id: string
  nombre: string
  telefono: string | null
  activo: boolean
}
