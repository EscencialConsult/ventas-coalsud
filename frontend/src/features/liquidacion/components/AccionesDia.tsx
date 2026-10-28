import { useRef, useState } from 'react'
import { CircleCheck, FileDown, FileUp, Lock, Printer, RotateCcw, Save } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import { mapearError } from '@/core/errores/mapearError'
import type { ReporteLiquidacion } from '@/core/models/liquidacion'
import { useRegistrarFactura } from '@/features/notas/notas.queries'
import { MAX_PDF_BYTES } from '@/features/notas/notas.service'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Campo'
import { ConMotivo } from '@/shared/ui/ConMotivo'
import { Confirmacion } from '@/shared/ui/Confirmacion'
import { Alerta } from '@/shared/ui/Estados'
import { Modal } from '@/shared/ui/Modal'
import { toast } from '@/shared/ui/toast'
import { useCerrarDia, useReabrirDia } from '../liquidacion.queries'

type NotaSinFactura = ReporteLiquidacion['validaciones_cierre']['notas_sin_factura'][number]

/** Carga en línea del N° y el PDF de una nota pendiente (⚠ SUP-06, CP-06.5). */
function FilaFactura({ nota, regionalId }: { nota: NotaSinFactura; regionalId: string }) {
  const registrar = useRegistrarFactura()
  const [numero, setNumero] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [error, setError] = useState<string>()
  const archivo = useRef<HTMLInputElement>(null)

  const guardar = async () => {
    if (!numero.trim()) return setError('Ingrese el N° de factura.')
    try {
      const r = await registrar.mutateAsync({ nota: { id: nota.id, regional_id: regionalId }, numero, pdf })
      toast.exito(`Factura ${r.numero_factura} cargada en ${nota.numero}`)
      if (r.advertencia_duplicado) toast.info(`La factura ${r.numero_factura} ya está en otra nota.`)
    } catch (e) {
      aplicarErrorFormulario(e, ['numero_factura', 'pdf'] as const, (_campo, mensaje) => setError(mensaje))
    }
  }

  return (
    <li className="grid items-start gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_160px_auto_auto]">
      <span className="min-w-0 pt-2">
        <b>{nota.numero}</b> · {nota.cliente} <span className="text-texto-3 tabular-nums">· Bs {formatoMonto(nota.total)}</span>
        {pdf && <span className="block truncate text-chico text-texto-3">{pdf.name}</span>}
      </span>
      <Input
        label={`N° de factura de ${nota.numero}`}
        placeholder="N° de factura"
        value={numero}
        error={error}
        onChange={(e) => {
          setNumero(e.target.value)
          setError(undefined)
        }}
        className="[&_label]:sr-only"
      />
      <input
        ref={archivo}
        type="file"
        accept="application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const elegido = e.target.files?.[0] ?? null
          e.target.value = ''
          if (elegido && (elegido.type !== 'application/pdf' || elegido.size > MAX_PDF_BYTES)) return setError('El archivo debe ser un PDF de hasta 10 MB.')
          setPdf(elegido)
        }}
      />
      <Button variante="secundario" icono={<FileUp size={15} />} onClick={() => archivo.current?.click()}>
        PDF
      </Button>
      <Button icono={<Save size={15} />} cargando={registrar.isPending} onClick={guardar}>
        Guardar
      </Button>
    </li>
  )
}

type Paso = 'anteriores' | 'facturas' | 'confirmar' | 'reabrir' | null

