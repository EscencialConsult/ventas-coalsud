import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Ban, HandCoins, Printer, Undo2 } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { mapearError } from '@/core/errores/mapearError'
import type { ItemNota, NotaDetalle } from '@/core/models/nota-venta'
import { etiquetaCanal } from '@/features/clientes/clientes.opciones'
import { CobranzasNota } from '@/features/cobranzas/components/CobranzasNota'
import { DevolucionesNota } from '@/features/devoluciones/components/DevolucionesNota'
import { ModalDevolucion } from '@/features/devoluciones/components/ModalDevolucion'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha, formatoFechaHora } from '@/shared/format/fecha'
import { formatoPct } from '@/shared/format/moneda'
import { Badge } from '@/shared/ui/Badge'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ConMotivo } from '@/shared/ui/ConMotivo'
import { Confirmacion } from '@/shared/ui/Confirmacion'
import { Dato, Datos } from '@/shared/ui/Datos'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { Skeleton } from '@/shared/ui/Estados'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { toast } from '@/shared/ui/toast'
import { FacturaNota } from './components/FacturaNota'
import { useAnularNota, useNota } from './notas.queries'
import { imprimirNota } from './notas.rutas'

const COLUMNAS: Columna<ItemNota>[] = [
  { clave: 'producto', titulo: 'Producto', principalMovil: true, render: (i) => <DosLineas principal={<span className="font-medium">{i.producto_nombre}</span>} secundario={i.linea_nombre} /> },
  { clave: 'cantidad', titulo: 'Cant.', alinear: 'der', numerico: true, render: (i) => formatoCantidad(i.cantidad) },
  { clave: 'lista', titulo: 'P/U lista', alinear: 'der', ocultarEnMovil: true, render: (i) => <MontoBs valor={i.precio_base} className="text-texto-3" /> },
  {
    clave: 'precio',
    titulo: 'P/U',
    alinear: 'der',
    render: (i) => (
      <span className="inline-flex items-center gap-2">
        {i.precio_aplicado !== i.precio_base && <Badge variante="alerta">Modificado</Badge>}
        <MontoBs valor={i.precio_aplicado} />
      </span>
    ),
  },
  { clave: 'subtotal', titulo: 'Subtotal', alinear: 'der', render: (i) => <MontoBs valor={i.subtotal} className="font-medium" /> },
]

function Cuenta({ nota }: { nota: NotaDetalle }) {
  if (nota.estado === 'anulada') {
    return (
      <Card titulo="Anulada">
        <Datos className="lg:grid-cols-1">
          <Dato etiqueta="Fecha">{formatoFechaHora(nota.anulada_en)}</Dato>
          <Dato etiqueta="Motivo">{nota.motivo_anulacion ?? <span className="font-normal text-texto-3">Sin motivo</span>}</Dato>
        </Datos>
      </Card>
    )
  }
  const filas: [string, number][] =
    nota.condicion_tipo === 'credito'
      ? [
          ['Total', nota.total],
          ['Cobrado', nota.cobrado],
          ['Abonos', nota.abonado],
        ]
      : [['Total (contado)', nota.total]]
  return (
    <Card titulo="Cuenta">
      <dl className="grid gap-2 tabular-nums">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex justify-between gap-3">
            <dt className="text-texto-3">{etiqueta}</dt>
            <dd>
              <MontoBs valor={valor} />
            </dd>
          </div>
        ))}
        {nota.condicion_tipo === 'credito' && (
          <div className="flex justify-between gap-3 border-t border-borde pt-2">
            <dt className="font-semibold">Saldo</dt>
            <dd className="text-subtitulo font-semibold">
              <MontoBs valor={nota.saldo} />
            </dd>
          </div>
        )}
      </dl>
    </Card>
  )
}

