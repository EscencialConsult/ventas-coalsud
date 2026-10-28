import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filtros de un listado en la URL (06-pantallas/00 §2): se pueden compartir y
 * sobreviven al botón "atrás". Los valores por defecto no se escriben en la
 * URL. Al cambiar cualquier filtro, la página vuelve a la 1.
 *
 * `predeterminados` debe ser una constante del módulo (referencia estable).
 */
export function useFiltrosUrl<T extends Record<string, string>>(predeterminados: T) {
  const [params, setParams] = useSearchParams()

  const filtros = useMemo(() => {
    const valores: Record<string, string> = { ...predeterminados }
    for (const clave of Object.keys(predeterminados)) {
      const valor = params.get(clave)
      if (valor !== null) valores[clave] = valor
    }
    return valores as T
  }, [params, predeterminados])

  const cambiar = useCallback(
    (cambios: Partial<T>, { reemplazar = false }: { reemplazar?: boolean } = {}) => {
      setParams(
        (previos) => {
          const siguientes = new URLSearchParams(previos)
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor === undefined || valor === predeterminados[clave]) siguientes.delete(clave)
            else siguientes.set(clave, valor)
          }
          if (!('pagina' in cambios)) siguientes.delete('pagina')
          return siguientes
        },
        { replace: reemplazar },
      )
    },
    [setParams, predeterminados],
  )

  return [filtros, cambiar] as const
}
