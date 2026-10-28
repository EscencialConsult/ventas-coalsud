import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { mapearError } from '@/core/errores/mapearError'
import { Button } from './Button'
import { Alerta, SkeletonFilas } from './Estados'

interface Props<T> {
  consulta: UseQueryResult<T>
  /** Placeholder mientras carga (por defecto, filas skeleton). */
  cargando?: ReactNode
  /** Clases del contenedor del error; reemplazan el padding por defecto (pensado para ir dentro de una Card). */
  claseError?: string
  children: (datos: T) => ReactNode
}

// Estado por sección (regla 27): cada sección muestra su skeleton, su error
// con "Reintentar" o sus datos, sin depender de las demás.
export function SeccionConsulta<T>({ consulta, cargando, claseError, children }: Props<T>) {
  if (consulta.isPending) return <>{cargando ?? <SkeletonFilas filas={3} />}</>
  if (consulta.isError) {
    return (
      <div className={claseError ?? 'p-4'}>
        <Alerta
          tipo="error"
          accion={
            <Button tam="sm" variante="secundario" onClick={() => consulta.refetch()}>
              Reintentar
            </Button>
          }
        >
          {mapearError(consulta.error).message}
        </Alerta>
      </div>
    )
  }
  return <>{children(consulta.data)}</>
}
