import { Fragment, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { FilaLiquidacion, LineaLiquidacion, ReporteLiquidacion } from '@/core/models/liquidacion'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoMonto } from '@/shared/format/moneda'
import { useDesplazandose } from '@/shared/hooks/useDesplazandose'
import { cn } from '@/shared/ui/cn'
import { columnasMatriz, etiquetaLarga, type ColumnaMatriz } from '../liquidacion.columnas'

/** Celda como en la planilla: los ceros vacíos; traspaso y ajuste con signo y color (⚠ SUP-09). */
function valor(c: ColumnaMatriz, fila: FilaLiquidacion) {
  const v = fila[c.clave]
  if (!v) return null
  if (c.formato === 'signo') return <span className={v > 0 ? 'text-ok' : 'text-error'}>{`${v > 0 ? '+' : '−'}${formatoCantidad(Math.abs(v))}`}</span>
  return c.formato === 'monto' ? formatoMonto(v) : formatoCantidad(v)
}

/** Anchos fijos en pantalla: la grilla queda pareja y cada grupo cae justo sobre su Q / Bs. */
const anchoColumna = (c: ColumnaMatriz) => (c.grupo ? (c.formato === 'monto' ? 'w-24' : 'w-14') : c.clave === 'precio_unit' ? 'w-20' : 'w-24')

interface Props {
  reporte: Pick<ReporteLiquidacion, 'lineas' | 'columnas_extra' | 'pie'>
  /** Impresión: catálogo completo, sin plegados ni columna fija; el encabezado se repite en cada hoja. */
  impresion?: boolean
  /** "Mostrar catálogo completo" (⚠ SUP-04). */
  completo?: boolean
}

