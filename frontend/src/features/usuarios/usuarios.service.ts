import { FunctionsHttpError } from '@supabase/supabase-js'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import { esCodigoContrato } from '@/core/errores/codigos'
import type { UsuarioSistema } from '@/core/models/maestros'
import type { Rol } from '@/core/models/organizacion'
import { responder } from '@/fixtures/latencia'
import { nuevoId, USUARIOS } from '@/fixtures/maestros'
import { exigirNacional, limpio } from '@/fixtures/sesion'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'

// Usuarios (06-pantallas/03, Contrato §8): lectura directa de `usuario` (solo
// el nacional) y escritura por la Edge Function `admin-usuarios`. Servicio
// chico: las dos implementaciones van en el mismo archivo.

export interface DatosUsuario {
  nombre: string
  rol: Rol
  /** ids de regional; vacío para el nacional. */
  regionales: string[]
}

export interface ServicioUsuarios {
  listar(opciones?: OpcionesPeticion): Promise<UsuarioSistema[]>
  crear(datos: DatosUsuario & { email: string; password_temporal: string }): Promise<UsuarioSistema>
  actualizar(id: string, datos: DatosUsuario): Promise<UsuarioSistema>
  /** Desactivar también cierra sus sesiones abiertas. */
  cambiarActivo(id: string, activo: boolean): Promise<UsuarioSistema>
  resetearPassword(id: string, password: string): Promise<void>
}

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MINIMO_PASSWORD = 8

// ── fixtures ──

function validar(datos: DatosUsuario) {
  if (!limpio(datos.nombre)) throw new ErrorNegocio('VALIDACION', 'El nombre es obligatorio.', { campo: 'nombre' })
  if (datos.rol === 'regional' && !datos.regionales.length) {
    throw new ErrorNegocio('VALIDACION', 'Un usuario regional necesita al menos una regional.', { campo: 'regionales' })
  }
}

function buscar(id: string): UsuarioSistema {
  const usuario = USUARIOS.find((u) => u.id === id)
  if (!usuario) throw new ErrorNegocio('NO_ENCONTRADO', 'El usuario no existe.')
  return usuario
}

// Trigger app.tg_ultimo_nacional: debe quedar al menos un nacional activo (CP-01.3).
function exigirOtroNacional(id: string) {
  const otros = USUARIOS.filter((u) => u.id !== id && u.rol === 'nacional' && u.activo)
  if (!otros.length) throw new ErrorNegocio('ULTIMO_NACIONAL', 'Debe quedar al menos un usuario nacional activo.')
}

const fixtures: ServicioUsuarios = {
  async listar(opciones) {
    exigirNacional()
    return responder([...USUARIOS].sort((a, b) => a.nombre.localeCompare(b.nombre)), opciones)
  },

  async crear(datos) {
    exigirNacional()
    validar(datos)
    const email = datos.email.trim().toLowerCase()
    if (!EMAIL_VALIDO.test(email)) throw new ErrorNegocio('VALIDACION', 'El correo no tiene un formato válido.', { campo: 'email' })
    if (USUARIOS.some((u) => u.email === email)) throw new ErrorNegocio('DUPLICADO', 'Ya existe un usuario con ese correo.', { campo: 'email' })
    if (datos.password_temporal.length < MINIMO_PASSWORD) {
      throw new ErrorNegocio('VALIDACION', `La contraseña debe tener al menos ${MINIMO_PASSWORD} caracteres.`, { campo: 'password_temporal' })
    }
    const usuario: UsuarioSistema = {
      id: nuevoId('usr'),
      nombre: datos.nombre.trim(),
      email,
      rol: datos.rol,
      activo: true,
      debe_cambiar_password: true,
      regionales: datos.rol === 'regional' ? datos.regionales : [],
    }
    USUARIOS.push(usuario)
    return responder(usuario)
  },

  async actualizar(id, datos) {
    exigirNacional()
    validar(datos)
    const usuario = buscar(id)
    if (usuario.rol === 'nacional' && datos.rol !== 'nacional' && usuario.activo) exigirOtroNacional(id)
    Object.assign(usuario, { nombre: datos.nombre.trim(), rol: datos.rol, regionales: datos.rol === 'regional' ? datos.regionales : [] })
    return responder(usuario)
  },

  async cambiarActivo(id, activo) {
    exigirNacional()
    const usuario = buscar(id)
    if (!activo && usuario.rol === 'nacional') exigirOtroNacional(id)
    usuario.activo = activo
    return responder(usuario)
  },

  async resetearPassword(id, password) {
    exigirNacional()
    if (password.length < MINIMO_PASSWORD) {
      throw new ErrorNegocio('VALIDACION', `La contraseña debe tener al menos ${MINIMO_PASSWORD} caracteres.`, { campo: 'password' })
    }
    buscar(id).debe_cambiar_password = true
    await responder(null)
  },
}

// ── supabase ──

type FilaUsuario = Omit<UsuarioSistema, 'regionales'> & { usuario_regional: { regional_id: string }[] }

const aUsuario = ({ usuario_regional, ...u }: FilaUsuario): UsuarioSistema => ({ ...u, regionales: usuario_regional.map((r) => r.regional_id) })

// La Edge Function responde { error: { codigo, mensaje } } con status 4xx (Contrato §8).
async function invocarAdmin<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().functions.invoke<T>('admin-usuarios', { body: cuerpo })
  if (error instanceof FunctionsHttpError) {
    const cuerpoError = (await error.context.json().catch(() => null)) as { error?: { codigo?: unknown; mensaje?: string } } | null
    const codigo = cuerpoError?.error?.codigo
    if (esCodigoContrato(codigo)) {
      const campo = codigo === 'DUPLICADO' ? 'email' : undefined
      throw new ErrorNegocio(codigo, cuerpoError?.error?.mensaje ?? 'No se pudo completar la operación.', campo ? { campo } : undefined)
    }
  }
  return dato<T>({ data, error })
}

const supabaseImpl: ServicioUsuarios = {
  async listar(opciones) {
    let consulta = supabase().from('usuario').select('id, nombre, email, rol, activo, debe_cambiar_password, usuario_regional(regional_id)').order('nombre')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<FilaUsuario[]>(await consulta).map(aUsuario)
  },
  async crear(datos) {
    return (await invocarAdmin<{ usuario: UsuarioSistema }>({ accion: 'crear', ...datos })).usuario
  },
  async actualizar(id, datos) {
    return (await invocarAdmin<{ usuario: UsuarioSistema }>({ accion: 'actualizar', id, ...datos })).usuario
  },
  async cambiarActivo(id, activo) {
    return (await invocarAdmin<{ usuario: UsuarioSistema }>({ accion: activo ? 'reactivar' : 'desactivar', id })).usuario
  },
  async resetearPassword(id, password) {
    await invocarAdmin<{ ok: true }>({ accion: 'resetear_password', id, password_temporal: password })
  },
}

export const usuariosService: ServicioUsuarios = MODO_FIXTURES ? fixtures : supabaseImpl
