// Administración de usuarios, solo nacional (Contrato de API §8, Seguridad RLS §6).
// Crear cuentas en auth.users exige service_role, que no puede estar en el navegador: lo hace esta función.
// Perfil, regionales y auditoría van en RPC transaccionales (admin_*), ejecutables solo con service_role.
import '@supabase/functions-js/edge-runtime.d.ts'
import type { SupabaseClient } from '@supabase/supabase-js'
import { clienteAdmin } from '../_shared/clientes.ts'
import { cabecerasCors } from '../_shared/cors.ts'
import { desdeBase, ErrorApi, responder, responderError } from '../_shared/errores.ts'

type Cuerpo = Record<string, unknown>

const MINIMO_PASSWORD = 8
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Desactivar = ban en auth: no puede ingresar ni renovar la sesión. El JWT vigente ya no lee nada (RLS: usuario_activo).
const BAN_DESACTIVADO = '876000h'

const validacion = (mensaje: string) => new ErrorApi(422, 'VALIDACION', mensaje)
const texto = (c: Cuerpo, campo: string) => (typeof c[campo] === 'string' ? (c[campo] as string).trim() : '')
const opcional = (c: Cuerpo, campo: string) => (typeof c[campo] === 'string' ? (c[campo] as string) : null)

function idDe(c: Cuerpo): string {
  const id = texto(c, 'id')
  if (!id) throw validacion('Falta el id del usuario.')
  return id
}

function regionalesDe(c: Cuerpo): string[] | null {
  if (c.regionales === undefined || c.regionales === null) return null
  if (!Array.isArray(c.regionales) || !c.regionales.every((r) => typeof r === 'string')) {
    throw validacion('Las regionales deben ser una lista de ids.')
  }
  return c.regionales as string[]
}

function passwordDe(c: Cuerpo): string {
  const password = typeof c.password_temporal === 'string' ? c.password_temporal : ''
  if (password.length < MINIMO_PASSWORD) throw validacion(`La contraseña temporal debe tener al menos ${MINIMO_PASSWORD} caracteres.`)
  return password
}

async function rpc<T>(admin: SupabaseClient, funcion: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(funcion, args)
  if (error) throw desdeBase(error)
  return data as T
}

/** Errores de auth.admin que tienen traducción al contrato; el resto es inesperado. */
function desdeAuth(error: { code?: string; message: string }): Error {
  if (error.code === 'email_exists') return new ErrorApi(409, 'DUPLICADO', 'Ya existe un usuario con ese correo.')
  if (error.code === 'weak_password') return validacion(`La contraseña temporal debe tener al menos ${MINIMO_PASSWORD} caracteres.`)
  if (error.code === 'user_not_found') return new ErrorApi(404, 'NO_ENCONTRADO', 'El usuario no existe.')
  return new Error(error.message)
}

/** id del llamador si es un nacional activo (JWT validado con auth.getUser). */
async function nacionalLlamador(admin: SupabaseClient, req: Request): Promise<string> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const { data, error } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null }, error: null }
  if (error || !data.user) throw new ErrorApi(401, 'SESION_VENCIDA', 'Su sesión expiró. Ingrese nuevamente.')

  const { data: llamador, error: errorPerfil } = await admin.from('usuario').select('rol, activo').eq('id', data.user.id).maybeSingle()
  if (errorPerfil) throw desdeBase(errorPerfil)
  if (!llamador?.activo || llamador.rol !== 'nacional') {
    throw new ErrorApi(403, 'SOLO_NACIONAL', 'Solo un usuario nacional puede administrar usuarios.')
  }
  return data.user.id
}

async function crear(admin: SupabaseClient, actor: string, c: Cuerpo) {
  const email = texto(c, 'email').toLowerCase()
  if (!EMAIL_VALIDO.test(email)) throw validacion('El correo no es válido.')
  const password = passwordDe(c)

  // Confirmada desde el alta: las cuentas las crea el nacional (⚠ SUP-30).
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw desdeAuth(error)
  try {
    const usuario = await rpc(admin, 'admin_crear_usuario', {
      p_actor: actor,
      p_id: data.user.id,
      p_nombre: texto(c, 'nombre'),
      p_email: email,
      p_rol: texto(c, 'rol'),
      p_regionales: regionalesDe(c) ?? [],
    })
    return { usuario }
  } catch (e) {
    // Compensación: sin perfil, la cuenta de auth no puede quedar suelta.
    await admin.auth.admin.deleteUser(data.user.id)
    throw e
  }
}

async function actualizar(admin: SupabaseClient, actor: string, c: Cuerpo) {
  const usuario = await rpc(admin, 'admin_actualizar_usuario', {
    p_actor: actor,
    p_id: idDe(c),
    p_nombre: opcional(c, 'nombre'),
    p_rol: opcional(c, 'rol'),
    p_regionales: regionalesDe(c),
  })
  return { usuario }
}

async function cambiarActivo(admin: SupabaseClient, actor: string, c: Cuerpo, activo: boolean) {
  const id = idDe(c)
  // Primero la base: valida que quede al menos un nacional activo (ULTIMO_NACIONAL).
  const usuario = await rpc(admin, 'admin_cambiar_activo', { p_actor: actor, p_id: id, p_activo: activo })
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: activo ? 'none' : BAN_DESACTIVADO })
  if (error) throw desdeAuth(error)
  return { usuario }
}

async function resetearPassword(admin: SupabaseClient, actor: string, c: Cuerpo) {
  const id = idDe(c)
  const { error } = await admin.auth.admin.updateUserById(id, { password: passwordDe(c) })
  if (error) throw desdeAuth(error)
  await rpc(admin, 'admin_marcar_reseteo', { p_actor: actor, p_id: id })
  return { ok: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecerasCors })
  try {
    if (req.method !== 'POST') throw new ErrorApi(405, 'VALIDACION', 'Método no permitido.')
    const admin = clienteAdmin()
    const actor = await nacionalLlamador(admin, req)
    const cuerpo: unknown = await req.json().catch(() => null)
    if (!cuerpo || typeof cuerpo !== 'object') throw validacion('El cuerpo de la petición no es válido.')
    const c = cuerpo as Cuerpo

    switch (c.accion) {
      case 'crear':
        return responder(await crear(admin, actor, c))
      case 'actualizar':
        return responder(await actualizar(admin, actor, c))
      case 'desactivar':
        return responder(await cambiarActivo(admin, actor, c, false))
      case 'reactivar':
        return responder(await cambiarActivo(admin, actor, c, true))
      case 'resetear_password':
        return responder(await resetearPassword(admin, actor, c))
      default:
        throw validacion('Acción desconocida.')
    }
  } catch (e) {
    return responderError(e)
  }
})
