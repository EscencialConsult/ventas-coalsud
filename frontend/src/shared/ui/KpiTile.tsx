import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { ChipIcono } from './ChipIcono'
import { cn } from './cn'
import { NumeroAnimado } from './NumeroAnimado'
import type { Tono } from './tonos'

interface Props {
  etiqueta: string
  /** null = sin dato (se muestra "—"). */
  valor: number | null
  formato?: (n: number) => string
  /** Unidad antes o después de la cifra ("Bs", "%"): más chica y en gris. */
  prefijo?: string
  sufijo?: string
  /** Solo datos que aporten (variación, vencido…), no explicaciones de la etiqueta. */
  detalle?: ReactNode
  icono: LucideIcon
  tono?: Tono
  /** Pantalla a la que lleva el KPI. */
  a?: string
  /** Mini gráfico a la derecha de la cifra (sparkline, anillo). */
  grafico?: ReactNode
  /** compacto: una sola línea, para contadores de avisos. */
  tam?: 'normal' | 'compacto'
}

const formatoEntero = (n: number) => Math.round(n).toLocaleString('en-US')

const UNIDAD = 'text-[0.58em] font-medium text-texto-3'

export function KpiTile({ etiqueta, valor, formato = formatoEntero, prefijo, sufijo, detalle, icono, tono = 'rojo', a, grafico, tam = 'normal' }: Props) {
  const cifra =
    valor == null ? (
      '—'
    ) : (
      <>
        {prefijo && <span className={cn(UNIDAD, 'mr-1')}>{prefijo}</span>}
        <NumeroAnimado valor={valor} formato={formato} />
        {sufijo && <span className={cn(UNIDAD, 'ml-0.5')}>{sufijo}</span>}
      </>
    )

  const contenido =
    tam === 'compacto' ? (
      <div className="flex items-center gap-3">
        <ChipIcono icono={icono} tono={tono} tam="sm" />
        <div className="min-w-0 flex-1 truncate text-cuerpo font-medium text-texto-2">{etiqueta}</div>
        <div className="text-cifra font-semibold tracking-tight tabular-nums">{cifra}</div>
      </div>
    ) : (
      <>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <ChipIcono icono={icono} tono={tono} tam="sm" />
            <span className="truncate text-cuerpo font-medium text-texto-2">{etiqueta}</span>
          </div>
          {a && <ArrowUpRight size={16} className="shrink-0 text-texto-3 transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-texto" aria-hidden />}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-kpi leading-tight font-semibold tracking-tight tabular-nums">{cifra}</div>
            {detalle && <div className="mt-1 truncate text-chico text-texto-3">{detalle}</div>}
          </div>
          {grafico}
        </div>
      </>
    )

  const clases = cn('group block min-w-0 rounded-card border border-borde bg-white shadow-card', tam === 'compacto' ? 'px-4 py-3' : 'p-4')
  return a ? (
    <Link to={a} className={cn(clases, 'transition-[border-color,box-shadow] duration-200 hover:border-borde-2 hover:shadow-elevado')}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  )
}
