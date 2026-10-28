import type { ReactNode } from 'react'
import * as m from 'motion/react-m'

// Encabezado de página (page-head): título con el subtítulo al lado (sin
// ocupar otra línea; en pantallas angostas envuelve) y acciones. El contenido
// se apila con separación uniforme; la página entra con un desplazamiento corto.
export function Pagina({ titulo, subtitulo, acciones, children }: { titulo: string; subtitulo?: ReactNode; acciones?: ReactNode; children: ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-titulo leading-tight font-bold tracking-tight">{titulo}</h1>
          {subtitulo && <div className="text-cuerpo text-texto-3">{subtitulo}</div>}
        </div>
        {acciones && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{acciones}</div>}
      </div>
      <div className="grid gap-4">{children}</div>
    </m.div>
  )
}
