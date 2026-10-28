import type { Perfil, Regional, Vendedor } from '@/core/models/organizacion'

// Datos de ejemplo (⚙ DT-17). Nombres de F1/F2/F5; no son datos reales del cliente.

export const REGIONALES: Regional[] = [
  { id: 'reg-lp', codigo: 'LP', nombre: 'La Paz' },
  { id: 'reg-cbba', codigo: 'CBBA', nombre: 'Cochabamba' },
  { id: 'reg-scz', codigo: 'SCZ', nombre: 'Santa Cruz' },
]

const [LP, CBBA, SCZ] = REGIONALES

export interface UsuarioDemo {
  perfil: Perfil
  descripcion: string
}

// Los botones de "Entrar como…" del login en modo fixtures (06-pantallas/01 §1b).
export const USUARIOS_DEMO: UsuarioDemo[] = [
  {
    descripcion: 'Nacional · ve las tres regionales',
    perfil: {
      id: 'usr-irene', nombre: 'Irene', email: 'irene@coalsud.demo', rol: 'nacional',
      activo: true, debe_cambiar_password: false, regionales: REGIONALES,
    },
  },
  {
    // Acceso total del ingeniero: ⚠ SUP-50 (la referencia queda en el código, no en pantalla).
    descripcion: 'Nacional · acceso a todo',
    perfil: {
      id: 'usr-ingeniero', nombre: 'Ingeniero', email: 'ingeniero@coalsud.demo', rol: 'nacional',
      activo: true, debe_cambiar_password: false, regionales: REGIONALES,
    },
  },
  {
    descripcion: 'Regional · La Paz + Cochabamba',
    perfil: {
      id: 'usr-vanessa', nombre: 'Vanessa', email: 'vanessa@coalsud.demo', rol: 'regional',
      activo: true, debe_cambiar_password: false, regionales: [LP, CBBA],
    },
  },
  {
    descripcion: 'Regional · Santa Cruz',
    perfil: {
      id: 'usr-fernando', nombre: 'Fernando', email: 'fernando@coalsud.demo', rol: 'regional',
      activo: true, debe_cambiar_password: false, regionales: [SCZ],
    },
  },
  {
    descripcion: 'Primer ingreso · debe cambiar la contraseña',
    perfil: {
      id: 'usr-nuevo', nombre: 'Usuario nuevo', email: 'nuevo@coalsud.demo', rol: 'regional',
      activo: true, debe_cambiar_password: true, regionales: [LP],
    },
  },
]

export const VENDEDORES: Vendedor[] = [
  { id: 'ven-flavia', regional_id: LP.id, nombre: 'Flavia Rivera', telefono: '71234567', activo: true },
  { id: 'ven-arturo', regional_id: LP.id, nombre: 'Arturo Reynaga', telefono: '72345678', activo: true },
  { id: 'ven-martha', regional_id: LP.id, nombre: 'Martha Canedo', telefono: null, activo: true },
  { id: 'ven-jorge', regional_id: CBBA.id, nombre: 'Jorge León', telefono: '73456789', activo: true },
  { id: 'ven-mario', regional_id: SCZ.id, nombre: 'Mario Condori', telefono: '74567890', activo: true },
  { id: 'ven-sheila', regional_id: SCZ.id, nombre: 'Sheila', telefono: null, activo: true },
  { id: 'ven-marcela', regional_id: SCZ.id, nombre: 'Marcela', telefono: null, activo: true },
]

/** Usuario regional de ejemplo de cada regional (autor del historial de los fixtures). */
export function usuarioDe(regionalId: string): string {
  return USUARIOS_DEMO.find((u) => u.perfil.rol === 'regional' && u.perfil.regionales.some((r) => r.id === regionalId))?.perfil.nombre ?? 'Sistema'
}
