import { useCallback, useEffect, useRef, useState } from 'react'
import { INACTIVIDAD_MIN } from '@/lib/config'

const EVENTOS = ['pointerdown', 'keydown', 'wheel'] as const
const AVISO_MS = 60_000

// Cierre de sesión por inactividad (RNF-14, ⚠ SUP-38). Avisa un minuto antes;
// mientras el aviso está abierto, solo "Seguir conectado" cuenta como actividad.
// La actividad se comparte entre pestañas: trabajar en una no cierra la otra.
export function useInactividad(activo: boolean, alExpirar: () => void) {
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null)
  // Se inicializa en el efecto (no en el render: Date.now no es puro).
  const ultimaActividad = useRef(0)
  const avisoAbierto = useRef(false)
  const alExpirarRef = useRef(alExpirar)
  const canal = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    alExpirarRef.current = alExpirar
  }, [alExpirar])

  useEffect(() => {
    if (!activo) return
    ultimaActividad.current = Date.now()
    const limiteMs = INACTIVIDAD_MIN * 60_000
    let ultimoAviso = 0

    canal.current = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('coalsud-actividad')
    canal.current?.addEventListener('message', () => {
      ultimaActividad.current = Date.now()
    })

    const marcar = () => {
      if (avisoAbierto.current) return
      ultimaActividad.current = Date.now()
      // No inundar el canal: basta con un aviso cada 5 s.
      if (ultimaActividad.current - ultimoAviso > 5000) {
        ultimoAviso = ultimaActividad.current
        canal.current?.postMessage('actividad')
      }
    }
    EVENTOS.forEach((e) => window.addEventListener(e, marcar, { passive: true }))

    const intervalo = window.setInterval(() => {
      const inactivoMs = Date.now() - ultimaActividad.current
      if (inactivoMs >= limiteMs) {
        avisoAbierto.current = false
        setSegundosRestantes(null)
        alExpirarRef.current()
      } else if (inactivoMs >= limiteMs - AVISO_MS) {
        avisoAbierto.current = true
        setSegundosRestantes(Math.ceil((limiteMs - inactivoMs) / 1000))
      } else if (avisoAbierto.current) {
        // Otra pestaña registró actividad mientras el aviso estaba abierto.
        avisoAbierto.current = false
        setSegundosRestantes(null)
      }
    }, 1000)

    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, marcar))
      window.clearInterval(intervalo)
      canal.current?.close()
      canal.current = null
    }
  }, [activo])

  const seguirConectado = useCallback(() => {
    ultimaActividad.current = Date.now()
    avisoAbierto.current = false
    setSegundosRestantes(null)
    canal.current?.postMessage('actividad')
  }, [])

  return { segundosRestantes, seguirConectado }
}
