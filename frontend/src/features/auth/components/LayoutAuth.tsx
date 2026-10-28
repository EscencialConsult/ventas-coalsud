import type { ReactNode } from 'react'
import * as m from 'motion/react-m'
import { Calculator, FileText, Warehouse, type LucideIcon } from 'lucide-react'
import { Logo, Marca } from '@/shared/layout/Logo'

const PUNTOS: { icono: LucideIcon; texto: string }[] = [
  { icono: FileText, texto: 'Notas de venta, facturas y cobranzas' },
  { icono: Warehouse, texto: 'Inventario por almacén y regional' },
  { icono: Calculator, texto: 'Liquidación diaria con arqueo de caja' },
]

// Pantallas sin sesión (login, cambio de contraseña): panel de marca a la
// izquierda desde lg; en pantallas chicas, solo el contenido.
export function LayoutAuth({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-lienzo">
      <aside className="relative hidden w-[42%] max-w-[580px] flex-col justify-between overflow-hidden bg-sidebar px-12 py-10 lg:flex">
        <Marca />
        <div className="relative">
          <h2 className="font-marca text-portada leading-tight font-extrabold tracking-tight text-white">
            Sistema comercial
            <br />
            de COALSUD
          </h2>
          <ul className="mt-8 space-y-3.5">
            {PUNTOS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-cuerpo text-white/75">
                <span className="flex size-8 items-center justify-center rounded-control bg-white/[0.06] text-rojo-2" aria-hidden>
                  <Icono size={16} />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-chico text-white/35">La Paz · Cochabamba · Santa Cruz</p>
        <Logo tam={420} className="pointer-events-none absolute -right-28 -bottom-28 opacity-[0.06]" />
      </aside>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <m.div className="w-full max-w-[440px]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
          {children}
        </m.div>
      </main>
    </div>
  )
}

/** Encabezado de las tarjetas de auth: la marca solo aparece donde no está el panel. */
export function EncabezadoAuth({ titulo, subtitulo, icono }: { titulo: string; subtitulo?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-6 lg:hidden">
        <Marca oscuro={false} />
      </div>
      <h1 className="flex items-center gap-2 text-titulo leading-tight font-bold tracking-tight">
        {icono}
        {titulo}
      </h1>
      {subtitulo && <p className="mt-1.5 text-cuerpo text-texto-3">{subtitulo}</p>}
    </div>
  )
}
