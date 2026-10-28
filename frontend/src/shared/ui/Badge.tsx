import type { ReactNode } from 'react'
import { cn } from './cn'

export type VarianteBadge = 'ok' | 'error' | 'alerta' | 'info' | 'marca' | 'neutro'

const VARIANTES: Record<VarianteBadge, string> = {
  ok: 'bg-ok-fondo text-ok ring-ok/15',
  error: 'bg-error-fondo text-error ring-error/15',
  alerta: 'bg-alerta-fondo text-alerta ring-alerta/15',
  info: 'bg-info-fondo text-info ring-info/15',
  marca: 'bg-rojo-tenue text-rojo ring-rojo/15',
  neutro: 'bg-fondo-3 text-texto-2 ring-borde',
}

const PUNTO: Record<VarianteBadge, string> = {
  ok: 'bg-ok',
  error: 'bg-error',
  alerta: 'bg-alerta',
  info: 'bg-info',
  marca: 'bg-rojo',
  neutro: 'bg-texto-3',
}

interface Props {
  variante?: VarianteBadge
  /** Punto de color antes del texto (estados). */
  punto?: boolean
  children: ReactNode
  className?: string
}

export function Badge({ variante = 'neutro', punto = false, children, className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-mini leading-none font-semibold whitespace-nowrap ring-1 ring-inset', VARIANTES[variante], className)}>
      {punto && <span className={cn('size-1.5 rounded-full', PUNTO[variante])} aria-hidden />}
      {children}
    </span>
  )
}
