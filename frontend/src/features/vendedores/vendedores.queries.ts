import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { avisarErrorToggle } from '@/core/errores/errorFormulario'
import { mapearError } from '@/core/errores/mapearError'
import type { Vendedor } from '@/core/models/organizacion'
import { agregarFila, cambiarFilaOptimista, reemplazarFila } from '@/lib/cacheListas'
import { vendedoresService, type DatosVendedor } from './vendedores.service'

const MAESTRO = 5 * 60_000

export const clavesVendedores = {
  todos: ['vendedores'] as const,
  deRegional: (regionalId: string | null) => ['vendedores', regionalId] as const,
  enPoder: (regionalId: string | null) => ['stock', 'vendedores', regionalId] as const,
}

/** También es el combo de vendedores (clientes, notas): catálogo por regional (regla 17). */
export function useVendedores(regionalId: string | null, habilitado = true) {
  return useQuery({
    queryKey: clavesVendedores.deRegional(regionalId),
    queryFn: ({ signal }) => vendedoresService.listar(regionalId, { signal }),
    staleTime: MAESTRO,
    enabled: habilitado,
  })
}

export function useMercaderiaEnPoder(regionalId: string | null) {
  return useQuery({ queryKey: clavesVendedores.enPoder(regionalId), queryFn: ({ signal }) => vendedoresService.enPoder(regionalId, { signal }) })
}

export function useGuardarVendedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string | null; datos: DatosVendedor }) => vendedoresService.guardar(id, datos),
    onSuccess: (vendedor, { id }) => {
      if (id) reemplazarFila(qc, clavesVendedores.todos, vendedor)
      else agregarFila(qc, clavesVendedores.todos, clavesVendedores.deRegional(vendedor.regional_id), vendedor)
    },
    // El formulario muestra el error en el campo o en un toast.
    onError: () => undefined,
  })
}

/** Activar/desactivar: optimista con rollback (regla 15). VENDEDOR_CON_SALDO lo muestra la pantalla con su modal. */
export function useActivarVendedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: Vendedor) => vendedoresService.guardar(v.id, { regional_id: v.regional_id, nombre: v.nombre, telefono: v.telefono, activo: !v.activo }),
    onMutate: (v) => cambiarFilaOptimista<Vendedor>(qc, clavesVendedores.todos, v.id, { activo: !v.activo }),
    onError: (error, _v, deshacer) => {
      deshacer?.()
      if (mapearError(error).codigo !== 'VENDEDOR_CON_SALDO') avisarErrorToggle(error)
    },
  })
}
