import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Devolucion, FiltrosDevoluciones, NuevaDevolucion } from '@/core/models/cobranzas'
import { cambiarFilaOptimista } from '@/lib/cacheListas'
import { devolucionesService } from './devoluciones.service'

export const clavesDevoluciones = {
  listas: ['devoluciones'] as const,
  lista: (regionalId: string | null, f: FiltrosDevoluciones, pagina: number) => ['devoluciones', regionalId, f.desde, f.hasta, f.tipo, pagina] as const,
  deNota: (notaId: string) => ['devoluciones', 'nota', notaId] as const,
  maximo: (notaId: string) => ['max-devolvible', notaId] as const,
}

/** Se pide al abrir el modal (regla 29). */
export function useMaxDevolvible(notaId: string) {
  return useQuery({ queryKey: clavesDevoluciones.maximo(notaId), queryFn: ({ signal }) => devolucionesService.maxDevolvible(notaId, { signal }) })
}

export function useDevoluciones(regionalId: string | null, filtros: FiltrosDevoluciones, pagina: number) {
  return useQuery({ queryKey: clavesDevoluciones.lista(regionalId, filtros, pagina), queryFn: ({ signal }) => devolucionesService.listar(regionalId, filtros, pagina, { signal }) })
}

/** Solo si la nota tiene devoluciones (regla 29). */
export function useDevolucionesNota(notaId: string, habilitado: boolean) {
  return useQuery({ queryKey: clavesDevoluciones.deNota(notaId), queryFn: ({ signal }) => devolucionesService.deNota(notaId, { signal }), enabled: habilitado })
}

export function useRegistrarDevolucion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (devolucion: NuevaDevolucion) => devolucionesService.registrar(devolucion),
    onSuccess: (_r, { nota_id }) => {
      // Stock de hoy, caja (reembolso) o saldo (abono), y la nota.
      for (const clave of [['nota', nota_id], ['max-devolvible', nota_id], ['devoluciones'], ['notas'], ['stock'], ['movimientos'], ['liquidacion'], ['saldos-cliente'], ['ingresos-vendedores']]) {
        void qc.invalidateQueries({ queryKey: clave })
      }
    },
    onError: () => undefined,
  })
}

export function useRegistrarNc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, numero }: { id: string; numero: string }) => devolucionesService.registrarNc(id, numero),
    onSuccess: (r) => {
      cambiarFilaOptimista<Devolucion>(qc, clavesDevoluciones.listas, r.id, { nc_contable_numero: r.nc_contable_numero })
    },
    onError: () => undefined,
  })
}
