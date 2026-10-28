import type { Devolucion } from '@/core/models/cobranzas'
import { formatoFecha } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { MontoBs } from '@/shared/ui/MontoBs'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { TIPOS_REVERSO } from '../devoluciones.opciones'
import { useDevolucionesNota } from '../devoluciones.queries'

const COLUMNAS: Columna<Devolucion>[] = [
  { clave: 'numero', titulo: 'Devolución', principalMovil: true, numerico: true, render: (d) => <DosLineas principal={<span className="font-medium">{d.numero}</span>} secundario={formatoFecha(d.fecha)} /> },
  { clave: 'tipo', titulo: 'Tipo', render: (d) => <Badge variante={TIPOS_REVERSO[d.tipo_reverso].tono}>{TIPOS_REVERSO[d.tipo_reverso].etiqueta}</Badge> },
  { clave: 'motivo', titulo: 'Motivo', ocultarEnMovil: true, render: (d) => d.motivo },
  { clave: 'importe', titulo: 'Importe', alinear: 'der', render: (d) => <MontoBs valor={d.importe} /> },
  { clave: 'nc', titulo: 'NC contable', render: (d) => d.nc_contable_numero ?? <span className="text-texto-3">Pendiente</span> },
]

/** Devoluciones de una nota: se piden solo si la nota tiene alguna. */
export function DevolucionesNota({ notaId }: { notaId: string }) {
  const consulta = useDevolucionesNota(notaId, true)
  return (
    <Card titulo="Devoluciones" sinPadding>
      <SeccionConsulta consulta={consulta}>
        {(filas) => <Tabla etiqueta="Devoluciones de la nota" columnas={COLUMNAS} filas={filas} claveFila={(d) => d.id} />}
      </SeccionConsulta>
    </Card>
  )
}
