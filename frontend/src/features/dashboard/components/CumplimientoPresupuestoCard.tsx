import { useState } from 'react'
import { Target } from 'lucide-react'
import type { CumplimientoPresupuesto, EstadoPresupuesto } from '@/core/models/dashboard'
import { formatoBs, formatoMontoEntero, formatoPct } from '@/shared/format/moneda'
import { BarraProgreso, type ColorBarra } from '@/shared/ui/BarraProgreso'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState } from '@/shared/ui/Estados'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Segmentado, type OpcionSegmentado } from '@/shared/ui/Segmentado'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useTooltip } from '@/shared/ui/useTooltip'
import { useCumplimiento } from '../dashboard.queries'

type Vista = 'regionales' | 'vendedores'

const VISTAS: OpcionSegmentado<Vista>[] = [
  { valor: 'regionales', etiqueta: 'Regionales' },
  { valor: 'vendedores', etiqueta: 'Vendedores' },
]

// Mismo criterio de color que EstadoBadge (04-Sistema_de_Diseno §5).
const COLOR_ESTADO: Record<EstadoPresupuesto, ColorBarra> = {
  cumplido: 'ok',
  en_camino: 'info',
  en_riesgo: 'alerta',
  bajo: 'error',
  no_cumplido: 'error',
}

// Meta y real no ocupan columnas: en escritorio van en el tooltip (y en el
// nombre accesible de la barra); en la card móvil, debajo del porcentaje.
function CeldaAvance({ fila }: { fila: CumplimientoPresupuesto }) {
  const detalle = `Real ${formatoBs(fila.real)} de ${formatoBs(fila.meta)}`
  const { propsDisparador, tooltip } = useTooltip<HTMLSpanElement>(detalle)
  return (
    <>
      <span {...propsDisparador} className="flex items-center justify-end gap-3 md:justify-start">
        <BarraProgreso valor={fila.real} maximo={fila.meta} etiqueta={`${fila.vendedor ?? fila.regional}: ${detalle}`} color={COLOR_ESTADO[fila.estado]} className="hidden w-24 md:block" />
        <span className="font-medium">{formatoPct(fila.cumplimiento_pct)}</span>
      </span>
      <span className="block text-chico text-texto-3 md:hidden">
        {formatoMontoEntero(fila.real)} de {formatoMontoEntero(fila.meta)}
      </span>
      {tooltip}
    </>
  )
}

const columnas = (vista: Vista): Columna<CumplimientoPresupuesto>[] => [
  {
    clave: 'nombre',
    titulo: vista === 'vendedores' ? 'Vendedor' : 'Regional',
    principalMovil: true,
    render: (f) => (f.vendedor ? <DosLineas principal={<span className="font-medium">{f.vendedor}</span>} secundario={f.regional} /> : <span className="font-medium">{f.regional}</span>),
  },
  { clave: 'avance', titulo: 'Avance', numerico: true, className: 'md:w-52', render: (f) => <CeldaAvance fila={f} /> },
  { clave: 'proy', titulo: 'Proyección', alinear: 'der', numerico: true, render: (f) => (f.proyeccion == null ? '—' : formatoPct((f.proyeccion / f.meta) * 100)) },
  { clave: 'estado', titulo: 'Estado', render: (f) => <EstadoBadge estado={f.estado} /> },
]

export function CumplimientoPresupuestoCard() {
  const consulta = useCumplimiento()
  const [vista, setVista] = useState<Vista>('regionales')

  return (
    <Card
      titulo="Cumplimiento de presupuesto"
      icono={Target}
      tono="dorado"
      sinPadding
      acciones={<Segmentado etiqueta="Ver cumplimiento por" opciones={VISTAS} valor={vista} alCambiar={setVista} />}
    >
      <SeccionConsulta consulta={consulta}>
        {(filas) => (
          // Las dos vistas salen de las mismas filas ya cargadas: cambiar de vista no pide nada.
          <Tabla
            etiqueta={`Cumplimiento de presupuesto por ${vista}`}
            columnas={columnas(vista)}
            filas={filas.filter((f) => f.categoria === null && (vista === 'vendedores' ? f.vendedor !== null : f.vendedor === null))}
            claveFila={(f) => f.presupuesto_id}
            vacio={<EmptyState titulo={vista === 'vendedores' ? 'No hay metas por vendedor este mes' : 'No hay metas por regional este mes'} />}
          />
        )}
      </SeccionConsulta>
    </Card>
  )
}
