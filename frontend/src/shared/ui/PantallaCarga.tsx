import { Logo } from '@/shared/layout/Logo'

export function PantallaCarga() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-lienzo" role="status" aria-busy="true">
      <Logo tam={48} animado />
      <p className="text-cuerpo font-medium text-texto-3">Cargando…</p>
    </div>
  )
}
