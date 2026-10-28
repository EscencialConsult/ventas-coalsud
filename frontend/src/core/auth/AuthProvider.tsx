import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fijarUsuarioIncidentes } from '@/core/errores/incidentes'
import { procesarError } from '@/core/errores/procesarError'
import { compartirPeticion } from '@/lib/peticion'
import { toast } from '@/shared/ui/toast'
import { authService } from './auth.service'
import { ContextoSesion, type EstadoSesion, type MotivoSalida, type ValorSesion } from './contextoSesion'

// Fuente única de verdad de la sesión (mismo patrón que comrural/AuthContext).
// La sesión se restaura de forma asíncrona y puede cerrarse desde afuera
// (otra pestaña, token revocado), así que no alcanza con leerla una vez.
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [sesion, setSesion] = useState<EstadoSesion>({ estado: 'cargando' })
  const perfil = sesion.estado === 'activa' ? sesion.perfil : null

  useEffect(() => {
    let vigente = true
    // El doble montaje de StrictMode comparte la misma petición (regla 28).
    compartirPeticion('restaurar-sesion', () => authService.restaurar())
      .then((restaurado) => {
        if (vigente) setSesion(restaurado ? { estado: 'activa', perfil: restaurado } : { estado: 'sin_sesion' })
      })
      .catch((error: unknown) => {
        if (!vigente) return
        const e = procesarError(error)
        setSesion({ estado: 'sin_sesion', motivo: e.codigo === 'USUARIO_INACTIVO' ? 'usuario_inactivo' : undefined })
        if (!e.esInesperado && e.codigo !== 'USUARIO_INACTIVO') toast.error(e.message)
      })
    const desuscribir = authService.alCerrarseSesion(() => {
      queryClient.clear()
      setSesion((actual) => (actual.estado === 'activa' ? { estado: 'sin_sesion', motivo: 'sesion_vencida' } : actual))
    })
    return () => {
      vigente = false
      desuscribir()
    }
  }, [queryClient])

  // El detalle técnico de los errores inesperados lleva el usuario (regla 34).
  const descripcionUsuario = perfil ? `${perfil.nombre} <${perfil.email}> (${perfil.rol})` : null
  useEffect(() => {
    fijarUsuarioIncidentes(descripcionUsuario)
  }, [descripcionUsuario])

  const ingresar = useCallback(async (email: string, password: string) => {
    const restaurado = await authService.ingresar(email, password)
    setSesion({ estado: 'activa', perfil: restaurado })
  }, [])

  const cambiarPassword = useCallback(async (nueva: string) => {
    const actualizado = await authService.cambiarPassword(nueva)
    setSesion({ estado: 'activa', perfil: actualizado })
  }, [])

  const salir = useCallback(
    async (motivo: MotivoSalida = 'manual') => {
      try {
        await authService.salir()
      } catch (error) {
        // La sesión local se cierra igual; se avisa si el servidor no respondió.
        const e = procesarError(error)
        if (!e.esInesperado) toast.error(e.message)
      } finally {
        // Nada de la sesión anterior debe quedar en caché para el próximo usuario.
        queryClient.clear()
        setSesion({ estado: 'sin_sesion', motivo })
      }
    },
    [queryClient],
  )

  const demo = useMemo(() => {
    const servicioDemo = authService.demo
    if (!servicioDemo) return undefined
    return {
      usuarios: servicioDemo.usuarios,
      ingresarComo: async (id: string) => {
        const elegido = await servicioDemo.ingresarComo(id)
        setSesion({ estado: 'activa', perfil: elegido })
      },
    }
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({ sesion, perfil, ingresar, cambiarPassword, salir, demo }),
    [sesion, perfil, ingresar, cambiarPassword, salir, demo],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
