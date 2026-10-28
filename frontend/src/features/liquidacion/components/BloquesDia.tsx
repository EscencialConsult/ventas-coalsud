import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReporteLiquidacion } from '@/core/models/liquidacion'
import { etiquetaFormaPago } from '@/features/cobranzas/cobranzas.opciones'
import { TIPOS_REVERSO } from '@/features/devoluciones/devoluciones.opciones'
import { formatoMonto } from '@/shared/format/moneda'
import { Badge } from '@/shared/ui/Badge'
import { Card } from '@/shared/ui/Card'
import { FiltroSelect } from '@/shared/ui/FiltroSelect'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Tabla, type Columna } from '@/shared/ui/Tabla'

type NotaDia = ReporteLiquidacion['notas'][number]
type CobroDia = ReporteLiquidacion['cobranzas'][number]

/** Créditos / detalle de notas (⚠ SUP-13, SUP-46): crédito resaltado, anuladas tachadas y sin sumar. */
export function DetalleNotasDia({ reporte }: { reporte: ReporteLiquidacion }) {
  const navigate = useNavigate()
  const [vendedor, setVendedor] = useState('')
  const vendedores = [...new Set(reporte.notas.map((n) => n.vendedor))].sort()
  const notas = reporte.notas.filter((n) => !vendedor || n.vendedor === vendedor)
  const columnas: Columna<NotaDia>[] = [
    { clave: 'factura', titulo: 'Factura', numerico: true, render: (n) => n.numero_factura ?? <span className="text-alerta">PENDIENTE</span> },
    { clave: 'nota', titulo: 'Nota', numerico: true, render: (n) => <span className="font-medium">{n.numero}</span> },
    { clave: 'cliente', titulo: 'Cliente', principalMovil: true, render: (n) => n.cliente },
    { clave: 'vendedor', titulo: 'Vendedor', ocultarEnMovil: true, render: (n) => n.vendedor },
    {
      clave: 'condicion',
      titulo: 'Cond.',
      render: (n) => (n.estado === 'anulada' ? 'Anulada' : n.condicion === 'credito' ? <Badge variante="marca">Crédito</Badge> : 'Contado'),
    },
    { clave: 'total', titulo: 'Bs', alinear: 'der', render: (n) => <MontoBs valor={n.total} /> },
  ]
  return (
    <Card
      titulo="Créditos / detalle de notas"
      sinPadding
      acciones={
        vendedores.length > 1 && (
          <FiltroSelect etiqueta="Vendedor" valor={vendedor} alCambiar={setVendedor} opciones={[{ valor: '', etiqueta: 'Todos los vendedores' }, ...vendedores.map((v) => ({ valor: v, etiqueta: v }))]} />
        )
      }
    >
      <Tabla
        etiqueta="Notas del día"
        columnas={columnas}
        filas={notas}
        claveFila={(n) => n.id}
        filaInactiva={(n) => n.estado === 'anulada'}
        alClicFila={(n) => navigate(`/notas/${n.id}`)}
        vacio={<p className="p-4 text-texto-3">Sin notas en el día.</p>}
      />
      <p className="flex flex-wrap justify-end gap-x-5 gap-y-1 border-t border-borde px-4 py-2.5 text-chico text-texto-3 tabular-nums">
        <span>Contado {formatoMonto(reporte.subtotales_notas.contado)}</span>
        <span>Crédito {formatoMonto(reporte.subtotales_notas.credito)}</span>
        <span className="font-semibold text-texto">
          TOTAL Bs {formatoMonto(reporte.subtotales_notas.total)} ({reporte.subtotales_notas.cantidad})
        </span>
      </p>
    </Card>
  )
}

const COLUMNAS_COBROS: Columna<CobroDia>[] = [
  { clave: 'numero', titulo: 'N°', numerico: true, render: (c) => <span className="font-medium">{c.numero}</span> },
  { clave: 'cliente', titulo: 'Cliente', principalMovil: true, render: (c) => c.cliente },
  { clave: 'documento', titulo: 'Documento', render: (c) => c.documento },
  { clave: 'forma', titulo: 'Forma', ocultarEnMovil: true, render: (c) => etiquetaFormaPago(c.forma_pago) },
  { clave: 'importe', titulo: 'Bs', alinear: 'der', render: (c) => <MontoBs valor={c.importe} /> },
]

export function CobranzasDia({ reporte }: { reporte: ReporteLiquidacion }) {
  return (
    <Card titulo="Cobranzas" sinPadding>
      <Tabla etiqueta="Cobranzas del día" columnas={COLUMNAS_COBROS} filas={reporte.cobranzas} claveFila={(c) => c.id} vacio={<p className="p-4 text-texto-3">Sin cobranzas.</p>} />
      <p className="flex justify-between border-t border-borde px-4 py-2.5 text-chico font-semibold tabular-nums">
        <span>TOTAL COBRANZAS</span>
        <span>{formatoMonto(reporte.arqueo.cobranzas)}</span>
      </p>
    </Card>
  )
}

export function DevolucionesDia({ reporte }: { reporte: ReporteLiquidacion }) {
  if (!reporte.devoluciones.length) return null
  return (
    <Card titulo="Devoluciones del día">
      <ul className="grid gap-1 tabular-nums">
        {reporte.devoluciones.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-3">
            <b>{d.numero}</b>
            <span className="text-texto-3">{d.nota}</span>
            <span className="min-w-0 flex-1">{d.cliente}</span>
            <Badge variante={TIPOS_REVERSO[d.tipo_reverso].tono}>{TIPOS_REVERSO[d.tipo_reverso].etiqueta}</Badge>
            <MontoBs valor={d.importe} />
          </li>
        ))}
      </ul>
    </Card>
  )
}
