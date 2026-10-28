import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { BotonIcono } from './BotonIcono'
import { Button } from './Button'
import { ChipIcono } from './ChipIcono'
import { toast, type Toast } from './toast'
import type { Tono } from './tonos'

const ASPECTO: Record<Toast['tipo'], { tono: Tono; icono: typeof CircleCheck }> = {
  exito: { tono: 'ok', icono: CircleCheck },
  error: { tono: 'error', icono: CircleAlert },
  info: { tono: 'info', icono: Info },
}

export function Toaster() {
  const [lista, setLista] = useState<Toast[]>([])
  useEffect(() => toast.suscribir(setLista), [])

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[300] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-[380px]" aria-live="polite">
      <AnimatePresence initial={false}>
        {lista.map((t) => {
          const { tono, icono } = ASPECTO[t.tipo]
          return (
            <m.div
              key={t.id}
              layout
              role={t.tipo === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.16 } }}
              transition={{ type: 'spring', stiffness: 460, damping: 36 }}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-card border border-borde bg-white p-3 text-cuerpo shadow-elevado"
            >
              <ChipIcono icono={icono} tono={tono} tam="sm" />
              <div className="min-w-0 flex-1 pt-1 text-texto">
                {t.mensaje}
                {t.accion && (
                  <div className="mt-2">
                    <Button
                      variante="secundario"
                      tam="sm"
                      onClick={() => {
                        t.accion?.alHacer()
                        toast.cerrar(t.id)
                      }}
                    >
                      {t.accion.etiqueta}
                    </Button>
                  </div>
                )}
              </div>
              <BotonIcono etiqueta="Cerrar aviso" sinTooltip onClick={() => toast.cerrar(t.id)}>
                <X size={14} />
              </BotonIcono>
            </m.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
