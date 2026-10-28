import type { Perfil } from '@/core/models/organizacion'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import { USUARIOS_DEMO } from '@/fixtures/organizacion'
import { esperar } from '@/fixtures/latencia'
import type { ServicioAuth } from './auth.service'

// Sesión simulada. Va en sessionStorage, así que se pierde al cerrar la pestaña
// (06-pantallas/01 §1b).
const CLAVE = 'coalsud.demo.sesion'

type SesionDemo = { usuarioId: string; passwordCambiado: boolean }

function leer(): SesionDemo | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    return crudo ? (JSON.parse(crudo) as SesionDemo) : null
  } catch {
    return null
  }
}

function guardar(sesion: SesionDemo | null) {
  try {
    if (sesion) sessionStorage.setItem(CLAVE, JSON.stringify(sesion))
    else sessionStorage.removeItem(CLAVE)
  } catch {
    // Sin storage (modo privado estricto): la sesión vive solo en memoria de React.
  }
}

function perfilDe(sesion: SesionDemo): Perfil {
  const demo = USUARIOS_DEMO.find((u) => u.perfil.id === sesion.usuarioId)
  if (!demo) throw new ErrorNegocio('SESION_VENCIDA', 'Su sesión expiró. Ingrese nuevamente.')
  return structuredClone({
    ...demo.perfil,
    debe_cambiar_password: demo.perfil.debe_cambiar_password && !sesion.passwordCambiado,
  })
}

/**
 * Perfil de la sesión simulada. Lo usan los demás servicios fixture para
 * imitar lo que la base decide por rol (RLS, datos solo del nacional).
 */
export function perfilDemoActual(): Perfil | null {
  const sesion = leer()
  if (!sesion) return null
  try {
    return perfilDe(sesion)
  } catch {
    return null
  }
}

async function ingresarComo(usuarioId: string): Promise<Perfil> {
  await esperar()
  const sesion = { usuarioId, passwordCambiado: false }
  const perfil = perfilDe(sesion)
  guardar(sesion)
  return perfil
}

export const authFixtures: ServicioAuth = {
  async restaurar() {
    await esperar(undefined, 80)
    const sesion = leer()
    if (!sesion) return null
    try {
      return perfilDe(sesion)
    } catch {
      guardar(null)
      return null
    }
  },

  async ingresar(email, password) {
    await esperar()
    const demo = USUARIOS_DEMO.find((u) => u.perfil.email === email.trim().toLowerCase())
    if (!demo || !password) throw new ErrorNegocio('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.')
    return ingresarComo(demo.perfil.id)
  },

  async cambiarPassword(nueva) {
    await esperar()
    const sesion = leer()
    if (!sesion) throw new ErrorNegocio('SESION_VENCIDA', 'Su sesión expiró. Ingrese nuevamente.')
    if (nueva.length < 8) {
      throw new ErrorNegocio('VALIDACION', 'La contraseña debe tener al menos 8 caracteres.', { campo: 'password' })
    }
    const actualizada = { ...sesion, passwordCambiado: true }
    guardar(actualizada)
    return perfilDe(actualizada)
  },

  async salir() {
    guardar(null)
  },

  alCerrarseSesion() {
    return () => {}
  },

  demo: {
    usuarios: USUARIOS_DEMO,
    ingresarComo,
  },
}
