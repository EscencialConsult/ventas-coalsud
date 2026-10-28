import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useInactividad } from '@/core/auth/useInactividad'
import { PeriodoDashboardProvider } from '@/core/periodo/PeriodoDashboardProvider'
import { useSesion } from '@/core/auth/useSesion'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { usePreferencia } from '@/shared/hooks/usePreferencia'
import { cn } from '@/shared/ui/cn'
import { AvisoInactividad } from './AvisoInactividad'
import { BannerDia } from './BannerDia'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// Título de la pestaña: el de la pantalla actual (handle.titulo de la ruta).
function useTituloDocumento() {
  const matches = useMatches()
  const titulo = matches.map((m) => (m.handle as { titulo?: string } | undefined)?.titulo).findLast(Boolean)
  useEffect(() => {
    document.title = titulo ? `${titulo} — COALSUD` : 'ONE Comercial — COALSUD'
  }, [titulo])
}

// Shell de las pantallas con sesión (04-Sistema_de_Diseno §3): sidebar fijo
// ≥ 1024 px (contraíble a solo íconos) y como drawer debajo de ese ancho.
export function AppShell() {
  const { salir } = useSesion()
  useTituloDocumento()
  const esEscritorio = useMediaQuery('(min-width: 1024px)')
  const [compacto, setCompacto] = usePreferencia<boolean>('sidebar-compacto', false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const expirar = useCallback(() => void salir('inactividad'), [salir])
  const { segundosRestantes, seguirConectado } = useInactividad(true, expirar)

  // Al pasar a escritorio el drawer deja de existir: no debe reabrirse solo al volver.
  if (esEscritorio && menuAbierto) setMenuAbierto(false)
  const cerrarMenu = useCallback(() => setMenuAbierto(false), [])

  return (
    // El filtro de período vive en el shell: lo usan el topbar y el dashboard, y se pierde al salir o recargar.
    <PeriodoDashboardProvider>
      <div className="min-h-screen">
        {esEscritorio ? (
          <div className="fixed inset-y-0 left-0 z-[100]">
            <Sidebar compacto={compacto} alAlternarCompacto={() => setCompacto(!compacto)} />
          </div>
        ) : (
          <Drawer abierto={menuAbierto} alCerrar={cerrarMenu} />
        )}

        <div className={cn('flex min-h-screen flex-col transition-[margin] duration-200 ease-out', esEscritorio && (compacto ? 'ml-sidebar-mini' : 'ml-sidebar'))}>
          <Topbar alAbrirMenu={() => setMenuAbierto(true)} />
          <BannerDia />
          <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-5 lg:p-6">
            <Outlet />
          </main>
        </div>

        <AvisoInactividad segundos={segundosRestantes} alSeguir={seguirConectado} alSalir={expirar} />
      </div>
    </PeriodoDashboardProvider>
  )
}

// Menú lateral en pantallas chicas: entra desde la izquierda, cierra con Esc,
// con el fondo o al navegar, y lleva el foco adentro mientras está abierto.
function Drawer({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const foco = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('nav a')?.focus()
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      foco?.focus()
    }
  }, [abierto, alCerrar])

  return (
    <AnimatePresence>
      {abierto && (
        <>
          <m.div
            key="fondo"
            className="fixed inset-0 z-[90] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={alCerrar}
            aria-hidden
          />
          <m.div
            key="panel"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
            className="fixed inset-y-0 left-0 z-[100] shadow-elevado"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42 }}
          >
            <Sidebar alNavegar={alCerrar} alCerrar={alCerrar} />
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
