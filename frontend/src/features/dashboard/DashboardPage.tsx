import { X } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import { etiquetaFiltro, textoRango } from '@/core/periodo/periodos'
import { usePeriodoDashboard } from '@/core/periodo/usePeriodoDashboard'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { formatoPeriodo } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Pagina } from '@/shared/ui/Pagina'
import { CumplimientoPresupuestoCard } from './components/CumplimientoPresupuestoCard'
import { KpisDashboard } from './components/KpisDashboard'
import { UltimasNotasCard } from './components/UltimasNotasCard'
import { VentasPorRegionalCard } from './components/VentasPorRegionalCard'

// Dashboard simplificado (RF31, Q2) — 06-pantallas/02_Dashboard.md.
// Cada sección carga y falla por su cuenta (regla 27). Las altas (nueva nota,
// cobro…) están en el "+ Nuevo" del topbar; el filtro de fecha, junto a la fecha.
export default function DashboardPage() {
  const { regionalActiva } = useRegionalActiva()
  const { filtro, quitar } = usePeriodoDashboard()
  const hoy = useHoy()
  const contexto = regionalActiva ? regionalActiva.nombre : 'Vista consolidada'

  return (
    <Pagina
      titulo="Dashboard"
      subtitulo={
        filtro ? (
          // Filtro activo bien visible: que nadie piense que "faltan datos".
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variante="marca" punto>
              Filtro de fecha activo
            </Badge>
            <span className="text-texto-2">
              {contexto} · <b className="font-semibold">{etiquetaFiltro(filtro)}</b> · <span className="tabular-nums">{textoRango(filtro)}</span>
            </span>
            <Button variante="secundario" tam="sm" icono={<X size={13} className="text-rojo" />} onClick={quitar}>
              Quitar filtro
            </Button>
          </span>
        ) : (
          `${contexto} · ${formatoPeriodo(hoy.slice(0, 7))}`
        )
      }
    >
      <KpisDashboard />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <VentasPorRegionalCard />
        <CumplimientoPresupuestoCard />
      </div>
      <UltimasNotasCard />
    </Pagina>
  )
}
