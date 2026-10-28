import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Cobranza, DocumentoCartera, NuevoCobro } from '@/core/models/cobranzas'
import { cobranzasService } from './cobranzas.service'

export const clavesCobranzas = {
  todas: ['cobranzas'] as const,
  deNota: (notaId: string) => ['cobranzas', 'nota', notaId] as const,
  delDia: (regionalId: string, fecha: string) => ['cobranzas', 'dia', regionalId, fecha] as const,
  ingresos: (regionalId: string | null, desde: string, hasta: string, detalle: boolean) => ['ingresos-vendedores', regionalId, desde, hasta, detalle] as const,
}

/** Un cobro cambia saldos y caja: lo que esté en pantalla se vuelve a pedir; lo demás queda viejo. */
function invalidarSaldos(qc: QueryClient, notas: string[]) {
  for (const id of notas) void qc.invalidateQueries({ queryKey: ['nota', id] })
  for (const clave of [['cobranzas'], ['notas'], ['saldos-cliente'], ['liquidacion'], ['ingresos-vendedores'], ['clientes', 'notas']]) void qc.invalidateQueries({ queryKey: clave })
}

/** Cobranzas de una nota a crédito: se piden solo si la nota es a crédito (regla 29). */
export function useCobranzasNota(notaId: string, habilitado: boolean) {
  return useQuery({ queryKey: clavesCobranzas.deNota(notaId), queryFn: ({ signal }) => cobranzasService.deNota(notaId, { signal }), enabled: habilitado })
}

/** Pestaña Cobranzas de la liquidación: se pide al abrirla (regla 29). */
export function useCobranzasDia(regionalId: string, fecha: string) {
  return useQuery({ queryKey: clavesCobranzas.delDia(regionalId, fecha), queryFn: ({ signal }) => cobranzasService.delDia(regionalId, fecha, { signal }) })
}

export function useIngresosVendedores(regionalId: string | null, desde: string, hasta: string, detalle = false) {
  return useQuery({
    queryKey: clavesCobranzas.ingresos(regionalId, desde, hasta, detalle),
    queryFn: ({ signal }) => cobranzasService.ingresosVendedores(regionalId, desde, hasta, detalle, { signal }),
  })
}

export function useRegistrarCobro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cobro: NuevoCobro) => cobranzasService.registrar(cobro),
    onSuccess: (_r, cobro) => invalidarSaldos(qc, cobro.aplicaciones.filter((a) => a.tipo_doc === 'nota').map((a) => a.documento_id)),
    // El formulario marca la fila, el campo o muestra el toast.
    onError: () => undefined,
  })
}

export function useAnularCobro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cobro, motivo }: { cobro: Cobranza; motivo: string }) => cobranzasService.anular(cobro.id, motivo),
    onSuccess: (_r, { cobro }) => invalidarSaldos(qc, cobro.nota_venta_id ? [cobro.nota_venta_id] : []),
    onError: () => undefined,
  })
}

export function useCargarCartera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ regionalId, documentos }: { regionalId: string; documentos: DocumentoCartera[] }) => cobranzasService.cargarCartera(regionalId, documentos),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saldos-cliente'], refetchType: 'none' }),
    onError: () => undefined,
  })
}
