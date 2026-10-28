import { useQuery } from '@tanstack/react-query'
import { hoyBolivia } from '@/shared/format/fecha'
import { fechaService } from './fecha.service'

const HORA_MS = 60 * 60_000

/**
 * Fecha de hoy en Bolivia según la base. Cambia una vez al día: se pide al
 * entrar y se refresca cada hora o al volver a la pestaña si ya pasó la hora
 * (regla 17). Mientras llega, se usa el reloj local, solo para mostrar.
 */
export function useHoy(): string {
  const { data } = useQuery({
    queryKey: ['hoy'],
    queryFn: ({ signal }) => fechaService.hoy({ signal }),
    staleTime: HORA_MS,
    refetchInterval: HORA_MS,
  })
  return data ?? hoyBolivia()
}
