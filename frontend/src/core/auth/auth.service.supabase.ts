import type { Perfil } from '@/core/models/organizacion'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import { mapearError } from '@/core/errores/mapearError'
import { dato, supabase } from '@/lib/supabase'
import type { ServicioAuth } from './auth.service'

// Contrato de API §3. Un perfil inactivo se corta acá aunque Supabase haya
// aceptado la contraseña: la base tampoco lo deja operar (RF02 e).
async function perfilActivo(): Promise<Perfil> {
  const perfil = dato<Perfil>(await supabase().rpc('mi_perfil'))
  if (!perfil.activo) {
    await supabase().auth.signOut()
    throw new ErrorNegocio('USUARIO_INACTIVO', 'Su usuario está desactivado. Consulte al administrador.')
  }
  return perfil
}

export const authSupabase: ServicioAuth = {
  async restaurar() {
    const { data } = await supabase().auth.getSession()
    if (!data.session) return null
    return perfilActivo()
  },

  async ingresar(email, password) {
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      // Sin decir qué dato falló (CP-02.2).
      const e = mapearError(error)
      throw e.codigo === 'RED' ? e : new ErrorNegocio('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.')
    }
    return perfilActivo()
  },

  async cambiarPassword(nueva) {
    const { error } = await supabase().auth.updateUser({ password: nueva })
    if (error) throw mapearError(error)
    dato(await supabase().rpc('marcar_password_cambiado'))
    return perfilActivo()
  },

  async salir() {
    await supabase().auth.signOut()
  },

  alCerrarseSesion(callback) {
    const { data } = supabase().auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') callback()
    })
    return () => data.subscription.unsubscribe()
  },
}
