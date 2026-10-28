import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText } from 'lucide-react'
import { usePeriodoDashboard } from '@/core/periodo/usePeriodoDashboard'
import type { NotaVentaResumen } from '@/core/models/nota-venta'
import { formatoFecha } from '@/shared/format/fecha'
import { BotonEnlace } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState } from '@/shared/ui/Estados'
import { MontoBs } from '@/shared/ui/MontoBs'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useUltimasNotas } from '../dashboard.queries'

// Cuatro columnas en vez de ocho: lo secundario (fecha, factura, vendedor,
// condición) va debajo del dato al que acompaña.
const COLUMNAS: Columna<NotaVentaResumen>[] = [
  {
    clave: 'nota',
    titulo: 'Nota',
    numerico: true,
    principalMovil: true,
    render: (n) => (
      <DosLineas
        principal={<span className="font-semibold text-rojo">{n.numero}</span>}
        secundario={[formatoFecha(n.fecha), n.numero_factura].filter(Boolean).join(' · ')}
      />
    ),
  },
  { clave: 'cliente', titulo: 'Cliente', render: (n) => <DosLineas principal={<span className="font-medium">{n.cliente_nombre}</span>} secundario={n.vendedor_nombre} /> },
  {
    clave: 'total',
    titulo: 'Total',
    alinear: 'der',
    numerico: true,
    render: (n) => <DosLineas principal={<MontoBs valor={n.total} className="font-medium" />} secundario={n.condicion_nombre} />,
  },
  {
    clave: 'estado',
    titulo: 'Estado',
    // Una emitida sin factura muestra solo "Sin factura" (ya implica emitida).
    render: (n) => <EstadoBadge estado={n.estado === 'emitida' && n.pendiente_factura ? 'sin_factura' : n.estado} />,
  },
]

export function UltimasNotasCard() {
  const consulta = useUltimasNotas()
  const filtrado = usePeriodoDashboard().filtro !== null
  const navigate = useNavigate()
  return (
    <Card
      titulo="Últimas notas de venta"
      icono={FileText}
      tono="info"
      sinPadding
      acciones={
        <BotonEnlace a="/notas" variante="secundario" tam="sm" icono={<ArrowRight size={14} />} className="[&>span]:flex-row-reverse">
          Ver todas
        </BotonEnlace>
      }
    >
      <SeccionConsulta consulta={consulta}>
        {(notas) => (
          <Tabla
            etiqueta="Últimas notas de venta"
            columnas={COLUMNAS}
            filas={notas}
            claveFila={(n) => n.id}
            filaInactiva={(n) => n.estado === 'anulada'}
            alClicFila={(n) => navigate(`/notas/${n.id}`)}
            vacio={<EmptyState titulo={filtrado ? 'No hay notas de venta en este período' : 'Todavía no hay notas de venta'} />}
          />
        )}
      </SeccionConsulta>
    </Card>
  )
}