// Detalle de la nota (06-pantallas/07 §3). Anular solo con el día abierto y
// sin cobranzas; si no se puede, el botón dice por qué (⚠ SUP-18).
export default function NotaDetallePage() {
  const { id = '' } = useParams()
  const consulta = useNota(id)
  const nota = consulta.data
  const puede = usePermisos()
  const anular = useAnularNota()
  const [confirmando, setConfirmando] = useState(false)
  const [devolviendo, setDevolviendo] = useState(false)

  const emitida = nota?.estado === 'emitida'
  const motivoNoAnulable = !nota ? null : nota.dia_cerrado ? 'El día está cerrado: use Devolver.' : nota.cobrado > 0 ? 'Tiene cobranzas vigentes: anúlelas primero.' : null

  const confirmarAnulacion = async (motivo: string) => {
    if (!nota) return
    try {
      const r = await anular.mutateAsync({ id: nota.id, motivo: motivo.trim() || null })
      setConfirmando(false)
      toast.exito(`Nota ${nota.numero} anulada`)
      if (r.aviso_factura) toast.info(r.aviso_factura)
    } catch (error) {
      setConfirmando(false)
      const e = mapearError(error)
      if (!e.esInesperado) toast.error(e.message)
    }
  }

  return (
    <Pagina
      titulo={nota?.numero ?? 'Nota de venta'}
      subtitulo={
        nota && (
          <span className="flex flex-wrap gap-1.5">
            <EstadoBadge estado={nota.estado} />
            {nota.pendiente_factura && <EstadoBadge estado="sin_factura" />}
          </span>
        )
      }
      acciones={
        <div className="flex flex-wrap gap-2">
          <BotonEnlace a="/notas" icono={<ArrowLeft size={15} />}>
            Notas
          </BotonEnlace>
          {nota && (
            <Button variante="secundario" icono={<Printer size={15} />} onClick={() => imprimirNota(nota.id)}>
              Imprimir
            </Button>
          )}
          {nota && emitida && nota.saldo > 0 && puede('cobranza.registrar') && (
            <BotonEnlace a={`/cobranzas/nueva?nota=${nota.id}`} icono={<HandCoins size={15} />}>
              Cobrar
            </BotonEnlace>
          )}
          {/* Día cerrado: ya no se anula, se devuelve (⚠ SUP-18). */}
          {nota && emitida && nota.dia_cerrado && puede('nota.devolver') && (
            <Button variante="secundario" icono={<Undo2 size={15} />} onClick={() => setDevolviendo(true)}>
              Devolver
            </Button>
          )}
          {nota && emitida && puede('nota.anular') && (
            <ConMotivo motivo={motivoNoAnulable}>
              <Button variante="peligro" icono={<Ban size={15} />} disabled={motivoNoAnulable !== null} onClick={() => setConfirmando(true)}>
                Anular
              </Button>
            </ConMotivo>
          )}
        </div>
      }
    >
      <SeccionConsulta consulta={consulta} cargando={<Skeleton className="h-64" />} claseError="">
        {(n) => (
          <>
            <Card>
              <Datos>
                <Dato etiqueta="Fecha">{formatoFecha(n.fecha)}</Dato>
                <Dato etiqueta="Cliente">
                  {n.cliente_nombre}
                  {n.cliente_nit && <span className="font-normal text-texto-3"> · NIT {n.cliente_nit}</span>}
                </Dato>
                <Dato etiqueta="Vendedor">{n.vendedor_nombre}</Dato>
                <Dato etiqueta="Canal">{etiquetaCanal(n.canal)}</Dato>
                <Dato etiqueta="Condición">
                  {n.condicion_nombre}
                  {n.condicion_tipo === 'credito' && <span className="font-normal text-texto-3"> · vence {formatoFecha(n.fecha_vencimiento)}</span>}
                </Dato>
                <Dato etiqueta="Origen del stock">{n.origen_stock === 'vendedor' ? 'Saldo del vendedor' : 'Almacén'}</Dato>
                <Dato etiqueta="Registrada por">
                  {n.usuario_nombre} <span className="font-normal text-texto-3 tabular-nums">· {formatoFechaHora(n.created_at)}</span>
                </Dato>
                {n.observaciones && <Dato etiqueta="Observaciones">{n.observaciones}</Dato>}
              </Datos>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <FacturaNota key={`${n.numero_factura}-${n.factura_pdf_path}`} nota={n} editable={n.estado === 'emitida' && puede('nota.factura')} />
              <Cuenta nota={n} />
            </div>

            <Card titulo="Productos" sinPadding>
              <Tabla etiqueta={`Productos de ${n.numero}`} columnas={COLUMNAS} filas={n.items} claveFila={(i) => i.producto_id} />
              <dl className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-borde px-4 py-3 text-chico text-texto-3">
                <div className="flex gap-2">
                  <dt>Subtotal</dt>
                  <dd className="text-texto">
                    <MontoBs valor={n.bruto} />
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt>Descuento {n.descuento_pct > 0 && formatoPct(n.descuento_pct, 2)}</dt>
                  <dd className="text-texto">
                    <MontoBs valor={n.descuento_bs} />
                  </dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="font-semibold text-texto-2">Total</dt>
                  <dd className="text-subtitulo font-semibold text-texto">
                    <MontoBs valor={n.total} />
                  </dd>
                </div>
              </dl>
            </Card>

            {n.condicion_tipo === 'credito' && <CobranzasNota notaId={n.id} />}
            {n.tiene_devolucion && <DevolucionesNota notaId={n.id} />}
            {devolviendo && <ModalDevolucion nota={n} alCerrar={() => setDevolviendo(false)} />}

            <Confirmacion
              abierto={confirmando}
              titulo={`¿Anular la nota ${n.numero}?`}
              consecuencias={[
                `Se repondrá el stock de ${n.items.length} productos ${n.origen_stock === 'vendedor' ? `al saldo de ${n.vendedor_nombre}` : 'al almacén'}.`,
                'La nota queda anulada y no se puede deshacer.',
                ...(n.numero_factura ? [`Avise a Contabilidad que anule la factura ${n.numero_factura}.`] : []),
              ]}
              textoConfirmar="Anular nota"
              peligro
              campoMotivo="opcional"
              cargando={anular.isPending}
              alConfirmar={confirmarAnulacion}
              alCancelar={() => setConfirmando(false)}
            />
          </>
        )}
      </SeccionConsulta>
    </Pagina>
  )
}
