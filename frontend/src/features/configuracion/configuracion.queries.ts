import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { avisarErrorToggle } from '@/core/errores/errorFormulario'
import type { Almacen, RegionalMaestro } from '@/core/models/maestros'
import { agregarFila, cambiarFilaOptimista, reemplazarFila } from '@/lib/cacheListas'
import { configuracionService, type DatosAlmacen, type DatosRegional } from './configuracion.service'

// Catálogos (regla 17): se piden una vez y se reutilizan 5 min (combos de
// usuarios, clientes, inventario). Las mutaciones escriben la fila en la caché.
const MAESTRO = 5 * 60_000

export const clavesConfiguracion = {
  regionales: ['regionales'] as const,
  almacenes: ['almacenes'] as const,
}

export function useRegionales() {
  return useQuery({ queryKey: clavesConfiguracion.regionales, queryFn: ({ signal }) => configuracionService.regionales({ signal }), staleTime: MAESTRO })
}

export function useAlmacenes() {
  return useQuery({ queryKey: clavesConfiguracion.almacenes, queryFn: ({ signal }) => configuracionService.almacenes({ signal }), staleTime: MAESTRO })
}

export function useGuardarRegional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string | null; datos: DatosRegional }) => configuracionService.guardarRegional(id, datos),
    onSuccess: (regional, { id }) => {
      if (id) reemplazarFila(qc, clavesConfiguracion.regionales, regional)
      else agregarFila(qc, clavesConfiguracion.regionales, clavesConfiguracion.regionales, regional)
    },
    // El formulario muestra el error en el campo o en un toast.
    onError: () => undefined,
  })
}

export function useGuardarAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string | null; datos: DatosAlmacen }) => configuracionService.guardarAlmacen(id, datos),
    onSuccess: (almacen, { id }) => {
      if (id) reemplazarFila(qc, clavesConfiguracion.almacenes, almacen)
      else agregarFila(qc, clavesConfiguracion.almacenes, clavesConfiguracion.almacenes, almacen)
    },
    onError: () => undefined,
  })
}

// Activar/desactivar: optimista con rollback y aviso (regla 15).
export function useActivarRegional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (r: RegionalMaestro) => configuracionService.guardarRegional(r.id, { codigo: r.codigo, nombre: r.nombre, activo: !r.activo }),
    onMutate: (r) => cambiarFilaOptimista<RegionalMaestro>(qc, clavesConfiguracion.regionales, r.id, { activo: !r.activo }),
    onError: (error, _r, deshacer) => {
      deshacer?.()
      avisarErrorToggle(error)
    },
  })
}

export function useActivarAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (a: Almacen) => configuracionService.guardarAlmacen(a.id, { regional_id: a.regional_id, nombre: a.nombre, activo: !a.activo }),
    onMutate: (a) => cambiarFilaOptimista<Almacen>(qc, clavesConfiguracion.almacenes, a.id, { activo: !a.activo }),
    onError: (error, _a, deshacer) => {
      deshacer?.()
      avisarErrorToggle(error)
    },
  })
}