// Acciones del día (06-pantallas/09 §1, §4, §5): imprimir, Excel, cerrar (con
// sus validaciones en orden) y reabrir (nacional, solo el último día cerrado).
export function AccionesDia({ reporte }: { reporte: ReporteLiquidacion }) {
  const puede = usePermisos()
  const cerrar = useCerrarDia()
  const reabrir = useReabrirDia()
  const [paso, setPaso] = useState<Paso>(null)
  const { fecha, regional, validaciones_cierre: v } = reporte
  const abierta = reporte.estado === 'abierta'
  const consulta = `?regional=${regional.id}`

  const iniciarCierre = () => setPaso(v.dias_anteriores_abiertos.length ? 'anteriores' : v.notas_sin_factura.length ? 'facturas' : 'confirmar')

  const confirmarCierre = async () => {
    try {
      await cerrar.mutateAsync({ regionalId: regional.id, fecha })
      setPaso(null)
      toast.exito(`Día ${formatoFecha(fecha)} cerrado`)
    } catch (error) {
      const e = mapearError(error)
      if (e.codigo === 'DIA_ANTERIOR_ABIERTO') setPaso('anteriores')
      else if (e.codigo === 'FACTURA_PENDIENTE') setPaso('facturas')
      else {
        setPaso(null)
        if (!e.esInesperado) toast.error(e.message)
      }
    }
  }

  const confirmarReapertura = async (motivo: string) => {
    try {
      await reabrir.mutateAsync({ regionalId: regional.id, fecha, motivo })
      toast.exito(`Día ${formatoFecha(fecha)} reabierto`)
    } catch (error) {
      const e = mapearError(error)
      if (!e.esInesperado) toast.error(e.message)
    } finally {
      setPaso(null)
    }
  }

  const exportar = async () => {
    try {
      const { exportarLiquidacion } = await import('../liquidacion.excel')
      await exportarLiquidacion(reporte)
    } catch (error) {
      toast.error(`No se pudo generar el Excel: ${mapearError(error).message}`)
    }
  }

  const motivoReabrir = reporte.ultimo_cerrado !== fecha && reporte.ultimo_cerrado ? `Solo se puede reabrir el ${formatoFecha(reporte.ultimo_cerrado)}.` : null

  return (
    <div className="flex flex-wrap gap-2">
      <Button variante="secundario" icono={<Printer size={15} />} onClick={() => window.open(`/imprimir/liquidacion/${fecha}${consulta}`, '_blank')}>
        Imprimir
      </Button>
      <Button variante="secundario" icono={<FileDown size={15} />} onClick={exportar}>
        Excel
      </Button>
      {abierta && puede('liquidacion.cerrar') && (
        <Button icono={<Lock size={15} />} onClick={iniciarCierre}>
          Cerrar el día
        </Button>
      )}
      {!abierta && puede('liquidacion.reabrir') && (
        <ConMotivo motivo={motivoReabrir}>
          <Button variante="peligro" icono={<RotateCcw size={15} />} disabled={motivoReabrir !== null} onClick={() => setPaso('reabrir')}>
            Reabrir
          </Button>
        </ConMotivo>
      )}

      <Modal abierto={paso === 'anteriores'} titulo={`Primero cierre el ${formatoFecha(v.dias_anteriores_abiertos[0] ?? fecha)}`} alCerrar={() => setPaso(null)}>
        <p className="mb-3 text-texto-2">Los días se cierran en orden y estos siguen abiertos:</p>
        <div className="flex flex-wrap gap-2">
          {v.dias_anteriores_abiertos.map((d) => (
            <BotonEnlace key={d} a={`/liquidacion/${d}${consulta}`} tam="sm">
              {formatoFecha(d)}
            </BotonEnlace>
          ))}
        </div>
      </Modal>

      <Modal
        abierto={paso === 'facturas'}
        tam="lg"
        titulo="Faltan facturas"
        alCerrar={() => setPaso(null)}
        pie={
          <Button icono={<Lock size={15} />} disabled={v.notas_sin_factura.length > 0} onClick={() => setPaso('confirmar')}>
            Continuar con el cierre
          </Button>
        }
      >
        {v.notas_sin_factura.length ? (
          <>
            <p className="text-texto-2">Para cerrar el día, todas las notas emitidas necesitan su N° de factura (el PDF es opcional).</p>
            <ul className="divide-y divide-borde/70">
              {v.notas_sin_factura.map((n) => (
                <FilaFactura key={n.id} nota={n} regionalId={regional.id} />
              ))}
            </ul>
          </>
        ) : (
          <Alerta tipo="ok">
            <span className="inline-flex items-center gap-2">
              <CircleCheck size={15} aria-hidden /> Todas las notas tienen factura: ya puede cerrar el día.
            </span>
          </Alerta>
        )}
      </Modal>

      <Confirmacion
        abierto={paso === 'confirmar'}
        titulo={`¿Cerrar el día ${formatoFecha(fecha)}?`}
        consecuencias={[
          `Total ventas Bs ${formatoMonto(reporte.arqueo.total_ventas)} · Total efectivo Bs ${formatoMonto(reporte.arqueo.total_efectivo)}.`,
          `${reporte.subtotales_notas.cantidad} notas y ${reporte.cobranzas.length} cobranzas.`,
          'Después de cerrar no se podrán crear ni modificar notas, cobranzas ni movimientos de este día. Solo el nivel nacional puede reabrirlo.',
        ]}
        textoConfirmar="Cerrar el día"
        cargando={cerrar.isPending}
        alConfirmar={confirmarCierre}
        alCancelar={() => setPaso(null)}
      />

      <Confirmacion
        abierto={paso === 'reabrir'}
        titulo={`¿Reabrir el ${formatoFecha(fecha)} de ${regional.nombre}?`}
        consecuencias={['El día vuelve a quedar editable para la regional.', 'Al cerrarlo de nuevo, el reporte se recalcula.']}
        textoConfirmar="Reabrir el día"
        peligro
        campoMotivo="obligatorio"
        cargando={reabrir.isPending}
        alConfirmar={confirmarReapertura}
        alCancelar={() => setPaso(null)}
      />
    </div>
  )
}
