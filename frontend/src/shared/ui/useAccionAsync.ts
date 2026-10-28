import { useCallback, useRef, useState, type MouseEvent } from 'react'

type Manejador = ((e: MouseEvent<HTMLButtonElement>) => unknown) | undefined

// Estado "ocupado" de un botón cuyo onClick devuelve una promesa (regla 33):
// se activa al click, se apaga al terminar y bloquea el doble envío.
// Si la promesa falla y nadie la manejó, el rechazo sigue su curso y lo
// atrapa el manejador global (no se traga en silencio).
export function useAccionAsync(onClick: Manejador) {
  const [ocupado, setOcupado] = useState(false)
  const enCurso = useRef(false)

  const alClic = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (enCurso.current) return
      const resultado = onClick?.(e)
      if (!(resultado instanceof Promise)) return
      enCurso.current = true
      setOcupado(true)
      const terminar = () => {
        enCurso.current = false
        setOcupado(false)
      }
      resultado.then(terminar, (error: unknown) => {
        terminar()
        throw error
      })
    },
    [onClick],
  )

  return { ocupado, alClic }
}
