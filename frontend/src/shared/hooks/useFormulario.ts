import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react'

export type Errores<T> = Partial<Record<keyof T, string>>

/**
 * Estado de un formulario (06-pantallas/00 §3): valida al salir del campo y al
 * enviar, marca los errores que devuelve la base (`marcarError`) y sabe si hay
 * cambios sin guardar (`sucio`).
 */
export function useFormulario<T extends Record<string, unknown>>(inicial: T, validar: (valores: T) => Errores<T>) {
  // Los valores de partida no cambian: en estado (no en ref) para poder leerlos al renderizar.
  const [original] = useState(inicial)
  const [valores, setValores] = useState(inicial)
  const actuales = useRef(inicial)
  const [errores, setErrores] = useState<Errores<T>>({})
  const tocados = useRef(new Set<keyof T>())

  const sucio = useMemo(() => JSON.stringify(valores) !== JSON.stringify(original), [valores, original])

  const cambiar = useCallback(
    <K extends keyof T>(campo: K, valor: T[K]) => {
      const siguientes = { ...actuales.current, [campo]: valor }
      actuales.current = siguientes
      setValores(siguientes)
      // Un campo ya validado se revalida mientras se corrige.
      if (tocados.current.has(campo)) setErrores((e) => ({ ...e, [campo]: validar(siguientes)[campo] }))
    },
    [validar],
  )

  const tocar = useCallback(
    (campo: keyof T) => {
      tocados.current.add(campo)
      setErrores((e) => ({ ...e, [campo]: validar(actuales.current)[campo] }))
    },
    [validar],
  )

  /** Valida todo antes de enviar; devuelve true si se puede guardar. */
  const validarTodo = useCallback((): boolean => {
    const nuevos = validar(actuales.current)
    for (const campo of Object.keys(actuales.current)) tocados.current.add(campo as keyof T)
    setErrores(nuevos)
    return Object.values(nuevos).every((m) => !m)
  }, [validar])

  const marcarError = useCallback((campo: keyof T, mensaje: string) => setErrores((e) => ({ ...e, [campo]: mensaje })), [])

  /** Props para un Input/Textarea/Select de texto. */
  const texto = (campo: keyof T) => ({
    value: String(valores[campo] ?? ''),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => cambiar(campo, e.target.value as T[keyof T]),
    onBlur: () => tocar(campo),
    error: errores[campo],
  })

  /** Props para un Select (lista propia). */
  const seleccion = (campo: keyof T) => ({
    valor: String(valores[campo] ?? ''),
    alCambiar: (valor: string) => cambiar(campo, valor as T[keyof T]),
    onBlur: () => tocar(campo),
    error: errores[campo],
  })

  return { valores, errores, sucio, cambiar, tocar, validarTodo, marcarError, texto, seleccion }
}
