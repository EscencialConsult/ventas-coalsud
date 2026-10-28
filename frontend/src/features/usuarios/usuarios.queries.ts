import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UsuarioSistema } from '@/core/models/maestros'
import { agregarFila, reemplazarFila } from '@/lib/cacheListas'
import { usuariosService, type DatosUsuario } from './usuarios.service'

export const clavesUsuarios = { lista: ['usuarios'] as const }

// La lista es corta (decenas de usuarios): se pide entera una vez y se filtra
// en la pantalla, sin un request por cada filtro.
export function useUsuarios() {
  return useQuery({ queryKey: clavesUsuarios.lista, queryFn: ({ signal }) => usuariosService.listar({ signal }) })
}

export function useCrearUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosUsuario & { email: string; password_temporal: string }) => usuariosService.crear(datos),
    onSuccess: (usuario) => agregarFila<UsuarioSistema>(qc, clavesUsuarios.lista, clavesUsuarios.lista, usuario),
    // El formulario muestra el error en el campo o en un toast.
    onError: () => undefined,
  })
}

export function useActualizarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: DatosUsuario }) => usuariosService.actualizar(id, datos),
    onSuccess: (usuario) => reemplazarFila(qc, clavesUsuarios.lista, usuario),
    onError: () => undefined,
  })
}

/** Con confirmación previa (cierra sesiones): no es optimista. El error va al toast global. */
export function useCambiarActivoUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => usuariosService.cambiarActivo(id, activo),
    onSuccess: (usuario) => reemplazarFila(qc, clavesUsuarios.lista, usuario),
  })
}

export function useResetearPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => usuariosService.resetearPassword(id, password),
    onSuccess: (_r, { id }) => {
      const actual = qc.getQueryData<UsuarioSistema[]>(clavesUsuarios.lista)?.find((u) => u.id === id)
      if (actual) reemplazarFila(qc, clavesUsuarios.lista, { ...actual, debe_cambiar_password: true })
    },
    onError: () => undefined,
  })
}
