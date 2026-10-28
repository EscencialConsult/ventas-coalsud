import { Bell, CalendarClock, CircleCheck, FileWarning, PackageX } from 'lucide-react'
import { useAvisos } from '@/core/avisos/useAvisos'
import { mapearError } from '@/core/errores/mapearError'
import { formatoFecha } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { ChipIcono } from '@/shared/ui/ChipIcono'
import { Desplegable, ItemDesplegable } from '@/shared/ui/Desplegable'
import { Skeleton } from '@/shared/ui/Estados'

// Campana del topbar: los mismos avisos del shell (un solo request, avisos_shell).
export function Campana() {
  const avisos = useAvisos()
  const data = avisos.data
  const total = data ? data.bajo_minimo + data.notas_sin_factura + data.dias_pendientes.length : 0

  return (
    <Desplegable
      etiqueta="Avisos"
      className="w-80"
      disparador={(props, abierto) => (
        <BotonIcono tam="lg" etiqueta={total ? `Avisos (${total})` : 'Avisos'} sinTooltip={abierto} {...props}>
          <Bell size={16} />
          {total > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] rounded-full bg-rojo px-1 text-micro leading-[18px] font-bold text-white ring-2 ring-white" aria-hidden>
              {total}
            </span>
          )}
        </BotonIcono>
      )}
    >
      {(cerrar) => (
        <>
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2">
            <span className="text-cuerpo font-semibold">Avisos</span>
            {total > 0 && <Badge variante="marca">{total} pendientes</Badge>}
          </div>
          {avisos.isError && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-error">
              <span>{mapearError(avisos.error).message}</span>
              <Button tam="sm" variante="secundario" onClick={() => avisos.refetch()}>
                Reintentar
              </Button>
            </div>
          )}
          {avisos.isPending && (
            <div className="space-y-2 p-2.5" role="status" aria-label="Cargando avisos…">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          )}
          {data && total === 0 && (
            <div className="flex flex-col items-center gap-2 px-2.5 py-6 text-center text-texto-3">
              <CircleCheck size={22} className="text-ok" aria-hidden />
              Sin avisos pendientes.
            </div>
          )}
          {data?.dias_pendientes.map((d) => (
            <ItemDesplegable key={`${d.regional_id}-${d.fecha}`} a={`/liquidacion/${d.fecha}?regional=${d.regional_id}`} onClick={cerrar} icono={<ChipIcono icono={CalendarClock} tono="alerta" tam="sm" />}>
              Día <b>{formatoFecha(d.fecha)}</b> sin cerrar
              {d.notas_sin_factura > 0 && <span className="block text-chico text-texto-3">{d.notas_sin_factura} notas sin factura</span>}
            </ItemDesplegable>
          ))}
          {!!data?.notas_sin_factura && (
            <ItemDesplegable a="/notas?pendiente_factura=1" onClick={cerrar} icono={<ChipIcono icono={FileWarning} tono="alerta" tam="sm" />}>
              <b>{data.notas_sin_factura}</b> notas sin N° de factura
            </ItemDesplegable>
          )}
          {!!data?.bajo_minimo && (
            <ItemDesplegable a="/inventario/stock?bajo_minimo=1" onClick={cerrar} icono={<ChipIcono icono={PackageX} tono="error" tam="sm" />}>
              <b>{data.bajo_minimo}</b> productos bajo stock mínimo
            </ItemDesplegable>
          )}
        </>
      )}
    </Desplegable>
  )
}
