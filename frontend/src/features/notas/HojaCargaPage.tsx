import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer, Truck } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import type { HojaCarga } from '@/core/models/nota-venta'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useVendedores } from '@/features/vendedores/vendedores.queries'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoCantidad } from '@/shared/format/cantidad'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { Alerta, EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useHojaCarga } from './notas.queries'

const FILTROS = { fecha: '', vendedor: '' }

const COLUMNAS: Columna<HojaCarga['productos'][number]>[] = [
  { clave: 'producto', titulo: 'Producto', principalMovil: true, render: (p) => <DosLineas principal={p.producto} secundario={p.linea} /> },
  { clave: 'cantidad', titulo: 'Cantidad', alinear: 'der', numerico: true, render: (p) => <span className="font-medium">{formatoCantidad(p.cantidad)}</span> },
  { clave: 'bs', titulo: 'Bs', alinear: 'der', render: (p) => <MontoBs valor={p.bs} /> },
]

// "Hay cambios desde la última impresión" (06-pantallas/07 §6): marca local
// con las notas que se imprimieron para esa fecha y vendedor.
function leerMarca(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function guardarMarca(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento (modo privado): no hay aviso de cambios, nada más.
  }
}

// Hoja de carga (06-pantallas/07 §6, RF42): lo que lleva cada vendedor en el
// día, a partir de las notas emitidas (las anuladas no cuentan).
export default function HojaCargaPage() {
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const fecha = f.fecha || hoy
  const consulta = useHojaCarga(regionalActivaId, fecha, f.vendedor || null)
  const vendedores = useVendedores(regionalActivaId)

  const clave = `coalsud.hoja-carga.${regionalActivaId ?? 'todas'}.${fecha}.${f.vendedor || 'todos'}`
  const firma = consulta.data?.flatMap((h) => h.notas.map((n) => n.id)).sort().join(',') ?? null
  const [marca, setMarca] = useState(() => ({ clave, valor: leerMarca(clave) }))
  if (marca.clave !== clave) setMarca({ clave, valor: leerMarca(clave) })
  const huboCambios = marca.valor !== null && firma !== null && marca.valor !== firma

  const imprimir = () => {
    if (firma === null) return
    guardarMarca(clave, firma)
    setMarca({ clave, valor: firma })
    const params = new URLSearchParams({ ...(regionalActivaId ? { regional: regionalActivaId } : {}), ...(f.vendedor ? { vendedor: f.vendedor } : {}) })
    window.open(`/imprimir/hoja-carga/${fecha}?${params}`, '_blank')
  }

  return (
    <Pagina
      titulo="Hoja de carga"
      subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}
      acciones={
        <div className="flex flex-wrap gap-2">
          <BotonEnlace a="/notas" icono={<ArrowLeft size={15} />}>
            Notas
          </BotonEnlace>
          <Button icono={<Printer size={15} />} disabled={!consulta.data?.length} onClick={imprimir}>
            Imprimir
          </Button>
        </div>
      }
    >
      <Card sinPadding>
        <BarraFiltros>
          <FiltroFechas modo="dia" etiqueta="Fecha" desde={fecha} hasta={fecha} max={hoy} resaltar={fecha !== hoy} alCambiar={(dia) => cambiar({ fecha: dia === hoy ? '' : dia })} />
          <FiltroSelect
            etiqueta="Vendedor"
            valor={f.vendedor}
            alCambiar={(vendedor) => cambiar({ vendedor })}
            opciones={[{ valor: '', etiqueta: 'Todos los vendedores' }, ...(vendedores.data ?? []).map((v) => ({ valor: v.id, etiqueta: v.nombre }))]}
          />
        </BarraFiltros>
        {huboCambios && (
          <div className="px-4 pt-3">
            <Alerta tipo="alerta">Hay cambios desde la última impresión: vuelva a imprimir la hoja.</Alerta>
          </div>
        )}
        <SeccionConsulta consulta={consulta}>
          {(hojas) =>
            hojas.length ? (
              <div className="grid gap-4 p-4">
                {hojas.map((h) => (
                  <section key={h.vendedor_id} aria-labelledby={`hoja-${h.vendedor_id}`} className="overflow-hidden rounded-card border border-borde">
                    <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 bg-fondo-2 px-4 py-3">
                      <h2 id={`hoja-${h.vendedor_id}`} className="text-medio font-semibold">
                        {h.vendedor}
                      </h2>
                      <span className="text-chico text-texto-3 tabular-nums">
                        {h.notas.length} notas · {formatoCantidad(h.totales.unidades)} u. · <MontoBs valor={h.totales.neto} className="font-semibold text-texto" />
                      </span>
                    </header>
                    <Tabla etiqueta={`Carga de ${h.vendedor}`} columnas={COLUMNAS} filas={h.productos} claveFila={(p) => p.producto_id} />
                    <p className="border-t border-borde px-4 py-2.5 text-chico text-texto-3">
                      Notas:{' '}
                      {h.notas.map((n, i) => (
                        <span key={n.id}>
                          {i > 0 && ' · '}
                          <Link to={`/notas/${n.id}`} className="font-medium text-rojo hover:underline">
                            {n.numero}
                          </Link>{' '}
                          {n.cliente}
                          {n.zona && ` (${n.zona})`}
                        </span>
                      ))}
                    </p>
                  </section>
                ))}
              </div>
            ) : (
              <EmptyState icono={Truck} titulo="No hay notas para cargar ese día" />
            )
          }
        </SeccionConsulta>
      </Card>
    </Pagina>
  )
}
