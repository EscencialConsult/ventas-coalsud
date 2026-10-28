import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { FiltrosLiquidaciones } from '@/core/models/liquidacion'
import { liquidacionService } from './liquidacion.service'

// Contrato §9: todo lo que toca el día invalida ['liquidacion', …]; el reporte
// se refresca además al volver a la pestaña.
export const clavesLiquidacion = {
  todas: ['liquidacion'] as const,
  reporte: (regionalId: string, fecha: string) => ['liquidacion', 'reporte', regionalId, fecha] as const,
  historial: (regionalId: string | null, f: FiltrosLiquidaciones, pagina: number) => ['liquidacion', 'historial', regionalId, f.desde, f.hasta, f.estado, pagina] as const,
}

export function useReporteLiquidacion(regionalId: string | null, fecha: string) {
  return useQuery({
    queryKey: clavesLiquidacion.reporte(regionalId ?? '', fecha),
    queryFn: ({ signal }) => liquidacionService.reporte(regionalId ?? '', fecha, { signal }),
    enabled: regionalId !== null,
    refetchOnWindowFocus: true,
  })
}

export function useHistorialLiquidaciones(regionalId: string | null, filtros: FiltrosLiquidaciones, pagina: number) {
  return useQuery({ queryKey: clavesLiquidacion.historial(regionalId, filtros, pagina), queryFn: ({ signal }) => liquidacionService.historial(regionalId, filtros, pagina, { signal }) })
}

/** Cerrar o reabrir cambia qué se puede editar en todo el día: notas, cobros, avisos. */
function invalidarDia(qc: QueryClient) {
  for (const clave of [['liquidacion'], ['avisos'], ['nota'], ['notas'], ['cobranzas']]) void qc.invalidateQueries({ queryKey: clave })
}

export function useCerrarDia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ regionalId, fecha }: { regionalId: string; fecha: string }) => liquidacionService.cerrar(regionalId, fecha),
    onSuccess: () => invalidarDia(qc),
    onError: () => undefined,
  })
}

export function useReabrirDia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ regionalId, fecha, motivo }: { regionalId: string; fecha: string; motivo: string }) => liquidacionService.reabrir(regionalId, fecha, motivo),
    onSuccess: () => invalidarDia(qc),
    onError: () => undefined,
  })
}