// Matriz de la planilla F3 (06-pantallas/09 §2): por línea, primero los
// productos con movimiento y, plegados al final, los que no tuvieron.
export function MatrizLiquidacion({ reporte, impresion = false, completo = false }: Props) {
  const columnas = columnasMatriz(reporte.columnas_extra)
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())
  const scroller = useRef<HTMLDivElement>(null)
  useDesplazandose(scroller)
  const alternar = (id: string) =>
    setAbiertas((previas) => {
      const siguientes = new Set(previas)
      if (siguientes.has(id)) siguientes.delete(id)
      else siguientes.add(id)
      return siguientes
    })

  const visibles = (l: LineaLiquidacion) => {
    const con = l.productos.filter((p) => p.con_movimiento)
    const sin = l.productos.filter((p) => !p.con_movimiento)
    const todas = impresion || completo || abiertas.has(l.linea_id)
    return { con, sin, todas }
  }
  const grupos = [...new Set(columnas.map((c) => c.grupo))]
  const indice = (clave: ColumnaMatriz['clave']) => columnas.findIndex((c) => c.clave === clave)
  const pie: [string, number, number, number][] = [
    ['TOTAL VENTAS', reporte.pie.contado_bruto, reporte.pie.credito_bruto, reporte.pie.contado_bruto + reporte.pie.credito_bruto],
    ['DESCUENTOS', reporte.pie.descuento_contado, reporte.pie.descuento_credito, reporte.pie.descuento_contado + reporte.pie.descuento_credito],
    ['TOTALES', reporte.pie.contado_neto, reporte.pie.credito_neto, reporte.pie.total_ventas],
  ]
  // Pantalla: división vertical más tenue que la horizontal, solo para guiar la columna.
  const celda = cn('text-right tabular-nums', impresion ? 'border-b border-texto/30 px-1 py-0.5' : 'border-b border-l border-b-borde/70 border-l-borde/40 px-2 py-1.5')
  const primera = cn('text-left', impresion ? 'border-b border-texto/30 px-1 py-0.5' : 'sticky left-0 border-b border-borde/70 px-3 py-1.5')
  // Pantalla: bloques de color separados por un filo blanco (no grilla), títulos centrados en su celda.
  const cabecera = impresion
    ? 'border-b border-l border-borde px-2 py-1 text-center font-semibold'
    : 'border-b-2 border-l-2 border-fondo px-2 py-1.5 text-center align-middle text-chico leading-tight text-texto'
  const tituloFuerte = !impresion && 'font-bold'
  const tituloSuave = !impresion && 'font-semibold'
  const cabeceraItems = impresion
    ? cn(primera, 'bg-planilla-items font-semibold')
    : 'sticky left-0 z-[3] border-b-2 border-fondo bg-planilla-items px-3 py-1.5 text-center align-middle text-chico font-bold text-texto'
  const fijaIzquierda = !impresion && 'sticky left-3 inline-block'

  const tabla = (
    <table className={cn('w-full tabular-nums', impresion ? 'border-collapse text-mini' : 'table-fixed border-separate border-spacing-0 text-chico')}>
      {!impresion && (
        <colgroup>
          <col className="w-52" />
          {columnas.map((c) => (
            <col key={c.clave} className={anchoColumna(c)} />
          ))}
        </colgroup>
      )}
      {/* Pantalla: encabezado congelado como "Inmovilizar paneles" de Excel. Se fija el thead entero
          (no cada fila): las dos filas de títulos se mueven juntas y no se pisan al scrollear. */}
      <thead className={cn('[display:table-header-group]', !impresion && 'sticky top-0 z-[2]')}>
        <tr>
          <th rowSpan={2} scope="col" className={cabeceraItems}>
            ITEMS
          </th>
          {columnas.map((c, i) =>
            c.grupo ? (
              grupos.includes(c.grupo) && columnas.findIndex((x) => x.grupo === c.grupo) === i ? (
                <th key={c.grupo} colSpan={2} scope="colgroup" className={cn(cabecera, c.tono, tituloFuerte, !impresion && 'whitespace-nowrap')}>
                  {c.grupo}
                </th>
              ) : null
            ) : (
              <th key={c.clave} rowSpan={2} scope="col" className={cn(cabecera, c.tono, tituloFuerte)}>
                {c.titulo}
              </th>
            ),
          )}
        </tr>
        <tr>
          {columnas
            .filter((c) => c.grupo)
            .map((c) => (
              <th key={c.clave} scope="col" className={cn(cabecera, c.tono, tituloSuave)}>
                {c.titulo}
              </th>
            ))}
        </tr>
      </thead>
      {reporte.lineas.map((l) => {
        const { con, sin, todas } = visibles(l)
        const filas = todas ? [...con, ...sin] : con
        return (
          <tbody key={l.linea_id}>
            <tr>
              <th
                colSpan={columnas.length + 1}
                scope="colgroup"
                className={cn('px-3 pt-3 pb-1 text-left text-chico font-semibold tracking-wide underline', impresion ? 'bg-fondo-2' : 'border-b border-borde-2 bg-borde')}
              >
                <span className={cn(fijaIzquierda)}>{l.linea}</span>
              </th>
            </tr>
            {filas.map((p, i) => (
              <tr
                key={p.producto_id}
                className={cn(!impresion && (i % 2 ? 'bg-fondo-3' : 'bg-fondo'), !impresion && 'hover:bg-rojo-tenue-solido', !p.con_movimiento && 'text-texto-3')}
              >
                {/* bg-inherit: la columna fija toma el color de la fila (cebra y resaltado) sin transparentar */}
                <th scope="row" className={cn(primera, 'font-normal', !impresion && 'z-[1] bg-inherit')}>
                  {p.producto}
                </th>
                {columnas.map((c) => (
                  <td key={c.clave} className={cn(celda, c.clave === 'saldo_final' && 'font-semibold', c.clave === 'total_ventas_bs' && 'font-semibold')}>
                    {valor(c, p)}
                  </td>
                ))}
              </tr>
            ))}
            {!impresion && !completo && sin.length > 0 && (
              <tr>
                <td colSpan={columnas.length + 1} className="border-b border-borde/70 px-3 py-1">
                  <button
                    type="button"
                    aria-expanded={abiertas.has(l.linea_id)}
                    onClick={() => alternar(l.linea_id)}
                    className="sticky left-3 inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 text-chico text-texto-3 hover:bg-fondo-3 hover:text-texto active:bg-borde"
                  >
                    <ChevronRight size={14} className={cn('transition-transform duration-200', abiertas.has(l.linea_id) && 'rotate-90')} aria-hidden />
                    Sin movimiento ({sin.length} productos)
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        )
      })}
      <tfoot>
        {pie.map(([etiqueta, contado, credito, total]) => (
          <tr key={etiqueta} className="font-semibold">
            <th scope="row" colSpan={indice('venta_contado_bs') + 1} className={cn('border-t border-borde px-3 py-1.5 text-right', !impresion && 'sticky left-0 bg-fondo')}>
              {etiqueta}
            </th>
            <td className={cn(celda, 'border-t')}>{formatoMonto(contado)}</td>
            <td className={cn(celda, 'border-t')} />
            <td className={cn(celda, 'border-t')}>{formatoMonto(credito)}</td>
            {columnas.slice(indice('venta_credito_bs') + 1, -1).map((c) => (
              <td key={c.clave} className={cn(celda, 'border-t')} />
            ))}
            <td className={cn(celda, 'border-t')}>{formatoMonto(total)}</td>
          </tr>
        ))}
      </tfoot>
    </table>
  )

  if (impresion) return tabla

  return (
    <>
      {/* Con alto máximo propio, la tabla scrollea en los dos ejes y el encabezado queda fijo.
          bg-fondo: con fondo opaco el navegador scrollea en GPU sin repintar la tabla en cada cuadro.
          Mientras scrollea (data-desplazando) la tabla no recibe el puntero: sin hover que repintar. */}
      <div ref={scroller} className="group/matriz scroll-fino hidden max-h-[75vh] overflow-auto bg-fondo md:block">
        <div className="group-data-[desplazando]/matriz:pointer-events-none">{tabla}</div>
      </div>

      {/* Móvil: cada producto es una card con las columnas que tienen valor (regla 25). */}
      <div className="grid gap-3 p-3 md:hidden">
        {reporte.lineas.map((l) => {
          const { con, sin, todas } = visibles(l)
          return (
            <section key={l.linea_id} aria-label={l.linea}>
              <h3 className="mb-2 text-chico font-semibold tracking-wide underline">{l.linea}</h3>
              <ul className="grid gap-2">
                {(todas ? [...con, ...sin] : con).map((p) => (
                  <li key={p.producto_id} className="rounded-control border border-borde bg-fondo-2 p-3">
                    <p className="font-medium">{p.producto}</p>
                    <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-chico tabular-nums">
                      {columnas
                        .filter((c) => p[c.clave])
                        .map((c) => (
                          <Fragment key={c.clave}>
                            <dt className="text-texto-3">{etiquetaLarga(c)}</dt>
                            <dd className="text-right">{valor(c, p)}</dd>
                          </Fragment>
                        ))}
                    </dl>
                  </li>
                ))}
              </ul>
              {!completo && sin.length > 0 && (
                <button type="button" aria-expanded={abiertas.has(l.linea_id)} onClick={() => alternar(l.linea_id)} className="mt-1 inline-flex items-center gap-1 text-chico text-texto-3">
                  <ChevronRight size={14} className={cn('transition-transform duration-200', abiertas.has(l.linea_id) && 'rotate-90')} aria-hidden />
                  Sin movimiento ({sin.length} productos)
                </button>
              )}
            </section>
          )
        })}
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-control border border-borde p-3 text-chico tabular-nums">
          {pie.map(([etiqueta, contado, credito, total]) => (
            <Fragment key={etiqueta}>
              <dt className="font-semibold">{etiqueta}</dt>
              <dd className="text-right">
                {formatoMonto(contado)} · {formatoMonto(credito)} · <b>{formatoMonto(total)}</b>
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </>
  )
}
