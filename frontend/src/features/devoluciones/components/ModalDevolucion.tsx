import { useState } from 'react'
import { mapearError } from '@/core/errores/mapearError'
import type { TipoReverso } from '@/core/models/cobranzas'
import type { NotaDetalle } from '@/core/models/nota-venta'
import { useHoy } from '@/core/fecha/useHoy'
import { leerNumero } from '@/features/notas/notas.calculos'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto, redondear } from '@/shared/format/moneda'
import { Input, Textarea } from '@/shared/ui/Campo'
import { Alerta, SkeletonFilas } from '@/shared/ui/Estados'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Segmentado } from '@/shared/ui/Segmentado'
import { toast } from '@/shared/ui/toast'
import { importeDevolucion } from '../devoluciones.calculos'
import { useMaxDevolvible, useRegistrarDevolucion } from '../devoluciones.queries'

const GRILLA = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_64px_72px_64px_104px_96px]'

// Devolución de una nota de un día cerrado (06-pantallas/07 §4, Reglas §4).
// La fecha es hoy; el día de la nota no se modifica.
export function ModalDevolucion({ nota, alCerrar }: { nota: NotaDetalle; alCerrar: () => void }) {
  const hoy = useHoy()
  const max = useMaxDevolvible(nota.id)
  const registrar = useRegistrarDevolucion()
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [tipo, setTipo] = useState<TipoReverso>('reembolso')
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<{ filas: Record<string, string>; motivo?: string; general?: string }>({ filas: {} })

  const items = max.data?.items ?? []
  const elegidos = items.map((i) => ({ ...i, cantidad: leerNumero(cantidades[i.producto_id] ?? '') ?? 0 })).filter((i) => i.cantidad > 0)
  const importe = importeDevolucion(elegidos.map((i) => ({ cantidad: i.cantidad, precio: i.precio_aplicado })), nota.descuento_pct)
  const unidades = elegidos.reduce((t, i) => t + i.cantidad, 0)
  const credito = nota.condicion_tipo === 'credito'
  const saldo = max.data?.saldo ?? 0
  const sucio = elegidos.length > 0 || motivo.trim() !== ''

  const guardar = async () => {
    const filas: Record<string, string> = {}
    for (const i of items) {
      const texto = cantidades[i.producto_id]?.trim()
      if (!texto) continue
      const q = leerNumero(texto)
      if (q === null) filas[i.producto_id] = 'Cantidad inválida.'
      else if (q > i.maximo) filas[i.producto_id] = `Máximo ${formatoCantidad(i.maximo)}.`
    }
    const general = !elegidos.length ? 'Indique cuánto se devuelve de al menos un producto.' : undefined
    const errorMotivo = motivo.trim() ? undefined : 'El motivo es obligatorio.'
    setErrores({ filas, motivo: errorMotivo, general })
    if (Object.keys(filas).length || general || errorMotivo) return
    try {
      const r = await registrar.mutateAsync({ nota_id: nota.id, tipo_reverso: tipo, motivo, items: elegidos.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })) })
      toast.exito(`Devolución ${r.numero} registrada · Bs ${formatoMonto(r.importe)}`)
      alCerrar()
    } catch (error) {
      const e = mapearError(error)
      if (e.esInesperado) return
      const productoId = e.detalle?.producto_id
      if (typeof productoId === 'string') setErrores((x) => ({ ...x, filas: { [productoId]: e.message } }))
      else if (e.detalle?.campo === 'motivo') setErrores((x) => ({ ...x, motivo: e.message }))
      else setErrores((x) => ({ ...x, general: e.message }))
    }
  }

  return (
    <ModalFormulario
      abierto
      tam="lg"
      titulo={`Devolución de ${nota.numero}`}
      sucio={sucio}
      guardando={registrar.isPending}
      textoGuardar="Registrar devolución"
      alCerrar={alCerrar}
      alGuardar={guardar}
    >
      <div className="grid gap-4">
        <p className="text-chico text-texto-3">
          Nota del {formatoFecha(nota.fecha)} (día cerrado) · la devolución se registra hoy, {formatoFecha(hoy)}.
        </p>
        {errores.general && <Alerta tipo="error">{errores.general}</Alerta>}

        {max.isPending ? (
          <SkeletonFilas filas={3} />
        ) : max.isError ? (
          <Alerta tipo="error">{mapearError(max.error).message}</Alerta>
        ) : (
          <div className="rounded-control border border-borde">
            <div className={`${GRILLA} hidden border-b border-borde px-3 py-2 text-mini font-semibold text-texto-3 uppercase sm:grid`} aria-hidden>
              <span>Producto</span>
              <span className="text-right">Vendido</span>
              <span className="text-right">Devuelto</span>
              <span className="text-right">Máximo</span>
              <span>Devolver</span>
              <span className="text-right">Importe</span>
            </div>
            <ul aria-label="Productos de la nota" className="divide-y divide-borde/70">
              {items.map((i) => {
                const q = leerNumero(cantidades[i.producto_id] ?? '') ?? 0
                return (
                  <li key={i.producto_id} className={`${GRILLA} px-3 py-2`}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{i.producto}</span>
                      <span className="text-chico text-texto-3 tabular-nums sm:hidden">
                        Vendido {formatoCantidad(i.vendido)} · devuelto {formatoCantidad(i.devuelto)} · máx. {formatoCantidad(i.maximo)}
                      </span>
                    </span>
                    <span className="hidden text-right tabular-nums sm:block">{formatoCantidad(i.vendido)}</span>
                    <span className="hidden text-right text-texto-3 tabular-nums sm:block">{formatoCantidad(i.devuelto)}</span>
                    <span className="hidden text-right tabular-nums sm:block">{formatoCantidad(i.maximo)}</span>
                    <Input
                      label={`Devolver de ${i.producto}`}
                      inputMode="decimal"
                      placeholder="0"
                      disabled={i.maximo <= 0}
                      value={cantidades[i.producto_id] ?? ''}
                      error={errores.filas[i.producto_id]}
                      onChange={(e) => setCantidades((c) => ({ ...c, [i.producto_id]: e.target.value }))}
                      className="col-span-2 sm:col-span-1 [&_label]:sr-only"
                    />
                    <span className="hidden text-right tabular-nums sm:block">{q > 0 ? formatoMonto(redondear(q * i.precio_aplicado)) : '—'}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-chico font-semibold text-texto-2">
            Tipo <span className="text-rojo">*</span>
          </span>
          <Segmentado
            etiqueta="Tipo de devolución"
            valor={tipo}
            alCambiar={setTipo}
            opciones={[
              { valor: 'reembolso', etiqueta: 'Reembolso' },
              ...(credito && saldo > 0 ? [{ valor: 'abono_cuenta' as const, etiqueta: 'Abono a cuenta' }] : []),
            ]}
          />
          <span className="text-chico text-texto-3">
            {tipo === 'reembolso'
              ? `Sale de la caja de hoy${credito ? ` (hasta lo cobrado: Bs ${formatoMonto(max.data?.cobrado_neto ?? 0)})` : ''}.`
              : `Baja la deuda del cliente (saldo Bs ${formatoMonto(saldo)}).`}
          </span>
        </div>

        <Textarea label="Motivo" requerido value={motivo} error={errores.motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Producto vencido, error de pedido…" />

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-borde pt-3">
          <span className="text-chico text-texto-3">
            {unidades > 0 ? `Repone ${formatoCantidad(unidades)} u. en el almacén hoy. Contabilidad deberá emitir la nota de crédito.` : 'Indique las cantidades a devolver.'}
          </span>
          <span className="text-chico text-texto-2">
            Importe <MontoBs valor={importe} className="text-subtitulo font-semibold text-texto" />
          </span>
        </div>
      </div>
    </ModalFormulario>
  )
}
