import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Inbox, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from './cn'

// Piezas de estado de pantalla: vacío, cargando y alertas en línea.

export function EmptyState({ icono: Icono = Inbox, titulo, detalle, accion }: { icono?: LucideIcon; titulo: string; detalle?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <span className="mb-1 flex size-14 items-center justify-center rounded-card bg-fondo-3 text-texto-3 shadow-hundido" aria-hidden>
        <Icono size={24} strokeWidth={1.8} />
      </span>
      <p className="text-medio font-semibold text-texto">{titulo}</p>
      {detalle && <p className="max-w-md text-cuerpo text-texto-3">{detalle}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-control bg-superficie/80', className)} aria-hidden />
}

export function SkeletonFilas({ filas = 5 }: { filas?: number }) {
  return (
    <div className="space-y-2.5 p-5" role="status" aria-label="Cargando…">
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

const ALERTAS = {
  ok: ['bg-ok-fondo text-ok border-ok/15', CircleCheck],
  alerta: ['bg-alerta-fondo text-alerta border-alerta/15', TriangleAlert],
  error: ['bg-error-fondo text-error border-error/15', CircleAlert],
  info: ['bg-info-fondo text-info border-info/15', Info],
} as const

export function Alerta({ tipo = 'info', children, accion, className }: { tipo?: keyof typeof ALERTAS; children: ReactNode; accion?: ReactNode; className?: string }) {
  const [clases, Icono] = ALERTAS[tipo]
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border px-3.5 py-2.5 text-cuerpo', clases, className)}>
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icono size={16} className="mt-px shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 text-texto">{children}</div>
      </div>
      {accion && <div className="ml-auto shrink-0">{accion}</div>}
    </div>
  )
}
