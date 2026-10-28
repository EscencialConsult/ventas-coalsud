import { Fragment } from 'react'
import { etiquetaCategoria } from '@/features/clientes/clientes.opciones'
import { formatoMonto } from '@/shared/format/moneda'
import { cn } from '@/shared/ui/cn'
import type { ClienteEecc, EeccConsolidado, GrupoEecc } from '../eecc.service'

const monto = (valor: number | undefined) => (valor ? formatoMonto(valor) : '-')

interface Props {
  eecc: EeccConsolidado
  grupo: GrupoEecc
  alElegir?: (cliente: ClienteEecc) => void
  impresion?: boolean
}

// Un bloque regional × categoría como en F4/F5: los ceros como "-". En
// pantalla, primera columna fija; en móvil, una card por cliente (regla 25).
export function TablaEecc({ eecc, grupo, alElegir, impresion = false }: Props) {
  const celda = cn('px-2 py-1.5 text-right tabular-nums', impresion ? 'border-b border-texto/20 px-1 py-0.5' : 'border-b border-borde/70')
  const primera = cn('px-3 py-1.5 text-left', impresion ? 'border-b border-texto/20 px-1 py-0.5' : 'sticky left-0 z-[1] border-b border-borde/70 bg-fondo')
  const titulo = `${grupo.regional} · ${etiquetaCategoria(grupo.categoria).toUpperCase()}`

  const tabla = (
    <table className={cn('w-full border-collapse tabular-nums', impresion ? 'text-mini' : 'min-w-[900px] text-chico')}>
      <thead>
        <tr className="bg-fondo-3 font-semibold">
          <th scope="col" className={cn(primera, 'bg-fondo-3')}>
            {titulo}
          </th>
          {eecc.columnas.map((c) => (
            <th key={c.clave} scope="col" className="px-2 py-1.5 text-right">
              {c.etiqueta}
            </th>
          ))}
          <th scope="col" className="px-2 py-1.5 text-right">
            TOTAL
          </th>
          <th scope="col" className="px-2 py-1.5 text-right">
            Vencido
          </th>
          <th scope="col" className="px-2 py-1.5 text-right">
            Mora
          </th>
          <th scope="col" className="px-2 py-1.5 text-left">
            Vendedor
          </th>
        </tr>
      </thead>
      <tbody>
        {grupo.clientes.map((c) => (
          <tr key={c.cliente_id} className={cn(alElegir && 'hover:bg-fondo-2')}>
            <th scope="row" className={cn(primera, 'font-normal')}>
              {alElegir ? (
                <button type="button" className="text-left font-medium hover:text-rojo" onClick={() => alElegir(c)}>
                  {c.cliente}
                </button>
              ) : (
                c.cliente
              )}
            </th>
            {eecc.columnas.map((col) => (
              <td key={col.clave} className={celda}>
                {monto(c.saldos[col.clave])}
              </td>
            ))}
            <td className={cn(celda, 'font-semibold')}>{monto(c.total)}</td>
            <td className={cn(celda, c.vencido > 0 && 'text-error')}>{monto(c.vencido)}</td>
            <td className={celda}>{c.max_dias_mora ? `${c.max_dias_mora} d` : '-'}</td>
            <td className={cn(celda, 'text-left')}>{c.vendedor ?? '—'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="font-semibold">
          <th scope="row" className={cn(primera, 'border-t border-borde')}>
            TOTAL
          </th>
          {eecc.columnas.map((col) => (
            <td key={col.clave} className={cn(celda, 'border-t')}>
              {formatoMonto(grupo.subtotal[col.clave] ?? 0)}
            </td>
          ))}
          <td className={cn(celda, 'border-t')}>{formatoMonto(grupo.subtotal.total ?? 0)}</td>
          <td colSpan={3} className={cn(celda, 'border-t')} />
        </tr>
      </tfoot>
    </table>
  )

  if (impresion) return tabla
  return (
    <>
      <div className="scroll-fino hidden overflow-x-auto md:block">{tabla}</div>
      <ul className="grid gap-2 p-3 md:hidden" aria-label={titulo}>
        {grupo.clientes.map((c) => (
          <li key={c.cliente_id}>
            <button type="button" onClick={() => alElegir?.(c)} className="w-full rounded-control border border-borde bg-fondo-2 p-3 text-left active:shadow-hundido">
              <span className="flex justify-between gap-3 font-medium">
                <span className="min-w-0 truncate">{c.cliente}</span>
                <span className="tabular-nums">{formatoMonto(c.total)}</span>
              </span>
              <dl className="mt-1 grid grid-cols-2 gap-x-3 text-chico text-texto-3 tabular-nums">
                {eecc.columnas
                  .filter((col) => c.saldos[col.clave])
                  .map((col) => (
                    <Fragment key={col.clave}>
                      <dt>{col.etiqueta}</dt>
                      <dd className="text-right">{formatoMonto(c.saldos[col.clave])}</dd>
                    </Fragment>
                  ))}
                {c.vencido > 0 && (
                  <>
                    <dt className="text-error">Vencido</dt>
                    <dd className="text-right text-error">
                      {formatoMonto(c.vencido)} · {c.max_dias_mora} d
                    </dd>
                  </>
                )}
              </dl>
            </button>
          </li>
        ))}
        <li className="flex justify-between px-1 text-chico font-semibold tabular-nums">
          <span>TOTAL</span>
          <span>{formatoMonto(grupo.subtotal.total ?? 0)}</span>
        </li>
      </ul>
    </>
  )
}
