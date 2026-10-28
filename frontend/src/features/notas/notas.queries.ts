import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { FiltrosNotas, NotaDetalle, NotaVenta, NuevaNota } from '@/core/models/nota-venta'
import { cambiarFilaOptimista } from '@/lib/cacheListas'
import { notasService } from './notas.service'

// Contrato §9. Las listas cuelgan de ['notas'] y el detalle es ['nota', id].
export const clavesNotas = {
  listas: ['notas'] as const,
  lista: (regionalId: string | null, f: FiltrosNotas, pagina: number) => ['notas', regionalId, f.desde, f.hasta, f.estado, f.vendedorId, f.condicion, f.sinFactura, f.q, pagina] as const,
  nota: (id: string) => ['nota', id] as const,
  hojaCarga: (regionalId: string | null, fecha: string, vendedorId: string | null) => ['hoja-carga', regionalId, fecha, vendedorId] as const,
}

/** Lo que cambia cuando una nota mueve stock y caja: solo se vuelve a pedir lo que está en pantalla. */
function invalidarEfectos(qc: QueryClient) {
  for (const clave of [['stock'], ['movimientos'], ['liquidacion'], ['hoja-carga'], ['avisos'], ['dashboard'], ['clientes', 'notas'], ['saldos-cliente']]) {
    void qc.invalidateQueries({ queryKey: clave })
  }
}

/** Un cambio puntual en la nota: el detalle y su fila en las listas, sin volver a pedirlas. */
function actualizarNota(qc: QueryClient, id: string, cambio: Partial<NotaVenta>) {
  qc.setQueryData<NotaDetalle>(clavesNotas.nota(id), (previa) => (previa ? { ...previa, ...cambio } : previa))
  cambiarFilaOptimista<NotaVenta>(qc, clavesNotas.listas, id, cambio)
}

export function useNotas(regionalId: string | null, filtros: FiltrosNotas, pagina: number) {
  return useQuery({ queryKey: clavesNotas.lista(regionalId, filtros, pagina), queryFn: ({ signal }) => notasService.listar(regionalId, filtros, pagina, { signal }) })
}

export function useNota(id: string, habilitado = true) {
  return useQuery({ queryKey: clavesNotas.nota(id), queryFn: ({ signal }) => notasService.obtener(id, { signal }), enabled: habilitado })
}

export function useHojaCarga(regionalId: string | null, fecha: string, vendedorId: string | null) {
  return useQuery({ queryKey: clavesNotas.hojaCarga(regionalId, fecha, vendedorId), queryFn: ({ signal }) => notasService.hojaCarga(regionalId, fecha, vendedorId, { signal }) })
}

export function useEmitirNota() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nota: NuevaNota) => notasService.emitir(nota),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: clavesNotas.listas })
      invalidarEfectos(qc)
    },
    // El formulario marca la fila, el campo o la fecha.
    onError: () => undefined,
  })
}

export function useRegistrarFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nota, numero, pdf }: { nota: Pick<NotaVenta, 'id' | 'regional_id'>; numero: string; pdf: File | null }) => notasService.registrarFactura(nota, numero, pdf),
    onSuccess: (r) => {
      actualizarNota(qc, r.id, { numero_factura: r.numero_factura, factura_pdf_path: r.factura_pdf_path, pendiente_factura: false })
      for (const clave of [['avisos'], ['liquidacion'], ['clientes', 'notas'], ['saldos-cliente']]) void qc.invalidateQueries({ queryKey: clave })
    },
    onError: () => undefined,
  })
}

export function useAnularNota() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string | null }) => notasService.anular(id, motivo),
    onSuccess: (r) => {
      actualizarNota(qc, r.id, { estado: r.estado, saldo: 0, pendiente_factura: false })
      // Motivo y fecha de anulación vienen con la nota.
      void qc.invalidateQueries({ queryKey: clavesNotas.nota(r.id) })
      invalidarEfectos(qc)
    },
    onError: () => undefined,
  })
}
