import type { ReactNode } from 'react'
import * as m from 'motion/react-m'
import { cn } from './cn'
import { TONOS, type Tono } from './tonos'

// Radio con circunferencia 100: el largo del trazo es directamente el %.
const RADIO = 15.9155

interface Props {
  /** Porcentaje 0–100 (lo que pase de 100 se muestra lleno). */
  pct: number
  etiqueta: string
  tono?: Tono
  /** Texto en el centro (p. ej. el % redondeado). */
  centro?: ReactNode
  className?: string
}

// Anillo de progreso en SVG propio (⚙ DT-16). El arco se completa al montar.
export function Anillo({ pct, etiqueta, tono = 'rojo', centro, className }: Props) {
  const fraccion = Math.min(1, Math.max(0, pct / 100))
  return (
    <div className={cn('relative size-14 shrink-0', className)} role="img" aria-label={etiqueta}>
      <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r={RADIO} fill="none" strokeWidth="3.4" className="stroke-superficie" />
        <m.circle
          cx="18"
          cy="18"
          r={RADIO}
          fill="none"
          strokeWidth="3.4"
          strokeLinecap="round"
          className={TONOS[tono].trazo}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: fraccion }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      {centro && <span className="absolute inset-0 flex items-center justify-center text-mini font-semibold tabular-nums">{centro}</span>}
    </div>
  )
}
