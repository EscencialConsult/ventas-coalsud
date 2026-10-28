import { CalendarClock, CalendarRange, FileWarning, PackageX, Receipt, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useAvisos } from '@/core/avisos/useAvisos'
import { usePeriodoDashboard } from '@/core/periodo/usePeriodoDashboard'
import { formatoMontoEntero, formatoPct } from '@/shared/format/moneda'
import { Anillo } from '@/shared/ui/Anillo'
import { Skeleton } from '@/shared/ui/Estados'
import { KpiTile } from '@/shared/ui/KpiTile'
import { MontoBs } from '@/shared/ui/MontoBs'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Sparkline } from '@/shared/ui/Sparkline'
import { useCumplimiento, useKpis } from '../dashboard.queries'
import { cumplimientoGeneral, proyeccionGeneral } from '../dashboard.calculos'

const tilesCargando = (cantidad: number, alto: string) => Array.from({ length: cantidad }, (_, i) => <Skeleton key={i} className={`${alto} rounded-card`} />)

// Los contadores salen de avisos (ya cargados por el shell) y el % de
// presupuesto de las filas de cumplimiento: no se piden dos veces (regla 32).
// Los KPI muestran solo la etiqueta, la cifra y, si aporta, un dato extra.
export function KpisDashboard() {
  const kpis = useKpis()
  const avisos = useAvisos()
  const cumplimiento = useCumplimiento()
  // Con filtro de período (⚙ DT-23) cambia "del mes" por "del período"; hoy, presupuesto y CxC no se filtran.
  const filtrado = usePeriodoDashboard().filtro !== null

  return (
    <section aria-label="Indicadores" className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <SeccionConsulta consulta={kpis} cargando={tilesCargando(2, 'h-[124px]')} claseError="col-span-full">
          {(k) => (
            <>
              <KpiTile etiqueta="Ventas de hoy" valor={k.ventas_hoy} formato={formatoMontoEntero} prefijo="Bs" icono={Receipt} tono="rojo" a="/liquidacion" />
              <KpiTile
                etiqueta={filtrado ? 'Ventas del período' : 'Ventas del mes'}
                valor={k.ventas_periodo}
                formato={formatoMontoEntero}
                prefijo="Bs"
                icono={CalendarRange}
                tono="naranja"
                detalle={<Variacion pct={k.variacion_pct} contra={filtrado ? 'período anterior' : 'mes anterior'} />}
                grafico={<Sparkline valores={k.serie.map((d) => d.ventas)} etiqueta={filtrado ? 'Ventas diarias del período' : 'Ventas diarias del mes en curso'} tono="naranja" />}
              />
              {k.cxc && (
                <KpiTile
                  etiqueta="Cuentas por cobrar"
                  valor={k.cxc.saldo}
                  formato={formatoMontoEntero}
                  prefijo="Bs"
                  icono={Wallet}
                  tono="info"
                  detalle={
                    <>
                      Vencido <MontoBs valor={k.cxc.vencido} entero className="font-medium text-error" />
                    </>
                  }
                  a="/eecc"
                />
              )}
            </>
          )}
        </SeccionConsulta>

        <SeccionConsulta consulta={cumplimiento} cargando={tilesCargando(1, 'h-[124px]')} claseError="col-span-full">
          {(filas) => {
            const pct = cumplimientoGeneral(filas)
            const proyeccion = proyeccionGeneral(filas)
            return (
              <KpiTile
                etiqueta="Presupuesto del mes"
                valor={pct}
                sufijo="%"
                icono={Target}
                tono="dorado"
                detalle={proyeccion != null && `Proyección ${formatoPct(proyeccion)}`}
                a="/presupuesto"
                grafico={pct != null && <Anillo pct={pct} etiqueta={`Cumplimiento general ${formatoPct(pct)}`} tono="dorado" />}
              />
            )
          }}
        </SeccionConsulta>
      </div>

      {/* El color ya dice si hay algo pendiente: etiqueta y cifra alcanzan. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SeccionConsulta consulta={avisos} cargando={tilesCargando(3, 'h-[58px]')} claseError="col-span-full">
          {(a) => (
            <>
              <KpiTile tam="compacto" etiqueta="Bajo stock mínimo" valor={a.bajo_minimo} icono={PackageX} tono={a.bajo_minimo ? 'error' : 'ok'} a="/inventario?bajo_minimo=1" />
              <KpiTile
                tam="compacto"
                etiqueta="Días sin cerrar"
                valor={a.dias_pendientes.length}
                icono={CalendarClock}
                tono={a.dias_pendientes.length ? 'alerta' : 'ok'}
                a="/liquidacion"
              />
              <KpiTile
                tam="compacto"
                etiqueta="Notas sin factura"
                valor={a.notas_sin_factura}
                icono={FileWarning}
                tono={a.notas_sin_factura ? 'alerta' : 'ok'}
                a="/notas?pendiente_factura=1"
              />
            </>
          )}
        </SeccionConsulta>
      </div>
    </section>
  )
}

function Variacion({ pct, contra }: { pct: number | null; contra: string }) {
  if (pct == null) return <span>Sin datos del {contra}</span>
  const sube = pct >= 0
  const Icono = sube ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1">
      <span className={sube ? 'inline-flex items-center gap-1 font-medium text-ok' : 'inline-flex items-center gap-1 font-medium text-error'}>
        <Icono size={13} aria-hidden />
        {`${sube ? '+' : ''}${pct.toFixed(1)} %`}
      </span>
      vs {contra}
    </span>
  )
}
